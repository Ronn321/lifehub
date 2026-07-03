# LifeHub

Private self-hosted Family Operating System.
Läuft auf deinem NAS, erreichbar über Tailscale.

---

## Docker Installation (3 Schritte)

```bash
# 1. docker-compose.yml herunterladen
curl -O https://raw.githubusercontent.com/Ronn321/lifehub/main/docker-compose.yml

# 2. Stack starten
docker compose up -d

# 3. Frontend öffnen
# http://localhost:3100
```

**Keine .env nötig. Kein Generieren. Kein Konfigurieren.**

### Mit Medien (Fotos, Videos, etc.)

```bash
MEDIA_PHOTOS=/volume1/photo \
MEDIA_VIDEOS=/volume1/video \
MEDIA_DOCUMENTS=/volume1/documents \
docker compose up -d
```

### Custom Configuration

```bash
cp .env.example .env
# .env anpassen
docker compose up -d
```

Siehe `.env.example` für alle verfügbaren Optionen.

---

## Was ist LifeHub?

LifeHub ist eine modulare, selbst gehostete Web-Plattform für die Organisation des gesamten Familien- und Privatlebens — Fotos, Reisen, Rezepte, Finanzen, Passwörter, Haus-IT, Medien und mehr, unter einer gemeinsamen Oberfläche.

Inspiriert von Nextcloud, Jellyfin, Vaultwarden, Obsidian, Google Photos und Portfolio Performance — aber in einer kohärenten Plattform mit Domain-Driven Design, vertikaler Umsetzung und Plugin-Architektur.

---

## Features (Übersicht)

- **Medien** — Fotos & Videos mit Timeline, Karte, 3D-Globe, Alben
- **Reisen** — Eigene Landingpage pro Urlaub mit Route, Fotos, Notizen
- **Rezepte** — Digitales Familien-Kochbuch mit Import aus Web/YouTube
- **Einkaufslisten** — Geteilte Listen mit Live-Sync (Vorbereitung MorphCook)
- **Finanzen** — Konten, Budgets, Sparziele, Portfolio (Aktien/ETF/Krypto)
- **Versicherungen** — Verträge, Dokumente, Erinnerungen
- **Vault** — AES-256 Passwort-Manager mit Zero-Knowledge
- **Dokumente** — OCR, Volltext-Suche, Verträge
- **Kalender** — Google/CalDAV-Sync, Familienkalender
- **Haus-IT** — Inventar aller Geräte, Garantien, Netzwerk
- **Jellyfin** — Mediathek im Netflix-Stil
- **Suche** — Global über alle Domains
- **Plugins** — Erweiterbar (Smart Home, KI, …)

---

## Docker Services

| Service | Port | Beschreibung |
|---------|------|--------------|
| Frontend | 3100 | Next.js Web-UI |
| Backend | 3007 | NestJS API |
| PostgreSQL | — | Datenbank (intern) |
| Redis | — | Cache (intern) |
| Meilisearch | — | Volltext-Suche (intern) |

---

## Tech-Stack

- **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind, shadcn/ui
- **Backend:** NestJS 10, Drizzle ORM, Argon2id, JWT RS256
- **Datenbank:** PostgreSQL 16
- **Cache/Queues:** Redis 7 + BullMQ
- **Suche:** Meilisearch
- **Container:** Docker + Compose

Vollständige Begründung: `TECH_STACK.md`.

---

## Agent-Hierarchie (DOX)

Dieses Projekt nutzt DOX (DOX = AGENTS.md-Hierarchie). Vor jeder Bearbeitung liest ein Agent die AGENTS.md-Kette vom Repo-Root bis zum Zielpfad.

```
AGENTS.md                              (Root Rail)
├── docs/AGENTS.md                     (Master-Specs / Doku)
└── features/AGENTS.md                 (Domain-Specs)
    ├── users.AGENTS.md
    ├── media.AGENTS.md
    ├── travel.AGENTS.md
    ├── projects.AGENTS.md
    ├── recipes.AGENTS.md
    ├── shopping.AGENTS.md
    ├── finance.AGENTS.md
    ├── insurance.AGENTS.md
    ├── vault.AGENTS.md
    ├── documents.AGENTS.md
    ├── calendar.AGENTS.md
    ├── it_inventory.AGENTS.md
    ├── jellyfin.AGENTS.md
    ├── search.AGENTS.md
    ├── dashboard.AGENTS.md
    └── plugins.AGENTS.md
```

---

## Entwicklungsphasen

| Welle | Ziel | Module |
|-------|------|--------|
| **MVP** „Heimstart" | Plattform steht | Users, Media, Dashboard |
| **V1** „Leben organisieren" | Alltags-Module | Travel, Projects, Recipes, Shopping |
| **V2** „Sicher & Sensibel" | sensible Daten | Finance, Insurance, Vault, Documents |
| **V3** „Erweitert" | Streaming, Mobile | Jellyfin, Calendar, IT-Inventory, Plugins |

---

## Sicherheit

- Argon2id Password-Hashing
- AES-256-GCM für Vault (Zero-Knowledge)
- JWT RS256 mit Refresh-Rotation
- 2FA (TOTP) + Passkeys (Phase 3)
- HMAC-Chain Audit-Log (tamper-evident)
- Tailscale-only Access (kein öffentliches Routing)
- Let's Encrypt TLS via Traefik

---

## Lizenz

AGPL-3.0 (geplant).
Sämtliche Dependencies sind MIT / Apache-2.0.
