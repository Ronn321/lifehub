# CONTAINER_DEPLOYMENT_PLAN.md

# LifeHub — Container-Deployment-Plan

Version: 1.0
Status: IN_PROGRESS
Erstellt: 2026-07-02

---

## 1. Ziel

LifeHub wird auf dem Development-PC (Windows) entwickelt und als professionelle Container-Anwendung auf dem UGREEN NAS betrieben. Keine Entwicklung auf dem NAS. Docker Images werden auf dem PC gebaut, auf eine private Registry auf dem NAS gepullt, und per `docker compose` deployed.

## 2. Architektur

```
Development PC (Windows)              UGREEN NAS (Docker)
─────────────────────────              ─────────────────────
│ Git Repo (GitHub)     │              │ Docker Registry    │
│ Docker Build          │────push────▶ │ (private, lokal)   │
│ pnpm monorepo         │              │                    │
│ Lokale Entwicklung    │              │ docker compose pull │
└───────────────────────┘              │ recreate container  │
                                       └────────────────────┘
```

### 2.1 Workflow

1. Entwicklung lokal auf dem PC
2. `git push` zu GitHub
3. GitHub Actions: lint + typecheck + test
4. `docker build` auf dem PC (Multi-Stage)
5. `docker push` zur NAS-Registry (via Tailscale)
6. Auf NAS: `docker compose pull && docker compose up -d`

### 2.2 Versionierung

- Semantic Versioning: `v0.1.0`, `v0.2.0`, `v1.0.0`
- Docker-Tags: `<version>`, `latest`, `stable`, `beta`
- Conventional Commits für Changelogs

### 2.3 Registry

- Private Docker Registry auf dem NAS (Port 5000)
- Erreichbar via Tailscale
- Basic-Auth via htpasswd
- Images: `nas-ip:5000/lifehub-backend:<tag>`, `nas-ip:5000/lifehub-frontend:<tag>`

---

## 3. Umsetzungs-Schritte

### Phase 1: Foundation (sofort)

| # | Aufgabe | Status | Datei |
|---|---------|--------|-------|
| 1 | Plan-Datei erstellen | ✅ DONE | `CONTAINER_DEPLOYMENT_PLAN.md` |
| 2 | `.dockerignore` erstellen | ✅ DONE | `.dockerignore` |
| 3 | Backend-Dockerfile (Multi-Stage) | ✅ DONE | `apps/backend/Dockerfile` |
| 4 | Frontend-Dockerfile (Multi-Stage) | ✅ DONE | `apps/frontend/Dockerfile` |
| 5 | `next.config.mjs` anpassen (standalone) | ✅ DONE | `apps/frontend/next.config.mjs` |
| 6 | Backend-Start-Script (Migration+Start) | ✅ DONE | `apps/backend/scripts/start.sh` |
| 7 | Dev-Compose umbenennen | ✅ DONE | `docker-compose.dev.yml` |
| 8 | Production-Compose erstellen | ✅ DONE | `docker-compose.prod.yml` |
| 9 | Registry-Compose erstellen | ✅ DONE | `infrastructure/registry/docker-compose.yml` |
| 10 | Deploy-Script erstellen | ✅ DONE | `scripts/deploy.sh` + `scripts/deploy.cmd` |

### Phase 2: CI/CD & Automatisierung

| # | Aufgabe | Status | Datei |
|---|---------|--------|-------|
| 11 | GitHub Actions CI | ✅ DONE | `.github/workflows/ci.yml` |
| 12 | Deployment-Doku | ✅ DONE | `docs/DEPLOYMENT.md` |
| 13 | .env.prod.example | ✅ DONE | `.env.prod.example` |
| 14 | Registry-Setup-Script | ✅ DONE | `infrastructure/registry/setup.sh` |

### Phase 3: Auto-Updater (später, Phase 2+)

| # | Aufgabe | Status | Datei |
|---|---------|--------|-------|
| 13 | Update-Check Endpoint | ⬜ TODO | Backend-API |
| 14 | Update-UI | ⬜ TODO | Frontend-Settings |
| 15 | Backup vor Update | ⬜ TODO | `scripts/pre-update-backup.sh` |

---

## 4. Technische Details

### 4.1 Backend-Dockerfile (Multi-Stage)

```dockerfile
# Stage 1: Dependencies
FROM node:20-alpine AS deps
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/backend/package.json ./apps/backend/
COPY shared/*/package.json ./shared/*/
RUN pnpm install --frozen-lockfile --prod=false

# Stage 2: Build
FROM deps AS builder
COPY . .
RUN pnpm --filter @lifehub/backend build
RUN pnpm --filter @lifehub/db build  # shared/db falls vorhanden

# Stage 3: Production
FROM node:20-alpine AS runner
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app
COPY --from=builder /app/apps/backend/dist ./dist
COPY --from=builder /app/apps/backend/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/backend/node_modules ./app_modules
COPY apps/backend/scripts/start.sh ./start.sh
RUN chmod +x ./start.sh
EXPOSE 3007
HEALTHCHECK --interval=30s --timeout=5s CMD wget -q -O- http://localhost:3007/api/v1/health
CMD ["./start.sh"]
```

### 4.2 Frontend-Dockerfile (Multi-Stage)

```dockerfile
# Stage 1: Dependencies
FROM node:20-alpine AS deps
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/frontend/package.json ./apps/frontend/
COPY shared/*/package.json ./shared/*/
RUN pnpm install --frozen-lockfile --prod=false

# Stage 2: Build
FROM deps AS builder
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter @lifehub/frontend build

# Stage 3: Production
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=builder /app/apps/frontend/.next/standalone ./
COPY --from=builder /app/apps/frontend/.next/static ./apps/frontend/.next/static
COPY --from=builder /app/apps/frontend/public ./apps/frontend/public
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s CMD wget -q -O- http://localhost:3001
CMD ["node", "apps/frontend/server.js"]
```

### 4.3 Start-Script (Backend)

```bash
#!/bin/sh
set -e
echo "=== LifeHub Backend Starting ==="
echo "Running database migrations..."
node dist/db/migrate.js || echo "Migration skipped or failed (non-fatal)"
echo "Starting API server..."
exec node dist/main.js
```

### 4.4 Private Registry auf NAS

```yaml
services:
  registry:
    image: registry:2
    container_name: lifehub-registry
    restart: unless-stopped
    ports:
      - "5000:5000"
    volumes:
      - registry-data:/var/lib/registry
      - ./auth:/auth:ro
    environment:
      REGISTRY_AUTH: htpasswd
      REGISTRY_AUTH_HTPASSWD_REALM: "LifeHub Registry"
      REGISTRY_AUTH_HTPASSWD_PATH: /auth/htpasswd
    healthcheck:
      test: ["CMD", "wget", "-q", "-O-", "http://localhost:5000/v2/"]
      interval: 30s
      timeout: 5s
      retries: 3

volumes:
  registry-data:
```

### 4.5 Production-Compose (NAS)

Referenziert Images aus der lokalen Registry. Alle persistenten Daten über Volumes. Container sind vollständig austauschbar.

### 4.6 Deploy-Script (PC)

```bash
#!/bin/bash
set -e
VERSION=${1:-latest}
REGISTRY=${LIFEHUB_REGISTRY:-<nas-ip>:5000}

echo "Building backend:$VERSION..."
docker build -t $REGISTRY/lifehub-backend:$VERSION -f apps/backend/Dockerfile .

echo "Building frontend:$VERSION..."
docker build -t $REGISTRY/lifehub-frontend:$VERSION -f apps/frontend/Dockerfile .

echo "Pushing to $REGISTRY..."
docker push $REGISTRY/lifehub-backend:$VERSION
docker push $REGISTRY/lifehub-frontend:$VERSION

echo "Done. Images pushed as $REGISTRY/lifehub-backend:$VERSION and $REGISTRY/lifehub-frontend:$VERSION"
```

---

## 5. Checkliste Deployment (DoD)

- [ ] `docker build` für Backend und Frontend funktioniert auf dem PC
- [ ] Images sind < 500 MB (Backend), < 300 MB (Frontend)
- [ ] Private Registry auf NAS erreichbar via Tailscale
- [ ] `docker compose up -d` auf NAS startet alle Services
- [ ] `https://lifehub.ts.net` zeigt Login-Seite
- [ ] Admin-Login funktioniert
- [ ] DB-Migration läuft automatisch beim Container-Start
- [ ] Health-Checks aller Services grün
- [ ] Daten bleiben nach `docker compose down && up` erhalten (Volumes)
- [ ] Backup + Restore funktioniert

---

## 6. Fortschritts-Log

| Datum | Aktion | Ergebnis |
|-------|--------|----------|
| 2026-07-02 | Plan erstellt | ✅ |
| 2026-07-02 | Phase 1 + 2 komplett umgesetzt | ✅ Alle Dateien erstellt |
| 2026-07-02 | .gitignore erweitert (Registry-Auth, Runtime-Data, Env-Secrets) | ✅ |
| 2026-07-02 | DOX Pass: AGENTS.md aktualisiert | ✅ |

### Was noch offen ist (manuell durch Robert):

- [ ] GitHub-Repo anlegen (`lifehub` oder `LifeHub`)
- [ ] `git remote add origin git@github.com:<user>/lifehub.git`
- [ ] Erster `git push`
- [ ] Registry auf NAS einrichten: `infrastructure/registry/setup.sh` ausfuehren
- [ ] Docker Desktop: `insecure-registries` konfigurieren
- [ ] `.env` auf NAS erstellen (aus `.env.prod.example`)
- [ ] Erster Build-Test: `./scripts/deploy.sh` auf dem PC
- [ ] Erster Deploy: `docker compose pull && docker compose up -d` auf NAS
