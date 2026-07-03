/**
 * RAG ingestion.
 *
 *   npm run ingest
 *
 * Reads data/sources.json, loads each persona's YouTube captions + any curated
 * text snippets, chunks them, embeds each chunk, and upserts into the
 * `persona_chunks` pgvector table. Idempotent: it clears a persona's existing
 * chunks before re-inserting.
 *
 * Transcripts are cache-first: each fetched transcript is saved to
 * `data/transcripts/<persona>/<videoId>.txt` and reused on later runs. This is
 * important because YouTube caption scraping is unofficial and often blocked on
 * VPS / datacenter IPs — committing the cached .txt files means production can
 * ingest without ever calling YouTube. Set REFRESH_TRANSCRIPTS=1 to force a
 * re-fetch.
 *
 * Prerequisites: DATABASE_URL + OPENROUTER_API_KEY set, and the schema pushed
 * (`npx prisma db push`, which also enables the pgvector extension).
 */
import "dotenv/config"

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs"
import { dirname, join } from "path"
import { randomUUID } from "crypto"
import { YoutubeTranscript } from "youtube-transcript"

import { prisma } from "@/lib/db"
import { embed } from "@/lib/embeddings"
import { isPersonaId, type PersonaId } from "@/lib/personas"

type Sources = Record<
  string,
  { youtube: string[]; text: { ref: string; content: string }[] }
>

// ~1000-char chunks with a little overlap keeps each embedding focused while
// preserving sentence context across boundaries.
function chunk(text: string, size = 1000, overlap = 150): string[] {
  const clean = text.replace(/\s+/g, " ").trim()
  if (clean.length <= size) return clean ? [clean] : []
  const out: string[] = []
  let i = 0
  while (i < clean.length) {
    out.push(clean.slice(i, i + size))
    i += size - overlap
  }
  return out
}

function transcriptPath(personaId: string, videoId: string): string {
  return join(process.cwd(), "data", "transcripts", personaId, `${videoId}.txt`)
}

// Cache-first transcript loader: use the committed .txt backup if present,
// otherwise fetch from YouTube and save it for next time (and for production).
async function loadTranscript(personaId: string, videoId: string): Promise<string> {
  const path = transcriptPath(personaId, videoId)

  if (!process.env.REFRESH_TRANSCRIPTS && existsSync(path)) {
    console.log(`    (using cached transcript for ${videoId})`)
    return readFileSync(path, "utf8")
  }

  console.log(`    (fetching transcript for ${videoId} from YouTube)`)
  const parts = await YoutubeTranscript.fetchTranscript(videoId)
  const text = parts.map((p) => p.text).join(" ")
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, text, "utf8")
  return text
}

async function insertChunk(
  personaId: PersonaId,
  source: string,
  sourceRef: string,
  content: string,
) {
  const vector = await embed(content)
  const literal = `[${vector.join(",")}]`
  await prisma.$executeRawUnsafe(
    `INSERT INTO persona_chunks (id, "personaId", source, "sourceRef", content, embedding, "createdAt")
     VALUES ($1, $2, $3, $4, $5, $6::vector, now())`,
    randomUUID(),
    personaId,
    source,
    sourceRef,
    content,
    literal,
  )
}

async function main() {
  const raw = readFileSync(join(process.cwd(), "data/sources.json"), "utf8")
  const sources = JSON.parse(raw) as Sources

  for (const [personaId, entry] of Object.entries(sources)) {
    if (!isPersonaId(personaId)) continue

    console.log(`\n=== ${personaId} ===`)
    await prisma.$executeRawUnsafe(
      `DELETE FROM persona_chunks WHERE "personaId" = $1`,
      personaId,
    )

    let count = 0

    for (const videoId of entry.youtube ?? []) {
      try {
        const transcript = await loadTranscript(personaId, videoId)
        const chunks = chunk(transcript)
        for (const c of chunks) {
          await insertChunk(personaId, "youtube", videoId, c)
          count++
        }
        console.log(`  ✓ youtube ${videoId} → ${chunks.length} chunks`)
      } catch (err) {
        console.warn(`  ✗ youtube ${videoId} skipped: ${(err as Error).message}`)
      }
    }

    for (const snippet of entry.text ?? []) {
      try {
        for (const c of chunk(snippet.content)) {
          await insertChunk(personaId, "x", snippet.ref, c)
          count++
        }
        console.log(`  ✓ text ${snippet.ref}`)
      } catch (err) {
        console.warn(`  ✗ text ${snippet.ref} skipped: ${(err as Error).message}`)
      }
    }

    console.log(`  → ${count} chunks embedded for ${personaId}`)
  }

  await prisma.$disconnect()
  console.log("\nDone.")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
