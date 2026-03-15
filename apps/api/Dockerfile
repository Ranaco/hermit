# =============================================
# Stage 1: Install dependencies
# =============================================
FROM node:20-bookworm-slim AS deps
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# Copy root workspace files
COPY package.json package-lock.json turbo.json ./

# Copy all workspace package.json files
COPY apps/api/package.json ./apps/api/
COPY apps/hcv_engine/package.json ./apps/hcv_engine/
COPY packages/prisma/package.json ./packages/prisma/
COPY packages/logger/package.json ./packages/logger/
COPY packages/error-handling/package.json ./packages/error-handling/
COPY packages/vault-client/package.json ./packages/vault-client/
COPY packages/config-typescript/package.json ./packages/config-typescript/
COPY packages/config-eslint/package.json ./packages/config-eslint/
COPY packages/jest-presets/package.json ./packages/jest-presets/
COPY packages/ui/package.json ./packages/ui/

RUN npm ci

# =============================================
# Stage 2: Build
# =============================================
FROM deps AS builder
WORKDIR /app

COPY . .

# Generate Prisma client for linux
RUN npx prisma generate --schema=packages/prisma/schema.prisma

# Build the API and its dependencies
RUN npx turbo run build --filter=@hermit/api

# =============================================
# Stage 3: Production runner
# =============================================
FROM node:20-bookworm-slim AS runner
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app

ENV NODE_ENV=production

# Copy built API
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/

# Copy node_modules (includes workspace packages)
COPY --from=builder /app/node_modules ./node_modules

# Copy workspace packages (needed for prisma client and runtime deps)
COPY --from=builder /app/packages/prisma ./packages/prisma
COPY --from=builder /app/packages/logger/dist ./packages/logger/dist
COPY --from=builder /app/packages/logger/package.json ./packages/logger/
COPY --from=builder /app/packages/error-handling/dist ./packages/error-handling/dist
COPY --from=builder /app/packages/error-handling/package.json ./packages/error-handling/
COPY --from=builder /app/packages/vault-client/dist ./packages/vault-client/dist
COPY --from=builder /app/packages/vault-client/package.json ./packages/vault-client/

# Copy root package.json for workspace resolution
COPY --from=builder /app/package.json ./

WORKDIR /app/apps/api

# Symlink node_modules so Prisma client resolution works from API workdir
RUN ln -s /app/node_modules ./node_modules

EXPOSE 5001

CMD ["node", "dist/index.cjs"]
