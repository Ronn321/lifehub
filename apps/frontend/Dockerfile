# ============================================
# LifeHub Frontend — Multi-Stage Dockerfile
# Build-Context: Repo-Root (wg. pnpm Workspaces)
# ============================================

# --- Stage 1: Dependencies installieren ---
FROM node:20-alpine AS deps

RUN corepack enable && \
    corepack prepare pnpm@9.15.0 --activate

WORKDIR /app

# Nur Package-Files kopieren fuer besseres Caching
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/frontend/package.json ./apps/frontend/

# Shared-Packages (falls Frontend sie braucht)
COPY shared/db/package.json ./shared/db/ 2>/dev/null || true
COPY shared/auth/package.json ./shared/auth/ 2>/dev/null || true
COPY shared/permissions/package.json ./shared/permissions/ 2>/dev/null || true
COPY shared/audit/package.json ./shared/audit/ 2>/dev/null || true
COPY shared/events/package.json ./shared/events/ 2>/dev/null || true
COPY shared/storage/package.json ./shared/storage/ 2>/dev/null || true

RUN pnpm install --frozen-lockfile --prod=false 2>/dev/null || pnpm install --prod=false

# --- Stage 2: Build ---
FROM deps AS builder

# Gesamten Source-Code kopieren
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

WORKDIR /app/apps/frontend
RUN pnpm run build

# --- Stage 3: Production ---
FROM node:20-alpine AS runner

# curl fuer Healthchecks
RUN apk add --no-cache curl

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Next.js standalone Output (server.js + node_modules)
COPY --from=builder /app/apps/frontend/.next/standalone ./
# Statische Assets
COPY --from=builder /app/apps/frontend/.next/static ./apps/frontend/.next/static
# Public-Assets
COPY --from=builder /app/apps/frontend/public ./apps/frontend/public

# Port
EXPOSE 3001

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3001 || exit 1

# Next.js standalone startet mit server.js
CMD ["node", "apps/frontend/server.js"]
