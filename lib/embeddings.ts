// Text embeddings via OpenRouter's /embeddings endpoint — same key as the chat
// model, so RAG needs no extra provider. Default: openai/text-embedding-3-small
// reduced to 768 dims to match the pgvector column.

const MODEL = process.env.EMBEDDINGS_MODEL || "openai/text-embedding-3-small"

export const EMBEDDING_DIMS = 768

export function embeddingsEnabled() {
  return Boolean(process.env.OPENROUTER_API_KEY)
}

export async function embed(text: string): Promise<number[]> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) throw new Error("OPENROUTER_API_KEY is not set")

  const res = await fetch("https://openrouter.ai/api/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      input: text,
      dimensions: EMBEDDING_DIMS,
    }),
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => "")
    throw new Error(`Embeddings error ${res.status}: ${detail.slice(0, 300)}`)
  }

  const json = await res.json()
  const values = json.data?.[0]?.embedding
  if (!Array.isArray(values)) {
    throw new Error("Embeddings response missing values")
  }
  return values as number[]
}
