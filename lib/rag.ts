import { prisma } from "@/lib/db"
import { embed, embeddingsEnabled } from "@/lib/embeddings"
import type { PersonaId } from "@/lib/personas"

// Retrieves the most relevant verbatim chunks the persona has actually said,
// using pgvector cosine distance (`<=>`). Returns [] gracefully when RAG isn't
// set up (no embeddings key, or the table is empty / missing) so the chat still
// works on style alone.
export async function retrieveContext(
  personaId: PersonaId,
  query: string,
  topK = 4,
): Promise<string[]> {
  if (!embeddingsEnabled()) return []

  try {
    // Skip the embedding call entirely when this persona has no ingested chunks.
    const count = await prisma.personaChunk.count({ where: { personaId } })
    if (count === 0) return []

    const vector = await embed(query)
    const literal = `[${vector.join(",")}]`

    const rows = await prisma.$queryRawUnsafe<{ content: string }[]>(
      `SELECT content
         FROM persona_chunks
        WHERE "personaId" = $1
        ORDER BY embedding <=> $2::vector
        LIMIT $3`,
      personaId,
      literal,
      topK,
    )

    return rows.map((r) => r.content)
  } catch {
    // No table yet, no rows, or DB unavailable — degrade to style-only.
    return []
  }
}

// Formats retrieved chunks into a grounding block for the system context.
export function formatContext(chunks: string[]): string | null {
  if (chunks.length === 0) return null
  const body = chunks.map((c, i) => `[${i + 1}] ${c.trim()}`).join("\n\n")
  return `Here are things you (the real person) have actually said in your videos/posts. Use them to ground your answer's substance and examples, but keep your own natural speaking style. Do not quote them mechanically:\n\n${body}`
}
