# ==========================================
# Multi-stage Dockerfile for qrshop_server (Elysia + Bun + Prisma)
# ==========================================

# 1. Base image with Bun
FROM oven/bun:1 AS base
WORKDIR /app

# 2. Dependencies installation (Cache layer)
FROM base AS deps
COPY package.json bun.lock ./
COPY prisma ./prisma/
RUN bun install --frozen-lockfile

# 3. Builder: Generate Prisma client & prepare source
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN bunx prisma generate

# 4. Production Runner
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copy built node_modules, generated Prisma client, and application source
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/src ./src
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/tsconfig.json ./tsconfig.json

# Render will provide the PORT environment variable (defaults to 8008 if not provided)
EXPOSE 8008

# Run Elysia server
CMD ["bun", "run", "src/index.ts"]
