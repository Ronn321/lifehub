# LifeHub

Private self-hosted Family Operating System.
Läuft auf deinem NAS, erreichbar über Tailscale.

---

## Was ist LifeHub?

LifeHub ist eine modulare, selbst gehostete Web-Plattform für die Organisation des gesamten Familien- und Privatlebens — Fotos, Reisen, Rezepte, Finanzen, Passwörter, Haus-IT, Medien und mehr, unter einer gemeinsamen Oberfläche.

Inspiriert von Nextcloud, Jellyfin, Vaultwarden, Obsidian, Google Photos und Portfolio Performance — aber in einer kohärenten Plattform mit Domain-Driven Design, vertikaler Umsetzung und Plugin-Architektur.

---

## Features (Übersicht)

- 📸 **Medien** — Fotos & Videos mit Timeline, Karte, 3D-Globe, Alben
- ✈️ **Reisen** — Eigene Landingpage pro Urlaub mit Route, Fotos, Notizen
- 🍳 **Rezepte** — Digitales Familien-Kochbuch mit Import aus Web/YouTube
- 🛒 **Einkaufslisten** — Geteilte Listen mit Live-Sync (Vorbereitung MorphCook)
- 💰 **Finanzen** — Konten, Budgets, Sparziele, Portfolio (Aktien/ETF/Krypto)
- 🛡️ **Versicherungen** — Verträge, Dokumente, Erinnerungen
- 🔐 **Vault** — AES-256 Passwort-Manager mit Zero-Knowledge
- 📄 **Dokumente** — OCR, Volltext-Suche, Verträge
- 📅 **Kalender** — Google/CalDAV-Sync, Familienkalender
- 🏠 **Haus-IT** — Inventar aller Geräte, Garantien, Netzwerk
- 🎬 **Jellyfin** — Mediathek im Netflix-Stil
- 🔍 **Suche** — Global über alle Domains
- 🧩 **Plugins** — Erweiterbar (Smart Home, KI, …)

Vollständige Spezifikation: siehe `docs/` und `features/`.

---

## Agent-Hierarchie (DOX)

Dieses Projekt nutzt [DOX](https://github.com/local/dx) (DOX = AGENTS.md-Hierarchie). Vor jeder Bearbeitung liest ein Agent die AGENTS.md-Kette vom Repo-Root bis zum Zielpfad. Die Hierarchie:

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

Jede Domain-AGENTS.md verweist auf ihre Pflicht-Master-Specs (`PLAN.md`, `ARCHITECTURE.md`, `DATABASE_SCHEMA.md`, `TECH_STACK.md`, `UI_UX.md`, `ROADMAP.md`, plus die zuständige Datei in `docs/`). Siehe Root-`AGENTS.md` §10 für den vollständigen Index.

## Repository-Struktur

```
lifehub/
├── AGENTS.md                       DOX Root Rail
├── PLAN.md                         Vision, Anforderungen, Phasen
├── ARCHITECTURE.md                 Technische Architektur + DDD
├── DATABASE_SCHEMA.md              Vollständiges Postgres-Schema
├── TECH_STACK.md                   Technologie-Entscheidungen
├── UI_UX.md                        Design-System + UX
├── ROADMAP.md                      4-Wellen-Umsetzungsplan
├── README.md                       Diese Datei
│
├── docs/                           Orchestrierung
│   ├── AGENTS.md                   DOX-Vertrag für docs/
│   ├── FEATURE_SPEC.md
│   ├── DOMAIN_MAP.md
│   ├── GLOBAL_RULES.md
│   ├── AGENT_EXECUTION_SYSTEM.md
│   ├── DOMAIN_STATUS.md
│   ├── CODE_GENERATION_TEMPLATES.md
│   ├── DOCKER_COMPOSE_PRODUCTION.md
│   └── GRAPHIFY.md                    Knowledge-Graph-Workflow
│
└── features/                       16 Domain-Paare: Spec + AGENTS.md
    ├── AGENTS.md                   DOX-Vertrag für features/
    ├── users.feature.md   +   users.AGENTS.md
    ├── media.feature.md   +   media.AGENTS.md
    ├── travel.feature.md  +   travel.AGENTS.md
    ├── projects.feature.md +  projects.AGENTS.md
    ├── recipes.feature.md  +  recipes.AGENTS.md
    ├── shopping.feature.md +  shopping.AGENTS.md
    ├── finance.feature.md  +  finance.AGENTS.md
    ├── insurance.feature.md + insurance.AGENTS.md
    ├── vault.feature.md    +  vault.AGENTS.md
    ├── documents.feature.md + documents.AGENTS.md
    ├── calendar.feature.md +  calendar.AGENTS.md
    ├── it_inventory.feature.md + it_inventory.AGENTS.md
    ├── jellyfin.feature.md +  jellyfin.AGENTS.md
    ├── search.feature.md   +  search.AGENTS.md
    ├── dashboard.feature.md + dashboard.AGENTS.md
    └── plugins.feature.md  +  plugins.AGENTS.md
```

---

## Tech-Stack (TL;DR)

- **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind, shadcn/ui
- **Backend:** NestJS 10, Drizzle ORM, Argon2id, JWT RS256
- **Datenbank:** PostgreSQL 16
- **Cache/Queues:** Redis 7 + BullMQ
- **Suche:** Meilisearch
- **Storage:** NAS-Mount (lokal), S3-Stub
- **Container:** Docker + Compose
- **VPN:** Tailscale
- **Reverse Proxy:** Traefik v3

Vollständige Begründung: `TECH_STACK.md`. Lizenz-Kosten: **0 €** (alles Open-Source).

---

## Schnellstart (Entwicklung)

```bash
# 1. Repo klonen
git clone https://github.com/<you>/lifehub.git
cd lifehub

# 2. .env anlegen
cp .env.example .env
# JWT-Schlüssel, DB-Passwörter, Tailscale-Auth-Key eintragen

# 3. Stack starten
docker compose up -d

# 4. Browser öffnen
open https://lifehub.your-tailnet.ts.net
```

Detaillierte Anleitung: `docs/DOCKER_COMPOSE_PRODUCTION.md`.

---

## Entwicklungsphasen

| Welle | Ziel | Module |
|-------|------|--------|
| **MVP** „Heimstart" | Plattform steht, Familie kann starten | Users, Media, Dashboard |
| **V1** „Leben organisieren" | Alltags-Module | Travel, Projects, Recipes, Shopping, Wiki |
| **V2** „Sicher & Sensibel" | sensible Daten | Finance, Insurance, Vault, Documents |
| **V3** „Erweitert" | Streaming, Mobile, Plugins | Jellyfin, Calendar, IT-Inventory, Search, Mobile, Plugins |

Vollständige Roadmap mit Epics, Features, Tasks: `ROADMAP.md`.

---

## Architektur — DDD & Vertical Slices

- **16 Bounded Contexts**, jeder mit eigenem Schema, eigener API, eigenem UI-Modul
- **Vertikale Umsetzung**: pro Domain erst DB → Service → API → UI → Tests → Audit → Doku fertig, dann nächste
- **Cross-Domain nur via IDs** — keine direkten DB-Joins zwischen Schemata
- **Plugin-ready** ab Phase 4 (Sandboxed Runtime)

Vollständige Regeln: `docs/AGENT_EXECUTION_SYSTEM.md`.

---

## Mitmachen

1. **Spec zuerst** — Änderungsideen in das passende `features/*.feature.md` einarbeiten
2. **Vertikal bauen** — keine halben Domains
3. **Tests mitliefern** — Unit + API + Permission
4. **Doku aktualisieren** — `docs/DOMAIN_STATUS.md` und `ROADMAP.md`
5. **Conventional Commits** — `feat(media): add timeline view`

---

## Sicherheit

- Argon2id Password-Hashing
- AES-256-GCM für Vault (Zero-Knowledge)
- JWT RS256 mit Refresh-Rotation
- 2FA (TOTP) + Passkeys (Phase 3)
- HMAC-Chain Audit-Log (tamper-evident)
- Tailscale-only Access (kein öffentliches Routing)
- Let's Encrypt TLS via Traefik
- Audit-Trigger auf 100 % der Mutationen

Vor Vault-Release: externes Security-Audit empfohlen (Budget 5–15 k €).

---

## Lizenz

AGPL-3.0 (geplant, oder nach deiner Wahl anpassen).
Sämtliche Dependencies sind MIT / Apache-2.0.

---

## Verwandte Projekte

- **MorphCook** (`C:\Users\Robert_D_AZ_1\Documents\MorphCook`) — Flutter-App, geplant als Mobile-Client für Einkaufslisten
- **RobertWeb** (`C:\Users\Robert_D_AZ_1\Documents\RobertWeb`) — Portfolio-Site

---

## Kontakt

Robert · `C:\Users\Robert_D_AZ_1\Documents\LifeHub`

LifeHub wird von einem Solo-Entwickler + AI-Agents (OpenCode / Hermes) gebaut.
