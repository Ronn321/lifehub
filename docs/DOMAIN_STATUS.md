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
| projects | IMPLEMENTED | Backend: Entities, DTOs, Repository, Service, Controller (CRUD + Notes + Links + Permission Guards, YouTube-Sanitisierung). Frontend: Create-Dialog, Card-Grid, Detail-Ansicht (Übersicht/Notizen/Links-Tabs), GitHub-/YouTube-Integration. DB: 4 Tabellen (projects, project_files, project_notes, project_links) + Migration. Module in app.module.ts registriert. Typecheck 0 Fehler. |
| recipes | IMPLEMENTED | Backend + Frontend + DB vorhanden (recipes, ingredients, steps, recipe_tags, dishes). |
| shopping | IMPLEMENTED | Backend: Entities, DTOs (Zod), Repository (Drizzle), Service (CRUD + check/uncheck), Controller + Module (NestJS), DB-Tabellen (shopping_lists, shopping_items). Frontend: Übersicht (Karten, Fortschrittsbalken, Farbe), Detail (Kategorie-Gruppierung, Check/Uncheck, Menge/Einheit, neues Item, archivieren). Sidebar integriert. |

---

## Sensitive Modules

| Domain | Status |
|--------|--------|
| finance | IMPLEMENTED | Backend: 7 Entities, DTOs (Zod), Repository (Drizzle), Service, Controller + Module (NestJS). Frontend: Dashboard mit Net Worth, Konten, Transaktionen, Budgets, Sparziele, Wertanlagen. DB: 7 Tabellen in shared/db/schema/public.ts. Migration existent. Sidebar integriert. |
| insurance | IMPLEMENTED | Backend + Frontend + Controller + Drizzle-Schema (insurance_policies, insurance_documents) + Migration 0013. Typecheck 0 Fehler. |
| vault | IMPLEMENTED | Backend + Frontend + Controller + Drizzle-Schema (vault_entries, vault_totp_secrets, vault_cards, vault_attachments) + Migration 0013. Typecheck 0 Fehler. |
| documents | IMPLEMENTED | Backend + Frontend + Controller + Drizzle-Schema (documents, document_tags, document_refs) + Migration 0013. Typecheck 0 Fehler. |

---

## System Modules

| Domain | Status | Notes |
|--------|--------|------|
| calendar | IMPLEMENTED | Backend + Frontend + Controller + Drizzle-Schema (calendar_events, calendars, event_attendees, event_reminders) + Migration 0013. Typecheck 0 Fehler. |
| it_inventory | IMPLEMENTED | Backend + Frontend + Controller + Drizzle-Schema (it_devices, it_locations, it_network_interfaces, it_device_credentials) + Migration 0013. Typecheck 0 Fehler. |
| search | IMPLEMENTED | Backend + Frontend + Controller + Drizzle-Schema (search_queries, search_clicks) + Migration 0013. Typecheck 0 Fehler. |
| jellyfin | IMPLEMENTED | Netflix-style Media UI v1 — Movies, Series, Detailseiten, Player, Search, Collections, Continue Watching |
| **pages** | **IMPLEMENTED** | **Notion-like Page System: Pages CRUD, Blocks CRUD, Versioning (Page + Block), Relations, Templates, Research Workspace (Sessions, Sources, Collections), Browser Tabs, Page Pins, Web Proxy, Search API, Page Move, Children API, Import/Export (JSON/Markdown), Permission Overrides, Drag & Drop UI, 16 Block Components, TipTap Editor, Media Picker, Tree View. Backend: NestJS (domains/pages/). Frontend: apps/frontend/src/app/(dashboard)/pages/. DB: 10 Tables in shared/db (pages, page_blocks, block_versions, page_versions, page_relations, page_templates, research_sessions, research_sources, research_collections, page_pins, browser_tabs) + 2 new (page_permissions, database_pages).** |
| plugins | IMPLEMENTED | Backend + Frontend + Controller + Drizzle-Schema (plugins, plugin_permissions, plugin_data) + Migration 0013. Typecheck 0 Fehler. |
| **calendar** | **DONE** | **Google-Integration + Personalisierung fertig: OAuth2-Verbindung (via integrations), Zwei-Wege-Google-Sync (syncToken inkrementell, externalId-idempotent, Fenster -90d/+365d, Cron 15min), 4 Ansichten (Monat/Woche/Tag/Agenda), Multi-Kalender + Sichtbarkeit, Settings-API (Akzent, Hintergrundbild, View). Migration 0018 + 0019.** |
| **integrations** | **DONE** | **Google-OAuth2-Infrastruktur-Domain: auth-url/callback/status/disconnect, AES-256-GCM-verschlüsselte Tokens, Public-Interface GoogleConnectionService (getStatus/getGoogleClient/getGmail) für calendar+email. Schema integrations.google_connections. Migration 0018.** |
| **email** | **DONE (V1)** | **Gmail-Live-Proxy, keine eigene Tabelle: 3-Spalten-UI (Ordner/Threads/Lesebereich, sandboxed iframe), send/reply/forward, Thread-Modify (Archiv/Papierkorb/Gelesen), Anhänge, Ungelesen-Badge. Permission-Domain email (read/create/update). Nutzt integrations.getGmail.** |

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
