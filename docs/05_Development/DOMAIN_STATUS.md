# DOMAIN_STATUS.md

# LifeHub Domain Execution Tracking

Version: 1.0

---

# Purpose

Dieses Dokument verfolgt den Entwicklungsstand aller Domains im System.
Es wird vom Agent kontinuierlich aktualisiert.

---

# Status Model

Jede Domain hat exakt einen Status:

- NOT_STARTED
- IN_PROGRESS
- IMPLEMENTED
- TESTED
- DONE
- BLOCKED

---

# Domain Table

## Core Foundation (Phase 0 ✅)

| Domain | Status | Owner | Notes |
|--------|--------|------|------|
| users | DONE | system | Auth, RBAC, JWT, Argon2id — inkl. Rollen-CRUD, Permission-Endpunkte, User-Role-Zuweisung ✅ |
| permissions | DONE | system | 96 Permissions (4 Rollen × 6 Actions × 4 Domains), geseedet |
| auth | DONE | system | JWT RS256, Refresh-Rotation, Argon2id |
| storage | IMPLEMENTED | system | NAS-Abstraktion + LocalDisk-Adapter |
| audit | IMPLEMENTED | system | HMAC-Chain, globaler Audit-Logger |
| events | DONE | system | BullMQ-Queue, Event-Emission (UserLoggedIn, UserCreated, etc.) |

---

## Data Core

| Domain | Status | Notes |
|--------|--------|------|
| media | IMPLEMENTED | Sources CRUD + Scan/Index, Files CRUD, Albums CRUD, Favorite Toggle, Gallery mit Lightbox, Map-View (Leaflet), Date-Suche/Favoriten-Filter, Massenauswahl + Add-to-Album, Video-Streaming mit Range-Support + CORS/CORB-Fix |
| dashboard | IMPLEMENTED | Widget-System: GET/PUT /dashboard/layout, 4 Widget-Typen (Media, Weather Open-Meteo, Calendar, Savings-Stub), CSS-Grid-Layout mit Persistenz pro User |

---

## Life Modules

| Domain | Status |
|--------|--------|
|| travel | IMPLEMENTED | Backend: Entities, DTOs (Zod), Repository (Drizzle), Service, Controller + Module (NestJS), DB-Tabellen (travel_trips, travel_destinations, travel_trip_days, travel_trip_media_refs), Migration existent. Frontend: Trips-Übersicht (Grid/Liste, Suche, Status-Badge), Trip-Detail (Tabs: Übersicht/Orte/Tage/Karte), Orte-CRUD, Tage-CRUD, OSM-Kartenansicht, Dialog zum Anlegen. |
|| projects | IMPLEMENTED | Backend + Frontend: Projekt-CRUD, Notizen, Links, Files-Upload, Type/Status. |
|| recipes | IMPLEMENTED | Backend + Frontend: Rezept-CRUD, Zutaten, Schritte, Tags, Portionen-Skalierung. |
|| shopping | IMPLEMENTED | Backend: Entities, DTOs (Zod), Repository (Drizzle), Service (CRUD + check/uncheck), Controller + Module (NestJS), DB-Tabellen (shopping_lists, shopping_items). Frontend: Übersicht (Karten, Fortschrittsbalken, Farbe), Detail (Kategorie-Gruppierung, Check/Uncheck, Menge/Einheit, neues Item, archivieren). Sidebar integriert. |

---

## Sensitive Modules

| Domain | Status |
|--------|--------|
| finance | IMPLEMENTED | Backend: 7 Entities, DTOs (Zod), Repository (Drizzle), Service, Controller + Module (NestJS). Frontend: Dashboard mit Net Worth, Konten, Transaktionen, Budgets, Sparziele, Wertanlagen. DB: 7 Tabellen in shared/db/schema/public.ts. Migration existent. Sidebar integriert. |
| insurance | IMPLEMENTED | Backend: Entities, DTOs (Zod), Repository (Drizzle), Service, Controller + Module (NestJS). DB: insurance_policies + insurance_documents in shared/db/schema/public.ts. Frontend: Übersicht (Karten, Kategorie-Icons, Monatsbeitrag, Status), Detail (Infos + Dokumente + Kündigungsfrist), Neu-Anlegen-Dialog. Sidebar integriert. |
| vault | IMPLEMENTED | Backend: VaultEntry-CRUD, TOTP-Generierung (otplib), AES-256-GCM. Frontend: Passwörter/TOTP/Karten-Manager. Sidebar aktiv. |
| search | IMPLEMENTED | Globale Suche: parallel über 12 Domains via DI, In-Memory-Filter, Debounce (300ms), Gruppen-Ansicht. |
| plugins | IMPLEMENTED | Plugin-Management: CRUD, Enable/Disable Toggle, JSONB-Konfiguration. Backend + Frontend aktiv. |
| documents | IMPLEMENTED |

---

## System Modules

| Domain | Status |
|--------|--------|
| calendar | IMPLEMENTED | Backend: Entities, DTOs (Zod), Repository (Drizzle), Service, Controller + Module (NestJS). DB: calendar_events in shared/db/schema/public.ts. Frontend: Monatsansicht mit Termin-Grid, Create/Edit/Delete-Dialog, farbige Badges, Kategorien. Sidebar: "Kalender" aktiv. |
| it_inventory | IMPLEMENTED | Backend: Entities, DTOs (Zod), Repository (Drizzle), Service, Controller + Module (NestJS). DB: it_devices in shared/db/schema/public.ts. Migration existent (0003_it_devices.sql). Frontend: Geräteliste mit Typ-Icons, Netzwerk-Ansicht, Suchen/Filtern, Create/Edit/Delete-Dialog. Sidebar: "Haus-IT" aktiv. |
| search | IMPLEMENTED | Phase 1: DB-basierte ILIKE-Suche über 7 Domains (media, recipes, projects, insurance, vault, travel, finance). Repository-Layer mit raw SQL, parallele Queries, Promise.all. Controller ohne PermissionGuard (jeder eingeloggte User). search_queries-Tabelle für Analytics. Frontend: Suche mit Filter-Chips, Domain-Icons, Gruppen-Ansicht. Meilisearch für Phase 2 vorgemerkt. |
| jellyfin | IMPLEMENTED | Backend: Entities, DTOs (Zod), Repository (Drizzle), Service (Jellyfin-API-Integration), Controller + Module (NestJS). DB: 3 Tabellen (jellyfin_servers, jellyfin_libraries, jellyfin_items) in shared/db/schema/public.ts. Frontend: Server-Verwaltung (verbinden/löschen/syncen), Bibliotheken-Anzeige, Medien-Liste mit Watch-Status-Toggle. Sidebar: "Jellyfin" aktiv (Clapperboard-Icon). |
| plugins | IMPLEMENTED | Phase 1 MVP: Plugin-Entity, DTOs (Zod), Repository (Drizzle), Service (install/uninstall/enable/disable), Controller + Module (NestJS). Frontend: Plugin-Liste mit Enable/Disable Toggle, Install-Dialog, Deinstallieren. Sidebar: Puzzle-Icon aktiv. DB: plugins-Tabelle in shared/db/schema/public.ts. Migration 0004_plugins.sql. |

---

---

## Presentation Layer (Phase 7)

| Domain | Status | Notes |
|--------|--------|-------|
| pages | IMPLEMENTED | Backend: Schema (pages + page_blocks mit JSONB), Entities, DTOs (Zod), Repository (Drizzle), Service (Tree-Build, Block-CRUD, Domain-Events), Controller + Module (NestJS), Permissions ('pages' in ALL_DOMAINS). DB: pages + page_blocks (Indexe, updated_at-Trigger), Migration 0006_pages.sql. Frontend: Sidebar integriert, Tree-Übersicht, Detail mit Block-Editor (TipTap JSON für text/heading), Block-Typen (heading, text, divider, image, gallery, file-list), Media-Picker für image/gallery, Create-/Edit-Dialog, Block-Reorder (move up/down). Seed: pages in DOMAINS-Array. Siehe `docs/01_Architecture/PAGE_SYSTEM_VISION.md`. |

---

# Rules

## 1. Update Rule

Agent MUST update status:

- BEFORE starting a domain → IN_PROGRESS
- AFTER completion → DONE

## 2. Block Rule

If dependency missing:
→ mark BLOCKED
→ specify reason

## 3. No Skipping

No domain may be skipped.

## 4. Single Active Domain Rule

Only ONE domain may be IN_PROGRESS at a time.

## 5. Sub-Status Transitions

Allowed order:
`NOT_STARTED → IN_PROGRESS → IMPLEMENTED → TESTED → DONE`

Sideways to `BLOCKED` is allowed with reason.
From `BLOCKED` only back to `IN_PROGRESS` after dependency resolved.
