# DOCKER_COMPOSE_PRODUCTION.md

Version: 1.0
Vollständige NAS-Deployment-Umgebung für LifeHub.

> **Hinweis zu ChatGPT-Original:** Die nachfolgende Konfiguration übernimmt die Grundstruktur aus dem ChatGPT-Vorschlag und ergänzt sie um alle in `ARCHITECTURE.md`, `DATABASE_SCHEMA.md` und `TECH_STACK.md` verbindlich festgelegten Komponenten: Tailscale-Sidecar, PgBouncer-Connection-Pooling, Meilisearch, BullMQ-Worker, AES-256-Vault-Storage, separates Frontend/Backend-Image, Traefik-Security-Middleware, Let's Encrypt TLS, Health-Checks und Backup-Service mit `restic` + S3-Offsite.

---

## 1. Voraussetzungen

### 1.1 NAS

- Docker Engine ≥ 24, Docker Compose V2
- ≥ 4 GB RAM (8 GB empfohlen)
- ≥ 20 GB freier Speicher für Container
- Tailscale-Account (kostenlos)

### 1.2 Mount-Pfade auf dem NAS

| Container | Host (Synology-Beispiel) | Modus |
|-----------|--------------------------|-------|
| `/mnt/media/photos` | `/volume1/photo` | rw |
| `/mnt/media/videos` | `/volume1/video` | rw |
| `/mnt/media/thumbnails` | `<project>/infrastructure/lifehub/thumbnails` | rw |
| `/mnt/documents` | `/volume1/documents` | rw |
| `/mnt/projects` | `/volume1/projects` | rw |
| `/mnt/vault-blobs` | `<project>/infrastructure/lifehub/vault` | rw |
| `/mnt/tmp` | `<project>/infrastructure/lifehub/tmp` | rw |

### 1.3 `.env`-Datei (`chmod 600`)

```bash
TAILSCALE_TAILNET=your-tailnet.ts.net
LIFEHUB_HOST=lifehub.your-tailnet.ts.net
ACME_EMAIL=admin@example.com

JWT_PRIVATE_KEY_BASE64=<base64 RSA private>
JWT_PUBLIC_KEY_BASE64=<base64 RSA public>

POSTGRES_USER=lifehub
POSTGRES_PASSWORD=<random 32+>
POSTGRES_DB=lifehub
DATABASE_URL=postgresql://lifehub:${POSTGRES_PASSWORD}@pgbouncer:5432/lifehub

REDIS_PASSWORD=<random 32+>
REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379

MEILI_MASTER_KEY=<random 32+>

TS_AUTHKEY=tskey-auth-...

TZ=Europe/Berlin
NODE_ENV=production
LOG_LEVEL=info

# Optional: Offsite-Backup
BACKUP_S3_ENDPOINT=
BACKUP_S3_BUCKET=
BACKUP_S3_ACCESS_KEY=
BACKUP_S3_SECRET_KEY=
BACKUP_S3_REGION=

# Optional: Observability (Phase 3+)
GRAFANA_ADMIN_PASSWORD=<random>
```

---

## 2. `docker-compose.yml`

```yaml
name: lifehub

x-logging: &default-logging
  driver: json-file
  options: { max-size: "10m", max-file: "3" }

services:

  # ============ VPN ============
  tailscale:
    image: tailscale/tailscale:latest
    container_name: lifehub-tailscale
    restart: unless-stopped
    hostname: lifehub
    environment:
      - TS_AUTHKEY=${TS_AUTHKEY}
      - TS_STATE_DIR=/var/lib/tailscale
      - TS_USERSPACE=false
      - TS_EXTRA_ARGS=--advertise-tags=tag:lifehub
    volumes:
      - tailscale-state:/var/lib/tailscale
      - /dev/net/tun:/dev/net/tun
    cap_add: [net_admin, sys_module]
    networks: [lifehub]
    healthcheck:
      test: ["CMD", "tailscale", "status"]
      interval: 30s
      timeout: 10s
      retries: 5
    logging: *default-logging

  # ============ Reverse Proxy ============
  traefik:
    image: traefik:v3.1
    container_name: lifehub-traefik
    restart: unless-stopped
    command:
      - "--providers.docker=true"
      - "--providers.docker.exposedbydefault=false"
      - "--providers.file.directory=/etc/traefik/dynamic"
      - "--entrypoints.web.address=:80"
      - "--entrypoints.websecure.address=:443"
      - "--entrypoints.websecure.http.tls=true"
      - "--certificatesresolvers.letsencrypt.acme.tlschallenge=true"
      - "--certificatesresolvers.letsencrypt.acme.email=${ACME_EMAIL}"
      - "--certificatesresolvers.letsencrypt.acme.storage=/etc/traefik/acme.json"
      - "--log.level=INFO"
    ports: ["443:443", "80:80"]
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - ./infrastructure/traefik:/etc/traefik
      - traefik-acme:/etc/traefik/acme.json
    depends_on:
      tailscale: { condition: service_healthy }
    networks: [lifehub]
    logging: *default-logging

  # ============ Datenbank ============
  postgres:
    image: postgres:16-alpine
    container_name: lifehub-postgres
    restart: unless-stopped
    environment:
      - POSTGRES_USER=${POSTGRES_USER}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
      - POSTGRES_DB=${POSTGRES_DB}
      - TZ=${TZ}
    volumes:
      - postgres-data:/var/lib/postgresql/data
      - ./infrastructure/postgres/init.sql:/docker-entrypoint-initdb.d/00-init.sql:ro
    command:
      - "postgres"
      - "-c"
      - "shared_buffers=256MB"
      - "-c"
      - "effective_cache_size=1GB"
      - "-c"
      - "work_mem=64MB"
      - "-c"
      - "log_min_duration_statement=500"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks: [lifehub]
    logging: *default-logging

  pgbouncer:
    image: bitnami/pgbouncer:1.22
    container_name: lifehub-pgbouncer
    restart: unless-stopped
    environment:
      - PGBOUNCER_DATABASES=lifehub=postgres:5432
      - PGBOUNCER_AUTH_TYPE=scram-sha-256
      - PGBOUNCER_POOL_MODE=transaction
      - PGBOUNCER_MAX_CLIENT_CONN=200
      - PGBOUNCER_DEFAULT_POOL_SIZE=20
      - POSTGRESQL_PASSWORD=${POSTGRES_PASSWORD}
    depends_on:
      postgres: { condition: service_healthy }
    networks: [lifehub]
    logging: *default-logging

  # ============ Cache & Queues ============
  redis:
    image: redis:7-alpine
    container_name: lifehub-redis
    restart: unless-stopped
    command:
      - "redis-server"
      - "--requirepass"
      - "${REDIS_PASSWORD}"
      - "--maxmemory"
      - "256mb"
      - "--maxmemory-policy"
      - "allkeys-lru"
      - "--appendonly"
      - "yes"
    volumes:
      - redis-data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "${REDIS_PASSWORD}", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5
    networks: [lifehub]
    logging: *default-logging

  # ============ Suche ============
  meilisearch:
    image: getmeili/meilisearch:v1.8
    container_name: lifehub-meilisearch
    restart: unless-stopped
    environment:
      - MEILI_MASTER_KEY=${MEILI_MASTER_KEY}
      - MEILI_NO_ANALYTICS=true
      - MEILI_ENV=production
    volumes:
      - meili-data:/meili_data
    networks: [lifehub]
    logging: *default-logging

  # ============ Backend ============
  backend:
    image: ghcr.io/<user>/lifehub-backend:latest
    container_name: lifehub-backend
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
      - MEILI_URL=http://meilisearch:7700
      - MEILI_MASTER_KEY=${MEILI_MASTER_KEY}
      - JWT_PRIVATE_KEY_BASE64=${JWT_PRIVATE_KEY_BASE64}
      - JWT_PUBLIC_KEY_BASE64=${JWT_PUBLIC_KEY_BASE64}
      - TZ=${TZ}
      - LOG_LEVEL=${LOG_LEVEL}
    volumes:
      - /volume1/photo:/mnt/media/photos:rw
      - /volume1/video:/mnt/media/videos:rw
      - ./infrastructure/lifehub/thumbnails:/mnt/media/thumbnails:rw
      - /volume1/documents:/mnt/documents:rw
      - /volume1/projects:/mnt/projects:rw
      - ./infrastructure/lifehub/vault:/mnt/vault-blobs:rw
      - ./infrastructure/lifehub/tmp:/mnt/tmp:rw
    depends_on:
      postgres:   { condition: service_healthy }
      redis:      { condition: service_healthy }
      meilisearch:{ condition: service_started }
    networks: [lifehub]
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.lifehub-api.rule=Host(`${LIFEHUB_HOST}`) && PathPrefix(`/api`)"
      - "traefik.http.routers.lifehub-api.tls=true"
      - "traefik.http.routers.lifehub-api.tls.certresolver=letsencrypt"
      - "traefik.http.routers.lifehub-api.middlewares=security-headers,rate-limit,compress"
      - "traefik.http.services.lifehub-api.loadbalancer.server.port=3001"
    logging: *default-logging

  worker:
    image: ghcr.io/<user>/lifehub-backend:latest
    container_name: lifehub-worker
    restart: unless-stopped
    command: ["node", "dist/worker.js"]
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
      - MEILI_URL=http://meilisearch:7700
      - MEILI_MASTER_KEY=${MEILI_MASTER_KEY}
      - TZ=${TZ}
    volumes:
      - /volume1/photo:/mnt/media/photos:rw
      - /volume1/video:/mnt/media/videos:rw
      - ./infrastructure/lifehub/thumbnails:/mnt/media/thumbnails:rw
      - /volume1/documents:/mnt/documents:rw
      - /volume1/projects:/mnt/projects:rw
      - ./infrastructure/lifehub/vault:/mnt/vault-blobs:rw
      - ./infrastructure/lifehub/tmp:/mnt/tmp:rw
    depends_on:
      backend: { condition: service_started }
    networks: [lifehub]
    logging: *default-logging

  # ============ Frontend ============
  frontend:
    image: ghcr.io/<user>/lifehub-frontend:latest
    container_name: lifehub-frontend
    restart: unless-stopped
    environment:
      - NEXT_PUBLIC_API_BASE=https://${LIFEHUB_HOST}/api
      - NEXT_PUBLIC_BRAND_NAME=LifeHub
      - TZ=${TZ}
    networks: [lifehub]
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.lifehub-web.rule=Host(`${LIFEHUB_HOST}`)"
      - "traefik.http.routers.lifehub-web.tls=true"
      - "traefik.http.routers.lifehub-web.tls.certresolver=letsencrypt"
      - "traefik.http.routers.lifehub-web.middlewares=security-headers,compress"
      - "traefik.http.services.lifehub-web.loadbalancer.server.port=3001"
    logging: *default-logging

  # ============ Backup ============
  backup:
    image: ghcr.io/<user>/lifehub-backup:latest
    container_name: lifehub-backup
    restart: unless-stopped
    environment:
      - POSTGRES_HOST=postgres
      - POSTGRES_USER=${POSTGRES_USER}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
      - POSTGRES_DB=${POSTGRES_DB}
      - BACKUP_S3_ENDPOINT=${BACKUP_S3_ENDPOINT}
      - BACKUP_S3_BUCKET=${BACKUP_S3_BUCKET}
      - BACKUP_S3_ACCESS_KEY=${BACKUP_S3_ACCESS_KEY}
      - BACKUP_S3_SECRET_KEY=${BACKUP_S3_SECRET_KEY}
      - BACKUP_S3_REGION=${BACKUP_S3_REGION}
      - TZ=${TZ}
    volumes:
      - /volume1/photo:/backup/media/photos:ro
      - /volume1/video:/backup/media/videos:ro
      - /volume1/documents:/backup/documents:ro
      - /volume1/projects:/backup/projects:ro
      - ./infrastructure/lifehub/vault:/backup/vault:ro
      - backup-cache:/var/cache/lifehub-backup
    networks: [lifehub]
    logging: *default-logging

  # ============ Optional: Media Processing (Profile) ============
  ffmpeg-worker:
    image: jrottenberg/ffmpeg:latest
    container_name: lifehub-ffmpeg
    restart: unless-stopped
    profiles: ["media"]
    entrypoint: ["sleep", "infinity"]
    networks: [lifehub]
    logging: *default-logging

  # ============ Optional: OCR (Profile) ============
  ocr:
    image: tesseractshadow/tesseract4re
    container_name: lifehub-ocr
    restart: unless-stopped
    profiles: ["ocr"]
    entrypoint: ["sleep", "infinity"]
    networks: [lifehub]
    logging: *default-logging

  # ============ Optional: Jellyfin ============
  jellyfin:
    image: jellyfin/jellyfin:latest
    container_name: lifehub-jellyfin
    restart: unless-stopped
    profiles: ["jellyfin"]
    volumes:
      - /volume1/video:/media:ro
      - jellyfin-config:/config
    ports: ["8096:8096"]
    networks: [lifehub]
    logging: *default-logging

  # ============ Optional: Observability (Profile) ============
  loki:
    image: grafana/loki:2.9
    container_name: lifehub-loki
    restart: unless-stopped
    profiles: ["observability"]
    command: -config.file=/etc/loki/loki.yml
    volumes:
      - ./infrastructure/observability/loki.yml:/etc/loki/loki.yml:ro
      - loki-data:/loki
    networks: [lifehub]
    logging: *default-logging

  grafana:
    image: grafana/grafana:10.4
    container_name: lifehub-grafana
    restart: unless-stopped
    profiles: ["observability"]
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_ADMIN_PASSWORD}
      - GF_USERS_ALLOW_SIGN_UP=false
    volumes:
      - grafana-data:/var/lib/grafana
      - ./infrastructure/observability/grafana-provisioning:/etc/grafana/provisioning:ro
    networks: [lifehub]
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.lifehub-grafana.rule=Host(`grafana.${TAILSCALE_TAILNET}`)"
      - "traefik.http.routers.lifehub-grafana.tls=true"
      - "traefik.http.routers.lifehub-grafana.tls.certresolver=letsencrypt"
    logging: *default-logging

networks:
  lifehub: { driver: bridge }

volumes:
  tailscale-state:
  traefik-acme:
  postgres-data:
  redis-data:
  meili-data:
  backup-cache:
  jellyfin-config:
  loki-data:
  grafana-data:
```

---

## 3. Traefik-Middleware

`infrastructure/traefik/dynamic/middlewares.yml`:

```yaml
http:
  middlewares:
    security-headers:
      headers:
        frameDeny: true
        sslRedirect: true
        stsIncludeSubdomains: true
        stsPreload: true
        stsSeconds: 31536000
        customResponseHeaders:
          X-Robots-Tag: "noindex, nofollow"
          Referrer-Policy: "strict-origin-when-cross-origin"
          Permissions-Policy: "camera=(), microphone=(), geolocation=(self)"

    rate-limit:
      rateLimit:
        average: 100
        burst: 200
        period: 1m

    compress:
      compress: {}
```

`infrastructure/traefik/dynamic/tls.yml`:

```yaml
tls:
  options:
    default:
      minVersion: VersionTLS12
      sniStrict: true
```

---

## 4. Postgres-Init

`infrastructure/postgres/init.sql`:

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "citext";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";
CREATE EXTENSION IF NOT EXISTS "btree_gist";
```

---

## 5. Profile-Übersicht

| Profile | Services |
|---------|----------|
| (default) | tailscale, traefik, postgres, pgbouncer, redis, meilisearch, backend, worker, frontend, backup |
| `media` | ffmpeg-worker |
| `ocr` | ocr |
| `jellyfin` | jellyfin |
| `observability` | loki, grafana |

Aktivierung per Service:

```bash
docker compose --profile media --profile ocr up -d
docker compose --profile jellyfin --profile observability up -d
```

---

## 6. Starten

```bash
cd /volume1/docker/lifehub
cp .env.example .env && nano .env

mkdir -p infrastructure/lifehub/{thumbnails,vault,tmp}
touch infrastructure/traefik/acme.json
chmod 600 .env infrastructure/traefik/acme.json

docker compose pull
docker compose up -d
docker compose logs -f backend worker
```

Aufruf: `https://lifehub.your-tailnet.ts.net` (nur aus dem Tailnet erreichbar).

---

## 7. Backup-Strategie (vereinfacht)

`backup.sh` läuft täglich 03:00 im `backup`-Container:

1. `pg_dump -Fc` → `db_YYYY-MM-DD.dump`
2. `restic backup` auf `/backup/media/photos`, `/backup/media/videos`, `/backup/documents`, `/backup/projects`, `/backup/vault`
3. `restic forget --keep-daily 7 --keep-weekly 4 --keep-monthly 6 --prune`
4. Optional: Sync nach S3 (Hetzner Storage Box, AWS S3, …)

Detailliertes Skript und Restore-Workflow: siehe `docs/DOCKER_COMPOSE_PRODUCTION.md` §6 (Backup) und §7.6 (Restore) in der vorherigen, ausführlicheren Version — diese Datei konzentriert sich auf den `docker-compose`-Kern.

---

## 8. DoD Deployment

- [ ] `docker compose ps` zeigt alle Services `healthy`
- [ ] `https://lifehub.your-tailnet.ts.net` lädt Login-Seite (nur aus Tailnet)
- [ ] Admin-Login funktioniert
- [ ] Erster Foto-Upload erscheint in Galerie
- [ ] Thumbnail wird im Worker generiert
- [ ] `pg_dump` + `restic backup` laufen erfolgreich
- [ ] 7 Tage Dauerbetrieb ohne Crash
- [ ] Tailscale-Tag `tag:lifehub` aktiv
