# =============================================
# Stage 1: Install dependencies
# =============================================
FROM node:20-bookworm-slim AS deps
WORKDIR /app

COPY package.json package-lock.json turbo.json ./

COPY apps/docs/package.json ./apps/docs/
COPY apps/web/package.json ./apps/web/
COPY apps/hcv_engine/package.json ./apps/hcv_engine/
COPY packages/ui/package.json ./packages/ui/
COPY packages/prisma/package.json ./packages/prisma/
COPY packages/config-eslint/package.json ./packages/config-eslint/
COPY packages/config-typescript/package.json ./packages/config-typescript/
COPY packages/logger/package.json ./packages/logger/
COPY packages/error-handling/package.json ./packages/error-handling/
COPY packages/vault-client/package.json ./packages/vault-client/
COPY packages/jest-presets/package.json ./packages/jest-presets/

RUN npm ci

# =============================================
# Stage 2: Build
# =============================================
FROM deps AS builder
WORKDIR /app

COPY . .

RUN npx turbo run build --filter=@hermit/docs

# =============================================
# Stage 3: Production runner
# =============================================
FROM node:20-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/apps/docs/.next/standalone ./
COPY --from=builder /app/apps/docs/.next/static ./apps/docs/.next/static

EXPOSE 3000

CMD ["node", "apps/docs/server.js"]
