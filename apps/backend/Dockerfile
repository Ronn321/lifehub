# ============================================
# LifeHub Backend — Multi-Stage Dockerfile
# Build-Context: Repo-Root (wg. pnpm Workspaces)
# ============================================

# --- Stage 1: Dependencies installieren ---
FROM node:20-alpine AS deps

RUN corepack enable && \
    corepack prepare pnpm@9.15.0 --activate

WORKDIR /app

# Alle package.json-Dateien + .npmrc (shamefully-hoist!) kopieren fuer pnpm
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps/backend/package.json ./apps/backend/

# Alle Shared-Packages
COPY shared/db/package.json ./shared/db/
COPY shared/auth/package.json ./shared/auth/
COPY shared/permissions/package.json ./shared/permissions/
COPY shared/audit/package.json ./shared/audit/
COPY shared/events/package.json ./shared/events/
COPY shared/storage/package.json ./shared/storage/

# Alle 17 Domain-Packages
COPY domains/calendar/package.json ./domains/calendar/
COPY domains/dashboard/package.json ./domains/dashboard/
COPY domains/documents/package.json ./domains/documents/
COPY domains/email/package.json ./domains/email/
COPY domains/finance/package.json ./domains/finance/
COPY domains/insurance/package.json ./domains/insurance/
COPY domains/integrations/package.json ./domains/integrations/
COPY domains/it-inventory/package.json ./domains/it-inventory/
COPY domains/jellyfin/package.json ./domains/jellyfin/
COPY domains/media/package.json ./domains/media/
COPY domains/pages/package.json ./domains/pages/
COPY domains/plugins/package.json ./domains/plugins/
COPY domains/projects/package.json ./domains/projects/
COPY domains/recipes/package.json ./domains/recipes/
COPY domains/search/package.json ./domains/search/
COPY domains/shopping/package.json ./domains/shopping/
COPY domains/travel/package.json ./domains/travel/
COPY domains/users/package.json ./domains/users/
COPY domains/vault/package.json ./domains/vault/

RUN pnpm install --frozen-lockfile --prod=false || pnpm install --prod=false

# --- Stage 2: Build ---
FROM deps AS builder

# Gesamten Source-Code kopieren
COPY . .

# Nest CLI global installieren (unabhaengig von pnpm hoisting)
RUN npm install -g @nestjs/cli@10

# Alle Workspace-Packages bauen (shared + domains), damit Node.js zur Laufzeit
# die dist/index.js findet. Verwendet die tsconfig jedes Packages (NodeNext).
# Alle Workspace-Packages werden NICHT mehr im Image kompiliert:
# tsc segfaultet in der kleinen Docker-VM (WSL2-Limit). Stattdessen werden
# die auf dem HOST gebauten dist/-Ordner via `COPY . .` mitgenommen.
# Host-Build: for pkg in ...; do (cd $pkg && npx tsc --outDir dist --declaration false --skipLibCheck); done
#             + pnpm --filter @lifehub/backend build
RUN echo "skip in-image build — host-built dists are copied via COPY . ."

# Backend bauen (nest build kompiliert auch shared/* und domains/* via tsconfig paths)
WORKDIR /app/apps/backend
RUN echo "skip in-image nest build — apps/backend/dist comes from host build"

# --- Stage 3: Production ---
FROM node:20-alpine AS runner

RUN corepack enable && \
    corepack prepare pnpm@9.15.0 --activate

# curl fuer Healthchecks
RUN apk add --no-cache curl

WORKDIR /app

# Production-Dependencies installieren
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps/backend/package.json ./apps/backend/
COPY shared/db/package.json ./shared/db/
COPY shared/auth/package.json ./shared/auth/
COPY shared/permissions/package.json ./shared/permissions/
COPY shared/audit/package.json ./shared/audit/
COPY shared/events/package.json ./shared/events/
COPY shared/storage/package.json ./shared/storage/

COPY domains/calendar/package.json ./domains/calendar/
COPY domains/dashboard/package.json ./domains/dashboard/
COPY domains/documents/package.json ./domains/documents/
COPY domains/email/package.json ./domains/email/
COPY domains/finance/package.json ./domains/finance/
COPY domains/insurance/package.json ./domains/insurance/
COPY domains/integrations/package.json ./domains/integrations/
COPY domains/it-inventory/package.json ./domains/it-inventory/
COPY domains/jellyfin/package.json ./domains/jellyfin/
COPY domains/media/package.json ./domains/media/
COPY domains/pages/package.json ./domains/pages/
COPY domains/plugins/package.json ./domains/plugins/
COPY domains/projects/package.json ./domains/projects/
COPY domains/recipes/package.json ./domains/recipes/
COPY domains/search/package.json ./domains/search/
COPY domains/shopping/package.json ./domains/shopping/
COPY domains/travel/package.json ./domains/travel/
COPY domains/users/package.json ./domains/users/
COPY domains/vault/package.json ./domains/vault/

RUN pnpm install --frozen-lockfile --prod=true || pnpm install --prod=true

# Kompiliertes Backend aus Builder-Stage
COPY --from=builder /app/apps/backend/dist ./apps/backend/dist

# Kompilierte Shared-Packages (werden vom Backend zur Laufzeit benötigt)
COPY --from=builder /app/shared/db/dist ./shared/db/dist
COPY --from=builder /app/shared/auth/dist ./shared/auth/dist
COPY --from=builder /app/shared/permissions/dist ./shared/permissions/dist
COPY --from=builder /app/shared/audit/dist ./shared/audit/dist
COPY --from=builder /app/shared/events/dist ./shared/events/dist
COPY --from=builder /app/shared/storage/dist ./shared/storage/dist

# Kompilierte Domain-Packages
COPY --from=builder /app/domains/users/dist ./domains/users/dist
COPY --from=builder /app/domains/media/dist ./domains/media/dist
COPY --from=builder /app/domains/dashboard/dist ./domains/dashboard/dist
COPY --from=builder /app/domains/travel/dist ./domains/travel/dist
COPY --from=builder /app/domains/projects/dist ./domains/projects/dist
COPY --from=builder /app/domains/recipes/dist ./domains/recipes/dist
COPY --from=builder /app/domains/shopping/dist ./domains/shopping/dist
COPY --from=builder /app/domains/finance/dist ./domains/finance/dist
COPY --from=builder /app/domains/insurance/dist ./domains/insurance/dist
COPY --from=builder /app/domains/jellyfin/dist ./domains/jellyfin/dist
COPY --from=builder /app/domains/pages/dist ./domains/pages/dist
COPY --from=builder /app/domains/calendar/dist ./domains/calendar/dist
COPY --from=builder /app/domains/documents/dist ./domains/documents/dist
COPY --from=builder /app/domains/email/dist ./domains/email/dist
COPY --from=builder /app/domains/integrations/dist ./domains/integrations/dist
COPY --from=builder /app/domains/it-inventory/dist ./domains/it-inventory/dist
COPY --from=builder /app/domains/plugins/dist ./domains/plugins/dist
COPY --from=builder /app/domains/search/dist ./domains/search/dist
COPY --from=builder /app/domains/vault/dist ./domains/vault/dist

# Migration-Dateien (SQL) und Skripte
COPY --from=builder /app/apps/backend/drizzle ./apps/backend/drizzle
COPY --from=builder /app/apps/backend/scripts ./apps/backend/scripts

# Drizzle config fuer CLI
COPY --from=builder /app/apps/backend/drizzle.config.ts ./apps/backend/drizzle.config.ts

# Migration-Script + Start-Script
COPY apps/backend/scripts/migrate.cjs ./apps/backend/scripts/migrate.cjs
COPY apps/backend/scripts/start.sh ./start.sh
RUN chmod +x ./start.sh

# Port
EXPOSE 3007

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:3007/health || exit 1

# Migration + Start
CMD ["./start.sh"]
