import { randomUUID } from "crypto"
import { cookies } from "next/headers"

import { prisma } from "@/lib/db"

const COOKIE_NAME = "persona_sid"
const ONE_YEAR = 60 * 60 * 24 * 365

// Resolve the current anonymous visitor to a Session row, creating one (and the
// cookie) on first visit. No login — the httpOnly cookie is the only identity.
export async function getOrCreateSession() {
  const jar = await cookies()
  const existing = jar.get(COOKIE_NAME)?.value

  if (existing) {
    const session = await prisma.session.findUnique({
      where: { cookieId: existing },
    })
    if (session) return session
  }

  const cookieId = randomUUID()
  const session = await prisma.session.create({ data: { cookieId } })

  jar.set(COOKIE_NAME, cookieId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ONE_YEAR,
  })

  return session
}
