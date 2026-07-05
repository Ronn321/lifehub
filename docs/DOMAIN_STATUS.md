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
| travel | IMPLEMENTED | Backend: Entities, DTOs (Zod), Repository (Drizzle), Service, Controller + Module (NestJS), DB-Tabellen (travel_trips, travel_destinations, travel_trip_days, travel_trip_media_refs), Migration existent. Frontend: Trips-Übersicht (Grid/Liste, Suche, Status-Badge), Trip-Detail (Tabs: Übersicht/Orte/Tage/Karte), Orte-CRUD, Tage-CRUD, OSM-Kartenansicht, Dialog zum Anlegen. Missing: Leaflet-Map via npm, Event-Emission, Unit-Tests, Permission-Tests. |
| projects | NOT_STARTED |
| recipes | NOT_STARTED |
| shopping | IMPLEMENTED | Backend: Entities, DTOs (Zod), Repository (Drizzle), Service (CRUD + check/uncheck), Controller + Module (NestJS), DB-Tabellen (shopping_lists, shopping_items). Frontend: Übersicht (Karten, Fortschrittsbalken, Farbe), Detail (Kategorie-Gruppierung, Check/Uncheck, Menge/Einheit, neues Item, archivieren). Sidebar integriert. |

---

## Sensitive Modules

| Domain | Status |
|--------|--------|
| finance | IMPLEMENTED | Backend: 7 Entities, DTOs (Zod), Repository (Drizzle), Service, Controller + Module (NestJS). Frontend: Dashboard mit Net Worth, Konten, Transaktionen, Budgets, Sparziele, Wertanlagen. DB: 7 Tabellen in shared/db/schema/public.ts. Migration existent. Sidebar integriert. |
| insurance | NOT_STARTED |
| vault | NOT_STARTED |
| documents | NOT_STARTED |

---

## System Modules

| Domain | Status | Notes |
|--------|--------|------|
| calendar | NOT_STARTED | |
| it_inventory | NOT_STARTED | |
| search | NOT_STARTED | |
| jellyfin | IMPLEMENTED | Netflix-style Media UI v1 — Movies, Series, Detailseiten, Player, Search, Collections, Continue Watching |
| **pages** | **IMPLEMENTED** | **Notion-like Page System: Pages CRUD, Blocks CRUD, Versioning (Page + Block), Relations, Templates, Research Workspace (Sessions, Sources, Collections), Browser Tabs, Page Pins, Web Proxy, Search API, Page Move, Children API, Import/Export (JSON/Markdown), Permission Overrides, Drag & Drop UI, 16 Block Components, TipTap Editor, Media Picker, Tree View. Backend: NestJS (domains/pages/). Frontend: apps/frontend/src/app/(dashboard)/pages/. DB: 10 Tables in shared/db (pages, page_blocks, block_versions, page_versions, page_relations, page_templates, research_sessions, research_sources, research_collections, page_pins, browser_tabs) + 2 new (page_permissions, database_pages).** |
| plugins | NOT_STARTED | |

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
