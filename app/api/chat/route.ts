import { prisma } from "@/lib/db"
import { streamChat, type ChatMessage } from "@/lib/openrouter"
import { getPersona, isPersonaId } from "@/lib/personas"
import { formatContext, retrieveContext } from "@/lib/rag"
import { checkAndConsume } from "@/lib/ratelimit"
import { getOrCreateSession } from "@/lib/session"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// How many recent turns to send to the model. Full history lives in the DB;
// we window it to control tokens and keep the persona salient.
const HISTORY_WINDOW = 20

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  const message: unknown = body?.message
  const personaId: unknown = body?.personaId

  if (typeof message !== "string" || !message.trim()) {
    return Response.json({ error: "Message is required." }, { status: 400 })
  }
  if (typeof personaId !== "string" || !isPersonaId(personaId)) {
    return Response.json({ error: "Unknown persona." }, { status: 400 })
  }

  const persona = getPersona(personaId)
  const session = await getOrCreateSession()

  const rate = await checkAndConsume(session.id)
  if (!rate.allowed) {
    const line =
      personaId === "hitesh"
        ? "Haanji! Aaj ke liye itni baatein kaafi hain, chai ka break le lete hain ☕. Kal phir aana, main yahin hoon."
        : "That's the daily limit for now — let's pick this up tomorrow. Go build something with what we covered! 🚀"
    return Response.json({ error: line, rateLimited: true }, { status: 429 })
  }

  // Persist the incoming user turn.
  await prisma.message.create({
    data: { sessionId: session.id, role: "user", personaId, content: message },
  })

  // Windowed history (includes the message we just stored as the final turn).
  const history = await prisma.message.findMany({
    where: { sessionId: session.id },
    orderBy: { createdAt: "desc" },
    take: HISTORY_WINDOW,
  })
  history.reverse()

  // RAG: ground the answer in things the persona actually said.
  const context = formatContext(await retrieveContext(persona.id, message))

  const systemContent = context
    ? `${persona.systemPrompt}\n\n${context}`
    : persona.systemPrompt

  const messages: ChatMessage[] = [
    { role: "system", content: systemContent },
    ...persona.fewShot.map((t) => ({ role: t.role, content: t.content })),
    ...history.map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.content,
    })),
  ] as ChatMessage[]

  const encoder = new TextEncoder()
  let full = ""

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const delta of streamChat(messages)) {
          full += delta
          controller.enqueue(encoder.encode(delta))
        }
      } catch (err) {
        const note =
          "\n\n_(arey, thodi technical dikkat aa gayi — ek baar phir try karo.)_"
        controller.enqueue(encoder.encode(note))
        console.error("stream error:", err)
      } finally {
        controller.close()
        // Persist the assistant turn once the stream completes.
        if (full.trim()) {
          await prisma.message.create({
            data: {
              sessionId: session.id,
              role: "assistant",
              personaId,
              content: full,
            },
          })
        }
      }
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-RateLimit-Remaining": String(rate.remaining),
    },
  })
}
