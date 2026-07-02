# DEPLOYMENT.md

# LifeHub — Deployment-Anleitung

Version: 1.0
Status: verbindlich

---

## 1. Übersicht

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

---

## 2. Voraussetzungen

### 2.1 Development PC

- Windows 10/11
- Docker Desktop (oder Docker Engine via WSL2)
- Node.js >= 20
- pnpm >= 9
- Git

### 2.2 UGREEN NAS

- Docker Engine >= 24
- Docker Compose V2
- Tailscale installiert und konfiguriert
- Mindestens 4 GB RAM (8 GB empfohlen)
- Mindestens 20 GB freier Speicher

### 2.3 Netzwerk

- PC und NAS im gleichen Tailscale Tailnet
- Tailscale MagicDNS aktiv (optional)

---

## 3. Einmaliges Setup

### 3.1 Private Docker Registry auf dem NAS

1. Repository auf NAS kopieren (oder per SSH):
   ```bash
   ssh <nas-user>@<nas-tailscale-ip>
   mkdir -p /volume1/docker/lifehub
   ```

2. Registry-Setup ausfuehren:
   ```bash
   cd /volume1/docker/lifehub
   # infrastructure/registry/ vom Repo kopieren
   cd infrastructure/registry
   chmod +x setup.sh
   ./setup.sh
   ```

3. Registry starten:
   ```bash
   cd /volume1/docker/lifehub/infrastructure/registry
   docker compose up -d
   ```

4. Testen:
   ```bash
   curl http://<nas-tailscale-ip>:5000/v2/
   # Sollte {} oder 401 zurueckgeben (Registry laeuft)
   ```

### 3.2 Docker Desktop auf dem PC konfigurieren

Die private Registry als "insecure" registrieren (da kein TLS):

1. Docker Desktop > Settings > Docker Engine
2. Folgendes hinzufuegen:
   ```json
   {
     "insecure-registries": ["<nas-tailscale-ip>:5000"]
   }
   ```
3. Docker Desktop neu starten.

### 3.3 Registry-Login auf dem PC

```bash
docker login <nas-tailscale-ip>:5000
# Benutzer: lifehub
# Passwort: <das gewaehlte Passwort>
```

### 3.4 Production-Compose auf dem NAS

1. `docker-compose.prod.yml` und `infrastructure/` auf NAS kopieren:
   ```bash
   scp docker-compose.prod.yml <nas>: /volume1/docker/lifehub/
   scp -r infrastructure/ <nas>:/volume1/docker/lifehub/
   ```

2. `.env` auf NAS erstellen:
   ```bash
   ssh <nas>
   cd /volume1/docker/lifehub
   cp .env.example .env
   nano .env
   ```
   
   Minimale `.env`:
   ```env
   POSTGRES_PASSWORD=<random 32+>
   REDIS_PASSWORD=<random 32+>
   MEILI_MASTER_KEY=<random 32+>
   LIFEHUB_REGISTRY=<nas-tailscale-ip>:5000
   LIFEHUB_HOST=lifehub.<tailnet>.ts.net
   ACME_EMAIL=admin@example.com
   TZ=Europe/Berlin
   ```

3. Verzeichnisse erstellen:
   ```bash
   mkdir -p infrastructure/lifehub/{thumbnails,vault,tmp}
   mkdir -p infrastructure/traefik
   touch infrastructure/traefik/acme.json
   chmod 600 .env infrastructure/traefik/acme.json
   ```

---

## 4. Deployment-Workflow

### 4.1 Images bauen und pushen (auf dem PC)

```bash
# Im LifeHub-Repo-Verzeichnis
# Version als Argument (optional)
./scripts/deploy.sh v0.1.0

# Oder ohne Version (nutzt "latest")
./scripts/deploy.sh

# Oder mit Registry-IP
LIFEHUB_REGISTRY=100.64.0.1:5000 ./scripts/deploy.sh v0.1.0
```

Windows:
```cmd
scripts\deploy.cmd v0.1.0 100.64.0.1:5000
```

### 4.2 Auf dem NAS deployen

```bash
ssh <nas>
cd /volume1/docker/lifehub

# Images pullen
docker compose -f docker-compose.prod.yml pull

# Container aktualisieren
docker compose -f docker-compose.prod.yml up -d

# Logs pruefen
docker compose -f docker-compose.prod.yml logs -f backend frontend
```

### 4.3 Versionierung

- Semantic Versioning: `v0.1.0`, `v0.2.0`, `v1.0.0`
- Tags: `v0.1.0`, `latest`, `stable`, `beta`
- Bei jedem Release:
  ```bash
  git tag -a v0.1.0 -m "Release v0.1.0 - Initial MVP"
  git push --tags
  ./scripts/deploy.sh v0.1.0
  ```

---

## 5. Verzeichnisstruktur auf dem NAS

```
/volume1/docker/lifehub/
├── docker-compose.prod.yml
├── .env
├── infrastructure/
│   ├── registry/
│   │   ├── docker-compose.yml
│   │   ├── auth/
│   │   │   └── htpasswd
│   │   └── setup.sh
│   ├── traefik/
│   │   ├── acme.json
│   │   └── dynamic/
│   │       ├── middlewares.yml
│   │       └── tls.yml
│   ├── postgres/
│   │   └── init.sql
│   └── lifehub/
│       ├── thumbnails/
│       ├── vault/
│       └── tmp/
```

---

## 6. Daten-Sicherheit

**Regel: Daten niemals im Container speichern.**

Alle persistenten Daten sind auf NAS-Volumes:

| Daten | Volume/Pfad | Beschreibung |
|-------|-------------|--------------|
| PostgreSQL | `postgres-data` | Datenbank |
| Redis | `redis-data` | Cache, Sessions |
| Meilisearch | `meili-data` | Suchindex |
| Thumbnails | `lifehub-thumbnails` | Generierte Vorschaubilder |
| Vault | `lifehub-vault` | Verschluesselte Passwort-Daten |
| Fotos | `/volume1/photo` | NAS-Mount |
| Videos | `/volume1/video` | NAS-Mount |
| Dokumente | `/volume1/documents` | NAS-Mount |

Container sind **vollstaendig austauschbar**. `docker compose down && up` zerstoert keine Daten.

---

## 7. Backup

### 7.1 Datenbank-Backup

```bash
# Manuell
docker exec lifehub-postgres pg_dump -U lifehub lifehub > backup_$(date +%Y%m%d).sql

# Automatisch (taeglich 03:00 via crontab)
0 3 * * * docker exec lifehub-postgres pg_dump -U lifehub lifehub | gzip > /volume1/backups/lifehub/db_$(date +\%Y\%m\%d).sql.gz
```

### 7.2 Datei-Backup

```bash
# rsync aller LifeHub-Daten
rsync -av /volume1/docker/lifehub/ /volume1/backups/lifehub/
rsync -av /volume1/photo/ /volume1/backups/lifehub/photos/
```

---

## 8. Troubleshooting

### Container startet nicht

```bash
# Logs pruefen
docker compose -f docker-compose.prod.yml logs backend

# Health-Status pruefen
docker compose -f docker-compose.prod.yml ps

# Container neu starten
docker compose -f docker-compose.prod.yml restart backend
```

### Migration fehlgeschlagen

```bash
# Manuell Migration ausfuehren
docker exec -it lifehub-backend npx tsx apps/backend/src/db/migrate.ts
```

### Registry nicht erreichbar

```bash
# Registry-Container pruefen
docker ps | grep registry

# Registry-Logs
docker logs lifehub-registry

# Testen
curl http://<nas-ip>:5000/v2/
```

---

## 9. Checkliste (DoD)

- [ ] Private Registry laeuft auf dem NAS
- [ ] `docker login` auf dem PC erfolgreich
- [ ] `./scripts/deploy.sh` baut und pushed Images
- [ ] `docker compose pull` auf NAS laedt Images
- [ ] `docker compose up -d` startet alle Services
- [ ] `https://lifehub.ts.net` zeigt Login-Seite
- [ ] Admin-Login funktioniert
- [ ] DB-Migration laeuft automatisch
- [ ] Health-Checks aller Services gruen
- [ ] Daten bleiben nach `docker compose down && up` erhalten
- [ ] Backup + Restore funktioniert
