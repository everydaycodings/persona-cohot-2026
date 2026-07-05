# Persona AI — production image (Next.js 16 + Prisma 7).
# Single full-deps image so it can build, `prisma db push`, run `ingest`, and serve.
FROM node:20-slim

# Prisma needs OpenSSL at generate/build/runtime.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Manifests + Prisma schema first so `postinstall` (prisma generate) works and
# this layer stays cached until dependencies change.
COPY package*.json ./
COPY prisma.config.ts ./prisma.config.ts
COPY prisma ./prisma
# `postinstall` runs `prisma generate`, which loads prisma.config.ts and requires
# DATABASE_URL to *resolve* (it doesn't connect). Supply a throwaway value just for
# this step — the real one is injected at runtime by docker-compose.
RUN DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder" npm ci

# App source + production build.
COPY . .
RUN npm run build

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

# On boot: sync the schema (creates tables + enables the pgvector extension),
# then start the server. Client is already generated during `npm ci`.
CMD ["sh", "-c", "npx prisma db push --skip-generate && npm run start"]
