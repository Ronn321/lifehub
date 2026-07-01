# ROADMAP.md

# LifeHub – Umsetzungs-Roadmap

Version: 1.0
Format: Epics → Features → Tasks mit konkreten Akzeptanzkriterien.

---

## 0. Übersicht

LifeHub wird in **4 Wellen** ausgeliefert:

| Welle | Codename | Ziel | Dauer (Schätzung) |
|-------|----------|------|-------------------|
| **MVP** | „Heimstart" | Plattform steht, Familie kann starten | 8–12 Wochen |
| **V1** | „Leben organisieren" | Alltags-Module | 8–10 Wochen |
| **V2** | „Sicher & Sensibel" | Finanzen, Vault, Dokumente | 6–8 Wochen |
| **V3** | „Erweitert" | Jellyfin, Kalender, Mobile, Plugins | 8–12 Wochen |

Gesamt-Scope: ca. 30–42 Wochen aktive Entwicklung, idealerweise mit 1–2 Entwicklern + AI-Agents pro Domain.

---

## 1. MVP — „Heimstart" (Phase 0 + 1)

**Ziel:** Die Plattform läuft auf dem NAS, ist via Tailscale erreichbar, die Familie kann sich anmelden, Fotos/Videos hochladen und in einer Galerie ansehen.

### Epic M1: Foundation & Infrastructure

**M1.1 Repo & Tooling**
- [ ] Monorepo mit `pnpm workspaces` (oder Turborepo)
- [ ] TypeScript strict, ESLint, Prettier
- [ ] Husky + lint-staged
- [ ] Conventional Commits + Commitlint
- [ ] GitHub Actions: CI (lint, test, build)

**M1.2 Docker-Stack**
- [ ] `docker-compose.yml` mit: backend, frontend, postgres, redis, meilisearch, traefik, tailscale
- [ ] Traefik + Let's Encrypt
- [ ] Tailscale sidecar mit `TS_AUTHKEY`
- [ ] `.env.example` + `docs/INSTALL.md`

**M1.3 Backend-Skeleton (NestJS)**
- [ ] App-Module mit globalen Guards
- [ ] OpenAPI-Generator eingebunden
- [ ] Health-Check `/health`, `/ready`
- [ ] Logger (Pino) strukturiert JSON

**M1.4 Frontend-Skeleton (Next.js)**
- [ ] App-Router mit Layout-Groupen
- [ ] shadcn/ui initialisiert mit Tokens aus `UI_UX.md`
- [ ] Tailwind-Config mit Design-Tokens
- [ ] Theme-Provider (dark/light/system)
- [ ] TanStack Query Setup

**Akzeptanz:** `docker compose up` startet alle Services, `https://lifehub.ts.net` zeigt Login-Seite, CI grün.

### Epic M2: Auth & Users

**M2.1 User-Entity**
- [ ] Postgres-Schema `public.users`, `groups`, `roles`, `permissions`
- [ ] Migrations-System (Drizzle)
- [ ] Soft-Delete auf allen Entitäten
- [ ] Audit-Trigger

**M2.2 Auth**
- [ ] Argon2 Password Hashing
- [ ] JWT (RS256) Access (15 min) + Refresh (7 d) Rotation
- [ ] Login / Logout / Refresh Endpoints
- [ ] HttpOnly-Cookie für Refresh
- [ ] 2FA (TOTP) vorbereitet, in V1 aktiviert

**M2.3 RBAC**
- [ ] Permission-Engine (`{domain}.{action}`)
- [ ] NestJS Guards (`JwtGuard`, `PermissionGuard`)
- [ ] Standardrollen: `admin`, `family`, `child`, `guest`
- [ ] Custom Roles per Domain

**M2.4 User-UI**
- [ ] Login-Seite
- [ ] Profil-Seite (Name, Avatar, Passwort ändern)
- [ ] User-Liste (admin)
- [ ] Role-Editor (admin)
- [ ] Permission-Matrix (admin)

**Akzeptanz:**
- 4 Test-User mit 4 Rollen können sich einloggen
- Permission-Tests grün für alle 4 Rollen × alle Endpoints
- Audit-Log zeigt jede Login-Aktion

### Epic M3: Storage & Media Core

**M3.1 Storage-Abstraktion**
- [ ] `StorageService` Interface
- [ ] `LocalDiskStorage` (NAS-Mount)
- [ ] S3-Adapter-Stub (für V3)
- [ ] Signed-URL für Private Files

**M3.2 Media-Domain (Schema + Backend)**
- [ ] Schema `media.media_files`, `media.albums`, `media.media_sources`, `media.media_tags`
- [ ] `MediaService` (CRUD)
- [ ] EXIF-Extraktion (ExifTool im Worker)
- [ ] Thumbnail-Generierung (sharp)
- [ ] GPS-Extraktion
- [ ] BullMQ-Queue für asynchrone Verarbeitung

**M3.3 Media-API**
- [ ] `POST /media/upload` (multipart, chunked)
- [ ] `GET /media?cursor=&limit=&album=`
- [ ] `GET /media/:id`
- [ ] `DELETE /media/:id` (soft)
- [ ] `POST /albums`, `POST /albums/:id/items`
- [ ] `GET /media/timeline?from=&to=`
- [ ] `GET /media/map?bbox=&zoom=`

**M3.4 Media-UI**
- [ ] Galerie (Masonry-Grid)
- [ ] Lightbox mit Tastatur-Navigation
- [ ] Multi-Upload mit Progress
- [ ] Drag & Drop
- [ ] Album-View
- [ ] Timeline-View (Jahr/Monat/Tag)
- [ ] Map-View (Leaflet, OSM-Tiles)
- [ ] Globe-View (Three.js, optional in MVP)

**Akzeptanz:**
- 1000 Fotos Upload in <10 min
- Galerie rendert 1000 Items ohne Ruckeln
- Map zeigt alle GPS-Tags korrekt
- Timeline scrollt smooth
- Lightbox unterstützt J/K/Enter

### Epic M4: Dashboard

**M4.1 Layout-System**
- [ ] Dashboard-Layout persistieren (Drag & Drop)
- [ ] Widget-API
- [ ] Default-Widgets: Letzte Fotos, Kalender-Snippet, Wetter, Sparziele (Stub)

**M4.2 Standard-Widgets**
- [ ] `MediaWidget` (neueste 8 Fotos)
- [ ] `CalendarWidget` (nächste 3 Termine, ab V1 echt)
- [ ] `WeatherWidget` (Open-Meteo, kein API-Key)
- [ ] `SavingsWidget` (Stub bis V2)
- [ ] `ShoppingWidget` (Stub bis V1)

**Akzeptanz:** Dashboard lädt < 1s, Widgets per Drag umsortierbar, Layout wird pro User gespeichert.

### MVP-Release-Kriterien

- [ ] Stack läuft stabil 7 Tage Dauerbetrieb
- [ ] Backup + Restore funktioniert
- [ ] Dokumentation: README, INSTALL, USER-GUIDE (Login, Upload, Galerie)
- [ ] Security-Check: HTTPS, RBAC, Audit, keine Secrets im Klartext
- [ ] Performance: 4 parallele User ohne Degradation
- [ ] Familie ist eingeloggt, lädt erste Fotos hoch, lächelt

---

## 2. V1 — „Leben organisieren" (Phase 2)

**Ziel:** Reisen, Projekte, Rezepte, Einkaufslisten — die Module, die im Alltag täglich genutzt werden.

### Epic V1.1: Travel (Reisen)

- [ ] Schema `travel.trips`, `travel.destinations`, `travel.trip_days`
- [ ] Trip-CRUD + Cover-Image
- [ ] Trip-Detail als Landingpage
- [ ] Medien-Verknüpfung (referenziert, nicht kopiert)
- [ ] Tagesbasierte Timeline
- [ ] Karte mit Route (Leaflet Routing)
- [ ] Notizen (Markdown)
- [ ] Dokumenten-Anhänge

**Akzeptanz:** „Italien 2025" ist angelegt, 200 Fotos verknüpft, Route sichtbar, Familie kann es am TV via Tailscale anschauen.

### Epic V1.2: Projects (Hobbies)

- [ ] Schema `projects.projects`, `projects.project_files`, `projects.project_notes`
- [ ] Projekt-Typen: `3d_print`, `arduino`, `raspi`, `code`, `electronics`, `diy`
- [ ] Datei-Upload (STL, GCODE, Code, Bilder, PDFs)
- [ ] GitHub-Repo-Linking
- [ ] YouTube-Embed
- [ ] Markdown-Notizen mit Backlinks
- [ ] Status (`planning`, `building`, `done`, `archived`)

**Akzeptanz:** Smart-Mirror-Projekt hat STL, Code, YouTube-Tutorial, GitHub-Link und Notizen.

### Epic V1.3: Recipes (Rezepte)

- [ ] Schema `recipes.recipes`, `recipes.ingredients`, `recipes.steps`
- [ ] Rezept-CRUD mit Zutaten, Schritten, Bildern
- [ ] Portionen-Slider (skaliert Zutaten)
- [ ] YouTube-Embed
- [ ] Import von URL (Schema-org scraper)
- [ ] Tags, Kategorien, Nährwerte
- [ ] Rezept-Quellen (URL, Buch, Oma)

**Akzeptanz:** 50 Rezepte angelegt, Omas Rezeptbuch ist digitalisiert, YouTube-Koch-Videos eingebettet.

### Epic V1.4: Shopping (Einkaufslisten)

- [ ] Schema `shopping.shopping_lists`, `shopping.shopping_items`
- [ ] Mehrere Listen
- [ ] Live-Sync (WebSocket)
- [ ] „Auf Einkaufsliste" aus Rezept
- [ ] Mengen-Einheiten, Kategorien
- [ ] API vorbereitet für MorphCook (`/api/v1/shopping/sync`)

**Akzeptanz:** Familie kann live am Handy und am PC die Liste pflegen, Rezept erzeugt automatisch Einkaufsliste.

### Epic V1.5: Wiki (Wissensdatenbank)

- [ ] Schema `wiki.pages`, `wiki.page_links`, `wiki.tags`
- [ ] Markdown-Editor (CodeMirror oder TipTap)
- [ ] `[[Page-Name]]` Backlinks
- [ ] Tag-System
- [ ] Suche

**Akzeptanz:** Erste Familien-Wiki-Seiten existieren, Backlinks funktionieren, Suche findet alles.

### V1-Release-Kriterien

- [ ] Alle 4 Module im Alltag der Familie genutzt
- [ ] 500+ Rezept-Einträge, 20+ Reisen, 30+ Projekte
- [ ] Performance weiterhin < 1s bei 10k Items pro Domain
- [ ] Mobile-Nutzung mind. 50% des Traffics

---

## 3. V2 — „Sicher & Sensibel" (Phase 3)

**Ziel:** Finanzen, Versicherungen, Vault, Dokumente — sensible Daten mit starker Verschlüsselung.

### Epic V2.1: Finance

- [ ] Schema `finance.accounts`, `transactions`, `budgets`, `savings_goals`, `assets`
- [ ] Account-Management (Giro, Tagesgeld, Depot, KK, Bargeld)
- [ ] Manuelle + CSV-Import Buchungen
- [ ] Kategorien mit Icons
- [ ] Sparziele mit Fortschrittsbalken
- [ ] Spartöpfe (virtuelle Unterkonten)
- [ ] Portfolio-Tracking (Aktien, ETF, Anleihen, Krypto, Edelmetalle)
- [ ] Charts: Net Worth, Cashflow, Sparquote, Asset-Allocation (Donut)
- [ ] Manuelle Kurs-Updates (kein externer API-Zwang)

**Akzeptanz:** Alle Konten erfasst, 12 Monate Buchungen, Portfolio zeigt korrekte Allokation.

### Epic V2.2: Insurance

- [ ] Schema `insurance.insurance_policies`, `insurance_documents`
- [ ] Vertragsdaten (Gesellschaft, Nummer, Beitrag, Laufzeit, Kündigungsfrist)
- [ ] Ansprechpartner
- [ ] Dokumenten-Anhänge
- [ ] Beitragsübersicht (Jahr, Monat)
- [ ] Erinnerungen (Kalender-Hooks) für Kündigungsfristen

**Akzeptanz:** Alle Familienversicherungen erfasst, automatische Erinnerung 3 Monate vor Kündigungsfrist.

### Epic V2.3: Vault (Passwort-Manager)

- [ ] Schema `vault.vault_entries`, `vault.totp_secrets`, `vault.cards`
- [ ] AES-256-GCM Verschlüsselung (Schlüssel via Argon2 aus Master-Passwort)
- [ ] Zero-Knowledge-Design: Server sieht nie Klartext
- [ ] TOTP-Generator mit Auto-Countdown
- [ ] Card-Speicherung (verschlüsselt)
- [ ] Browser-Extension (V3) für Auto-Fill
- [ ] Passkey-Support (WebAuthn, V3)
- [ ] Import von Bitwarden/1Password/Chrome

**Akzeptanz:** Alle Familien-Passwörter migriert, TOTP funktioniert, mobile App kann Vault öffnen.

### Epic V2.4: Documents

- [ ] Schema `documents.documents`, `document_tags`, `document_ocr`
- [ ] Upload mit OCR (Tesseract Worker)
- [ ] Volltext-Suche
- [ ] Verschlagwortung
- [ ] Cross-Reference zu Insurance/Finance/Vault

**Akzeptanz:** Rechnungen der letzten 3 Jahre hochgeladen, per Stichwort in <2s auffindbar.

### V2-Release-Kriterien

- [ ] Vault wurde von mind. 2 externen Audits geprüft (Kosten: ca. 5–15k €)
- [ ] Backup funktioniert für verschlüsselte Vault-Daten
- [ ] Performance: Dashboard mit allen Finanzen-Modulen < 1.5s
- [ ] Alle sensiblen Daten mind. AES-256 at rest

---

## 4. V3 — „Erweitert" (Phase 4 + 5 + 6)

**Ziel:** Medien-Streaming, Kalender, Mobile, Plugin-System.

### Epic V3.1: Jellyfin-Integration

- [ ] Jellyfin-API-Adapter
- [ ] Library-Sync
- [ ] Watchstate-Sync bidirektional
- [ ] Poster-Backdrops in `media.jellyfin_items`
- [ ] Trailer-Embeds (YouTube)
- [ ] Watchlist
- [ ] „Weiterschauen"-Hero
- [ ] Fallback: direkter NAS-Scan wenn Jellyfin nicht läuft

**Akzeptanz:** Mediathek sieht aus wie Netflix, Watchstate synchron mit Jellyfin, Trailer laufen.

### Epic V3.2: Calendar

- [ ] Schema `calendar.events`, `calendar.calendars`
- [ ] Google Calendar OAuth2
- [ ] CalDAV (Baikal/Radicale) Sync
- [ ] ICS-Import
- [ ] Monat/Woche/Tag-Ansicht
- [ ] Familienkalender (Overlay)
- [ ] Geburtstage (aus Users)
- [ ] Erinnerungen (E-Mail, Push)

**Akzeptanz:** Familienkalender zeigt alle Termine aus 3 Google-Accounts.

### Epic V3.3: IT-Inventory

- [ ] Schema `it_inventory.devices`, `network_interfaces`, `device_credentials`
- [ ] Geräte-CRUD mit allen Feldern
- [ ] Netzwerk-Scan (nmap-Worker)
- [ ] Link zu Vault-Entries für Passwörter
- [ ] Garantie-Tracker
- [ ] Standort-Karte (welche Geräte wo)
- [ ] Geräte-Graph (welches Gerät hängt an welchem Switch)

**Akzeptanz:** Alle 47 Geräte im Haushalt erfasst, Scan findet 3 unbekannte Geräte, Vault-Links funktionieren.

### Epic V3.4: Search (global)

- [ ] Meilisearch-Indizes pro Domain
- [ ] `⌘K` globale Suche
- [ ] Filter-Chips
- [ ] Vorschau-Cards in Resultaten
- [ ] Indexer-Worker (lauscht auf Domain-Events)

**Akzeptanz:** `⌘K` + „Italien" findet Reise, Fotos, Dokumente in <200ms.

### Epic V3.5: Mobile Apps

- [ ] MorphCook-Integration (Einkaufslisten-Sync)
- [ ] Native Android-App (Kotlin) oder PWA-Progressiv
- [ ] Native iOS-App (Swift) oder PWA
- [ ] Push-Benachrichtigungen
- [ ] Offline-Modus für Vault (read-only)

**Akzeptanz:** MorphCook kann mit LifeHub-Sharing synchronisieren, PWA ist installierbar.

### Epic V3.6: Plugin-System

- [ ] Plugin-Manifest (YAML)
- [ ] Sandboxed Plugin-Runtime (Node.js Worker oder WASM)
- [ ] Permission-System für Plugins
- [ ] UI-Slot-API (Sidebar-Einträge, Widgets, Routen)
- [ ] Event-Hooks (lifecycle)
- [ ] Plugin-Marketplace (lokal)
- [ ] Offizielle Plugins: Home Assistant Bridge, KI-Assistent, Fahrzeug-Management

**Akzeptanz:** Home-Assistant-Plugin installiert, steuert Lichter aus LifeHub-Dashboard.

### V3-Release-Kriterien

- [ ] 95% der geplanten Features ausgeliefert
- [ ] Plugin-System hat mind. 1 Community-Plugin
- [ ] Mobile App ≥ 4.5★ Store-Rating (falls veröffentlicht)
- [ ] System skaliert auf 10 Familien-Nutzer ohne Performance-Verlust

---

## 5. Querschnitts-Epics (laufen permanent)

### QE-1: Security Hardening
- [ ] Passkeys (WebAuthn)
- [ ] Hardware-Token-Support
- [ ] Audit-Log mit HMAC-Chain
- [ ] Rate-Limiting
- [ ] CSP, HSTS, alle Header
- [ ] Dependency-Audits in CI

### QE-2: Observability
- [ ] Pino → Loki
- [ ] Prometheus + Grafana
- [ ] OpenTelemetry → Tempo
- [ ] Sentry (self-hosted)
- [ ] Alerting (Grafana → Signal/Telegram)

### QE-3: Backup & DR
- [ ] Tägliche Postgres-Dumps
- [ ] Inkrementelle File-Backups (restic)
- [ ] Offsite-Replikation
- [ ] Wiederherstellungs-Test quartalsweise
- [ ] Dokumentierter Disaster-Recovery-Plan

### QE-4: Performance
- [ ] Lighthouse ≥ 90 auf allen Hauptrouten
- [ ] LCP < 2.5s, CLS < 0.1
- [ ] DB-Query-Analyse pro Domain
- [ ] Read-Replica bei Bedarf

### QE-5: Internationalisierung (optional V3)
- [ ] `next-intl` Setup
- [ ] Deutsch + Englisch
- [ ] UI-Sprache pro User
- [ ] Datums-/Zahlen-Format pro Locale

---

## 6. Technische Schulden & bewusste Aufschieber

- Gesichtserkennung (Phase V3+)
- KI-Assistent (V3, optional)
- Sprachsteuerung (V4+)
- Mobile-Native (V3, optional PWA-first)
- Multi-Instance (mehrere Familien parallel, V4+)
- Federation zwischen LifeHub-Instanzen (V4+, „Friends of Family")

---

## 7. Release-Plan (Kalender-Sicht)

```
Monat  1  2  3  4  5  6  7  8  9 10 11 12
MVP    ████████████████░░░░░░░░░░░░░░░░░░░░
V1     ░░░░░░░░░░██████████████████░░░░░░░░
V2     ░░░░░░░░░░░░░░░░░░████████████░░░░░░
V3     ░░░░░░░░░░░░░░░░░░░░░░░░██████████████

(Phase 0 Foundation läuft in Monat 1 mit MVP-Start)
```

---

## 8. Definition of Done (global)

Eine Welle gilt als ausgeliefert, wenn:

- Alle geplanten Epics abgenommen (Akzeptanzkriterien grün)
- Performance-Budgets eingehalten
- Security-Checkliste durchgegangen
- Backup funktioniert und getestet
- Dokumentation aktualisiert
- Familie/Tester haben 2 Wochen live genutzt ohne P0/P1-Bugs
- Migration-Script von vorheriger Version existiert
