# CONTAINER_DEPLOYMENT_PLAN.md

# LifeHub — Container-Deployment-Plan

Version: 2.0
Status: DONE
Erstellt: 2026-07-02
Aktualisiert: 2026-07-02

---

## 1. Ziel

LifeHub wird auf dem Development-PC (Windows) entwickelt und als professionelle Container-Anwendung auf dem UGREEN NAS betrieben. Images werden via GitHub Actions auf GitHub Container Registry (ghcr.io) gepusst. Das NAS pulled die Images per `docker compose`.

## 2. Architektur

```
Development PC (Windows)              UGREEN NAS (Docker)
─────────────────────────              ─────────────────────
│ Git Repo (GitHub)     │              │                    │
│ git push              │              │ docker compose pull │
│       │               │              │ docker compose up   │
│       ▼               │              └────────────────────┘
│ GitHub Actions        │                        ▲
│ (build + push)        │                        │
│       │               │                        │
│       ▼               │                        │
│ ghcr.io/ronn321/      │────────────────────────┘
│   lifehub-backend     │
│   lifehub-frontend    │
└───────────────────────┘
```

### 2.1 Workflow

1. Entwicklung lokal auf dem PC
2. `git tag v0.1.0 && git push --tags`
3. GitHub Actions: lint + typecheck + test + Docker Build + Push zu ghcr.io
4. Auf NAS: `docker compose pull && docker compose up -d`

### 2.2 Versionierung

- Semantic Versioning: `v0.1.0`, `v0.2.0`, `v1.0.0`
- Docker-Tags: `<version>`, `latest`
- GitHub Actions triggert bei `v*` Tags automatisch

### 2.3 Registry

- GitHub Container Registry (ghcr.io)
- Images: `ghcr.io/ronn321/lifehub-backend:<tag>`, `ghcr.io/ronn321/lifehub-frontend:<tag>`
- Kein eigener Registry-Server nötig

---

## 3. Umsetzungs-Schritte (alle DONE)

### Phase 1: Foundation

| # | Aufgabe | Status | Datei |
|---|---------|--------|-------|
| 1 | Plan-Datei erstellen | ✅ DONE | `CONTAINER_DEPLOYMENT_PLAN.md` |
| 2 | `.dockerignore` erstellen | ✅ DONE | `.dockerignore` |
| 3 | Backend-Dockerfile (Multi-Stage) | ✅ DONE | `apps/backend/Dockerfile` |
| 4 | Frontend-Dockerfile (Multi-Stage) | ✅ DONE | `apps/frontend/Dockerfile` |
| 5 | `next.config.mjs` anpassen (standalone) | ✅ DONE | `apps/frontend/next.config.mjs` |
| 6 | Backend-Start-Script (Migration+Start) | ✅ DONE | `apps/backend/scripts/start.sh` |
| 7 | Dev-Compose umbenennen | ✅ DONE | `docker-compose.dev.yml` |
| 8 | Production-Compose (GHCR) | ✅ DONE | `docker-compose.prod.yml` |

### Phase 2: CI/CD & Automatisierung

| # | Aufgabe | Status | Datei |
|---|---------|--------|-------|
| 9 | GitHub Actions CI + GHCR Build | ✅ DONE | `.github/workflows/ci.yml` |
| 10 | Deploy-Scripts (GHCR) | ✅ DONE | `scripts/deploy.sh` + `scripts/deploy.cmd` |
| 11 | Deployment-Doku | ✅ DONE | `docs/DEPLOYMENT.md` |
| 12 | .env.prod.example | ✅ DONE | `.env.prod.example` |
| 13 | Setup-Script (Plex-like) | ✅ DONE | `scripts/setup.sh` |

### Phase 3: Auto-Updater (später, Phase 2+)

| # | Aufgabe | Status | Datei |
|---|---------|--------|-------|
| 13 | Update-Check Endpoint | ⬜ TODO | Backend-API |
| 14 | Update-UI | ⬜ TODO | Frontend-Settings |
| 15 | Backup vor Update | ⬜ TODO | `scripts/pre-update-backup.sh` |

---

## 4. Erstellte Dateien

| Datei | Zweck |
|-------|-------|
| `.dockerignore` | Build-Context optimiert |
| `apps/backend/Dockerfile` | Multi-Stage Build (deps → build → prod) |
| `apps/frontend/Dockerfile` | Multi-Stage Build (standalone) |
| `apps/backend/scripts/start.sh` | Auto-Migration + Server-Start |
| `docker-compose.dev.yml` | Lokale Entwicklung (Postgres, Redis, Meilisearch) |
| `docker-compose.prod.yml` | NAS-Production (Traefik, PgBouncer, GHCR-Images) |
| `.github/workflows/ci.yml` | CI + Docker Build bei Tags |
| `scripts/deploy.sh` | Manual Build + Push (Linux/Mac) |
| `scripts/deploy.cmd` | Manual Build + Push (Windows) |
| `.env.prod.example` | Production-Env-Template |
| `docs/DEPLOYMENT.md` | Vollständige Deployment-Anleitung |

---

## 5. Checkliste Deployment (DoD)

- [x] GitHub Repo existiert: https://github.com/Ronn321/lifehub
- [x] CI-Pipeline definiert (GitHub Actions)
- [x] Dockerfiles für Backend und Frontend
- [x] Production docker-compose.prod.yml mit GHCR-Images
- [x] Deploy-Scripts für manuellen Build
- [x] Erster Tag `v0.1.0` → Images auf ghcr.io (via CI)
- [x] `.env` auf NAS konfigurieren (via setup.sh)
- [x] `docker compose pull && up -d` auf NAS testen
- [x] Login-Seite erreichbar

---

## 6. Fortschritts-Log

| Datum | Aktion | Ergebnis |
|-------|--------|----------|
| 2026-07-02 | Plan erstellt | ✅ |
| 2026-07-02 | Phase 1 + 2 komplett umgesetzt | ✅ |
| 2026-07-02 | GitHub Repo angelegt | ✅ github.com/Ronn321/lifehub |
| 2026-07-02 | Auf GHCR umgestellt (statt private Registry) | ✅ Vereinfacht |
| 2026-07-02 | Alle Dateien gepusht | ✅ 3 Commits auf main |
