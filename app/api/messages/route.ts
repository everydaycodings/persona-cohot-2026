import { prisma } from "@/lib/db"
import { getOrCreateSession } from "@/lib/session"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// Returns the full conversation for the current anonymous session, so the chat
// rehydrates on reload.
export async function GET() {
  const session = await getOrCreateSession()

  const messages = await prisma.message.findMany({
    where: { sessionId: session.id },
    orderBy: { createdAt: "asc" },
    select: { id: true, role: true, personaId: true, content: true, createdAt: true },
  })

  return Response.json({ messages })
}

// Clears the current session's conversation.
export async function DELETE() {
  const session = await getOrCreateSession()
  await prisma.message.deleteMany({ where: { sessionId: session.id } })
  return Response.json({ ok: true })
}
