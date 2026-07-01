# infrastructure/AGENTS.md

# LifeHub — `infrastructure/` Code Root DOX Contract

Version: 1.0
Parent: `../AGENTS.md` (MUSS vorher gelesen werden)

---

## 1. Purpose

Dieser Ordner enthält **Infrastructure-as-Code** und **Konfigurationsdateien** für die Container, Datenbank-Init, Reverse-Proxy, Observability:

- `infrastructure/postgres/` — Init-SQL, Migrations-Wrapper
- `infrastructure/redis/` — Redis-Konfig
- `infrastructure/meilisearch/` — Meilisearch-Konfig (Phase 1+)
- `infrastructure/traefik/` — Reverse-Proxy-Config (Production)
- `infrastructure/observability/` — Loki, Grafana, Promtail (Phase 3+)
- `infrastructure/scripts/` — Helper-Skripte (JWT-Key-Gen, Backup, Migration)
- `infrastructure/lifehub/` — Runtime-Daten (Thumbnails, Vault-Blobs, Backups) — **nicht** committen

## 2. Ownership

`infrastructure/AGENTS.md` regelt:

- Welche Dateien in `infrastructure/` leben (alles, was nicht in `apps/`, `domains/` oder `shared/` gehört)
- Konventionen für Konfigurationsdateien (YAML, SQL, Shell)
- Was in Git **nicht** committed wird (Secrets, Runtime-Daten)

## 3. Local Contracts

### 3.1 Vollständiges Production-Deployment

Das Production-Deployment (`docker-compose.yml` + Tailscale + Traefik + Let's Encrypt + Backup) ist in **`docs/DOCKER_COMPOSE_PRODUCTION.md`** beschrieben. Diese Datei verweist auf die Details; der Inhalt hier ist **nur** für lokale Entwicklung und als Storage-Layer für die Production-Configs.

### 3.2 Dev-Stack

Im Repo-Root: `docker-compose.yml` (Dev-Variante):

- `postgres` (Port 5432)
- `redis` (Port 6379)
- `meilisearch` (Port 7700)
- **kein** Traefik, **kein** Tailscale, **kein** Backup-Service (für Dev überdimensioniert)

Production-Stack liegt in `docs/DOCKER_COMPOSE_PRODUCTION.md`.

### 3.3 Commit-Regeln

| Was | Committen? |
|-----|-----------|
| Init-SQL, Migrations | ✅ ja |
| Traefik-Config, Tailscale-Config | ✅ ja (im `docs/`-Beispiel-Block) |
| `acme.json` | ❌ nein (TLS-Zertifikate) |
| `*.env`, `.env.local` | ❌ nein (in `.gitignore`) |
| `infrastructure/lifehub/thumbnails/`, `vault/`, `tmp/` | ❌ nein (Runtime-Daten) |
| `infrastructure/lifehub/backups/` | ❌ nein (in `.gitignore`) |
| `infrastructure/postgres/backups/` | ❌ nein (in `.gitignore`) |

## 4. Work Guidance

### 4.1 Neue Infrastruktur-Komponente

1. Dev-`docker-compose.yml` ergänzen (Port, Health-Check, Volume)
2. Production-`docs/DOCKER_COMPOSE_PRODUCTION.md` ergänzen
3. `.gitignore` ergänzen falls Runtime-Volumes
4. README/Doku anpassen

### 4.2 Init-SQL ändern

- Init-SQL läuft **nur** beim ersten Start von Postgres (wenn `/var/lib/postgresql/data` leer ist)
- Für Schema-Änderungen nach Init: Drizzle-Migrationen in `apps/backend/drizzle/` statt Init-SQL
- Init-SQL nur für Extensions + Locale + default Privileges

### 4.3 Secrets

- Alle Secrets via `.env` (im Dev) oder externem Secret-Store (Production: Vaultwarden, Doppler, AWS Secrets Manager)
- **Niemals** Secrets in YAML, SQL oder Markdown committen
- Beispiel-Secrets (mit Platzhaltern `***`) in `.env.example` sind OK
- Reale Werte: `.env` (in `.gitignore`)

## 5. Verification

- [ ] `docker compose config` valid (syntactic-check)
- [ ] `docker compose up -d` startet alle Dev-Services
- [ ] Postgres-Healthcheck `pg_isready` grün nach 30s
- [ ] Redis-Healthcheck `PONG` nach 5s
- [ ] Meilisearch-Healthcheck `200 OK` auf `/health`
- [ ] `.env.example` ohne reale Secrets
- [ ] `acme.json` mit `chmod 600` (Production-Skript in `docs/DOCKER_COMPOSE_PRODUCTION.md`)
- [ ] `infrastructure/lifehub/` Runtime-Daten in `.gitignore`

## 6. Child DOX Index

| Pfad | Owns | Wann lesen |
|------|------|------------|
| `postgres/init.sql` | DB-Extensions, Locale | DB-Init-Änderung |
| `postgres/backups/` | pg_dump Ziel | (nicht committen) |
| `lifehub/thumbnails/` | Media-Thumbnails (Runtime) | (nicht committen) |
| `lifehub/vault/` | Vault-verschlüsselte Blobs (Runtime) | (nicht committen) |
| `scripts/` | Helper-Skripte (JWT-Key-Gen etc.) | Dev-Setup-Änderung |

Production-Configs (Traefik, Tailscale, Backup) sind ausgelagert nach `docs/DOCKER_COMPOSE_PRODUCTION.md` — kein Sub-Modul hier nötig.
