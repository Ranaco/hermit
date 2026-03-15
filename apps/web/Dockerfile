# =============================================
# Stage 1: Install dependencies
# =============================================
FROM node:20-bookworm-slim AS deps
WORKDIR /app

# Copy root workspace files
COPY package.json package-lock.json turbo.json ./

# Copy all workspace package.json files
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

# API URL baked into client-side JS at build time
ARG NEXT_PUBLIC_API_URL=https://hermit.ranax.co/api/v1
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

COPY . .

# Build the web app (output: standalone)
RUN npx turbo run build --filter=@hermit/web

# =============================================
# Stage 3: Production runner
# =============================================
FROM node:20-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copy standalone output
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public

EXPOSE 3000

CMD ["node", "apps/web/server.js"]
