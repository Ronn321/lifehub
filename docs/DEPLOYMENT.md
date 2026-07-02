# DEPLOYMENT.md

# LifeHub — Deployment-Anleitung

Version: 2.0
Status: verbindlich

---

## 1. Übersicht

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

**Workflow:**
1. `git tag v0.1.0 && git push --tags`
2. GitHub Actions baut Images und pushed zu ghcr.io
3. Auf NAS: `docker compose pull && docker compose up -d`

---

## 2. Voraussetzungen

### 2.1 Development PC

- Docker Desktop
- Git

### 2.2 UGREEN NAS

- Docker Engine >= 24 + Docker Compose V2
- Tailscale installiert
- Mindestens 4 GB RAM

---

## 3. Einmaliges Setup auf dem NAS

### 3.1 Repository klonen

```bash
ssh <nas-user>@<nas-tailscale-ip>
mkdir -p /volume1/docker/lifehub
cd /volume1/docker/lifehub

# Benoetigte Dateien herunterladen (oder per scp vom PC kopieren):
# - docker-compose.prod.yml
# - infrastructure/postgres/init.sql
# - infrastructure/traefik/ (optional, fuer HTTPS)
```

### 3.2 `.env` erstellen

```bash
cp .env.prod.example .env
nano .env
```

Minimale `.env`:
```env
POSTGRES_PASSWORD=<random 32+>
REDIS_PASSWORD=<random 32+>
MEILI_MASTER_KEY=<random 32+>
JWT_PRIVATE_KEY_BASE64=<base64 RSA private key>
JWT_PUBLIC_KEY_BASE64=<base64 RSA public key>
LIFEHUB_HOST=lifehub.<tailnet>.ts.net
ACME_EMAIL=admin@example.com
TZ=Europe/Berlin
```

### 3.3 Verzeichnisse erstellen

```bash
mkdir -p infrastructure/postgres
mkdir -p infrastructure/traefik/dynamic
touch infrastructure/traefik/acme.json
chmod 600 .env infrastructure/traefik/acme.json
```

### 3.4 Starten

```bash
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

---

## 4. Update-Workflow

### 4.1 Neues Release erstellen (auf dem PC)

```bash
# Aenderungen committen
git add -A && git commit -m "feat(domain): neue Features"
git push

# Tag erstellen -> triggert automatischen Image-Build auf GitHub
git tag v0.2.0
git push --tags
```

GitHub Actions baut automatisch:
- `ghcr.io/ronn321/lifehub-backend:v0.2.0`
- `ghcr.io/ronn321/lifehub-frontend:v0.2.0`
- `ghcr.io/ronn321/lifehub-backend:latest`
- `ghcr.io/ronn321/lifehub-frontend:latest`

### 4.2 Auf dem NAS aktualisieren

```bash
ssh <nas>
cd /volume1/docker/lifehub

docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

Fertig.

---

## 5. Images manuell bauen und pushen

Falls du Images manuell (ohne GitHub Actions) bauen willst:

```bash
# Auf dem PC
export GITHUB_TOKEN=ghp_...

# Linux/Mac
./scripts/deploy.sh v0.1.0

# Windows
scripts\deploy.cmd v0.1.0
```

---

## 6. Verzeichnisstruktur auf dem NAS

```
/volume1/docker/lifehub/
├── docker-compose.prod.yml
├── .env
├── .env.prod.example
├── infrastructure/
│   ├── postgres/
│   │   └── init.sql
│   └── traefik/
│       ├── acme.json
│       └── dynamic/
│           ├── middlewares.yml
│           └── tls.yml
```

---

## 7. Daten-Sicherheit

**Regel: Daten niemals im Container speichern.**

Alle persistenten Daten sind auf NAS-Volumes:

| Daten | Volume/Pfad |
|-------|-------------|
| PostgreSQL | `postgres-data` |
| Redis | `redis-data` |
| Meilisearch | `meili-data` |
| Thumbnails | `lifehub-thumbnails` |
| Vault | `lifehub-vault` |
| Fotos | `/volume1/photo` (NAS-Mount) |
| Videos | `/volume1/video` (NAS-Mount) |
| Dokumente | `/volume1/documents` (NAS-Mount) |

Container sind **vollstaendig austauschbar**. `docker compose down && up` zerstoert keine Daten.

---

## 8. Backup

```bash
# Datenbank
docker exec lifehub-postgres pg_dump -U lifehub lifehub > backup_$(date +%Y%m%d).sql

# Alles
rsync -av /volume1/docker/lifehub/ /volume1/backups/lifehub/
```

---

## 9. Checkliste (DoD)

- [ ] GitHub Repo existiert, CI-Pipeline ist gruen
- [ ] Tag `v0.1.0` erstellt, Images auf ghcr.io
- [ ] `.env` auf NAS konfiguriert
- [ ] `docker compose pull` laedt Images
- [ ] `docker compose up -d` startet alle Services
- [ ] `https://lifehub.ts.net` zeigt Login-Seite
- [ ] Admin-Login funktioniert
- [ ] Daten bleiben nach `docker compose down && up` erhalten
