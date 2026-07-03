import { prisma } from "@/lib/db"

const DAILY_LIMIT = Number(process.env.DAILY_MESSAGE_LIMIT ?? 40)

function today() {
  return new Date().toISOString().slice(0, 10) // yyyy-mm-dd
}

export type RateResult = {
  allowed: boolean
  remaining: number
  limit: number
}

// DB-backed per-session daily cap. Works on serverless (no in-memory state):
// the counter lives on the Session row and resets when the date bucket rolls over.
export async function checkAndConsume(sessionId: string): Promise<RateResult> {
  const day = today()
  const session = await prisma.session.findUnique({ where: { id: sessionId } })

  if (!session) {
    return { allowed: false, remaining: 0, limit: DAILY_LIMIT }
  }

  // New day → reset the bucket.
  const count = session.requestDate === day ? session.requestCount : 0

  if (count >= DAILY_LIMIT) {
    return { allowed: false, remaining: 0, limit: DAILY_LIMIT }
  }

  await prisma.session.update({
    where: { id: sessionId },
    data: { requestDate: day, requestCount: count + 1 },
  })

  return { allowed: true, remaining: DAILY_LIMIT - (count + 1), limit: DAILY_LIMIT }
}
