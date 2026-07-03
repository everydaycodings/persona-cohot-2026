// Minimal streaming client for the OpenRouter chat completions API.
// No SDK — just fetch + a small SSE parser that yields text deltas.

export type ChatMessage = {
  role: "system" | "user" | "assistant"
  content: string
}

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
const DEFAULT_MODEL = "openai/gpt-4o-mini"

// Streams assistant text token-by-token from OpenRouter.
export async function* streamChat(
  messages: ChatMessage[],
): AsyncGenerator<string> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not set")
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"

  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      // Optional attribution headers for OpenRouter dashboards.
      "HTTP-Referer": siteUrl,
      "X-Title": "Persona AI",
    },
    body: JSON.stringify({
      model: process.env.OPENROUTER_MODEL || DEFAULT_MODEL,
      messages,
      stream: true,
      temperature: 0.8,
    }),
  })

  if (!res.ok || !res.body) {
    const detail = await res.text().catch(() => "")
    throw new Error(`OpenRouter error ${res.status}: ${detail.slice(0, 500)}`)
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    // SSE frames are separated by newlines; each data line is a JSON chunk.
    const lines = buffer.split("\n")
    buffer = lines.pop() ?? ""

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed.startsWith("data:")) continue
      const data = trimmed.slice(5).trim()
      if (data === "" || data === "[DONE]") continue

      try {
        const json = JSON.parse(data)
        const delta = json.choices?.[0]?.delta?.content
        if (delta) yield delta as string
      } catch {
        // Ignore keep-alive/comment frames that aren't valid JSON.
      }
    }
  }
}
