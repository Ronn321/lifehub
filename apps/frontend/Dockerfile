# ============================================
# LifeHub Frontend — Multi-Stage Dockerfile
# Build-Context: Repo-Root (wg. pnpm Workspaces)
# ============================================

# --- Stage 1: Dependencies installieren ---
FROM node:20-alpine AS deps

RUN corepack enable && \
    corepack prepare pnpm@9.15.0 --activate

WORKDIR /app

# Alle package.json-Dateien + .npmrc kopieren fuer pnpm
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps/frontend/package.json ./apps/frontend/

# Alle Shared-Packages (werden ggf. fuer Build benoetigt)
COPY shared/db/package.json ./shared/db/
COPY shared/auth/package.json ./shared/auth/
COPY shared/permissions/package.json ./shared/permissions/
COPY shared/audit/package.json ./shared/audit/
COPY shared/events/package.json ./shared/events/
COPY shared/storage/package.json ./shared/storage/

RUN pnpm install --frozen-lockfile --prod=false || pnpm install --prod=false

# --- Stage 2: Build ---
FROM deps AS builder

# Gesamten Source-Code kopieren
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

# lokalen next-Binary nutzen (pnpm root node_modules/.bin)
ENV PATH="/app/node_modules/.bin:$PATH"

WORKDIR /app/apps/frontend
RUN mkdir -p public
RUN next build

# --- Stage 3: Production ---
FROM node:20-alpine AS runner

RUN apk add --no-cache curl

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Next.js standalone Output (server.js + node_modules)
COPY --from=builder /app/apps/frontend/.next/standalone ./

# Statische Assets
COPY --from=builder /app/apps/frontend/.next/static ./apps/frontend/.next/static

# Public-Assets (falls vorhanden)
RUN mkdir -p ./apps/frontend/public
COPY --from=builder /app/apps/frontend/public/ ./apps/frontend/public/

# Port
EXPOSE 3001

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:3001 || exit 1

# Next.js standalone startet mit server.js
CMD ["node", "apps/frontend/server.js"]
