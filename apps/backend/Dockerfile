# ============================================
# LifeHub Backend — Multi-Stage Dockerfile
# Build-Context: Repo-Root (wg. pnpm Workspaces)
# ============================================

# --- Stage 1: Dependencies installieren ---
FROM node:20-alpine AS deps

RUN corepack enable && \
    corepack prepare pnpm@9.15.0 --activate

WORKDIR /app

# Nur Package-Files kopieren fuer besseres Caching
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/backend/package.json ./apps/backend/
COPY shared/db/package.json ./shared/db/
COPY shared/auth/package.json ./shared/auth/
COPY shared/permissions/package.json ./shared/permissions/
COPY shared/audit/package.json ./shared/audit/
COPY shared/events/package.json ./shared/events/
COPY shared/storage/package.json ./shared/storage/

# Domain-Package-Files
COPY domains/users/package.json ./domains/users/ 2>/dev/null || true
COPY domains/media/package.json ./domains/media/ 2>/dev/null || true
COPY domains/dashboard/package.json ./domains/dashboard/ 2>/dev/null || true
COPY domains/travel/package.json ./domains/travel/ 2>/dev/null || true
COPY domains/projects/package.json ./domains/projects/ 2>/dev/null || true
COPY domains/recipes/package.json ./domains/recipes/ 2>/dev/null || true
COPY domains/shopping/package.json ./domains/shopping/ 2>/dev/null || true
COPY domains/finance/package.json ./domains/finance/ 2>/dev/null || true
COPY domains/jellyfin/package.json ./domains/jellyfin/ 2>/dev/null || true
COPY domains/pages/package.json ./domains/pages/ 2>/dev/null || true

RUN pnpm install --frozen-lockfile --prod=false 2>/dev/null || pnpm install --prod=false

# --- Stage 2: Build ---
FROM deps AS builder

# Gesamten Source-Code kopieren
COPY . .

# Shared-Packages bauen (falls eigene Build-Scripts existieren)
# Shared-Packages haben keine Build-Scripts, werden direkt aus src kompiliert

# Backend bauen (nest build kompiliert auch shared/* und domains/* via paths)
WORKDIR /app/apps/backend
RUN npx nest build

# Migration-Dateien sind SQL-Dateien, werden nicht kompiliert
# Drizzle-Config wird fuer das CLI benoetigt

# --- Stage 3: Production ---
FROM node:20-alpine AS runner

RUN corepack enable && \
    corepack prepare pnpm@9.15.0 --activate

# curl fuer Healthchecks
RUN apk add --no-cache curl

WORKDIR /app

# Production-Dependencies separat installieren
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/backend/package.json ./apps/backend/
COPY shared/db/package.json ./shared/db/
COPY shared/auth/package.json ./shared/auth/
COPY shared/permissions/package.json ./shared/permissions/
COPY shared/audit/package.json ./shared/audit/
COPY shared/events/package.json ./shared/events/
COPY shared/storage/package.json ./shared/storage/

COPY domains/users/package.json ./domains/users/ 2>/dev/null || true
COPY domains/media/package.json ./domains/media/ 2>/dev/null || true
COPY domains/dashboard/package.json ./domains/dashboard/ 2>/dev/null || true
COPY domains/travel/package.json ./domains/travel/ 2>/dev/null || true
COPY domains/projects/package.json ./domains/projects/ 2>/dev/null || true
COPY domains/recipes/package.json ./domains/recipes/ 2>/dev/null || true
COPY domains/shopping/package.json ./domains/shopping/ 2>/dev/null || true
COPY domains/finance/package.json ./domains/finance/ 2>/dev/null || true
COPY domains/jellyfin/package.json ./domains/jellyfin/ 2>/dev/null || true
COPY domains/pages/package.json ./domains/pages/ 2>/dev/null || true

RUN pnpm install --frozen-lockfile --prod=true 2>/dev/null || pnpm install --prod=true

# Kompiliertes Backend aus Builder-Stage
COPY --from=builder /app/apps/backend/dist ./apps/backend/dist

# Migration-Dateien (SQL) und Skripte
COPY --from=builder /app/apps/backend/drizzle ./apps/backend/drizzle
COPY --from=builder /app/apps/backend/scripts ./apps/backend/scripts

# tsx fuer Migrations-Skript (ESM)
RUN pnpm add -g tsx

# Start-Script
COPY apps/backend/scripts/start.sh ./start.sh
RUN chmod +x ./start.sh

# Port
EXPOSE 3007

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3007/api/v1/health || exit 1

# Migration + Start
CMD ["./start.sh"]
