# Browser-Block Architektur-Review — Vollständige technische Dokumentation

Version: 1.0
Domain: Pages / Browser
Erstellt: 2026-07-10
Git Commit: deaa206
Status: Review abgeschlossen — Ready for Implementation Planning

---

# Review-Metadaten

| Feld | Wert |
|------|------|
| Datum | 2026-07-10 |
| Git Commit | deaa206 |
| Reviewer | Lead Software Architect (Orchestrator) |
| Analysierte Code-Dateien | 12 |
| Analysierte Doku-Dateien | 13 |
| Subagent-Analysen | 5 (Backend, Sicherheit, Frontend, Block-System, Doku) |
| Review-Typ | Vollständiges Architektur-, Code- und Funktionsreview |

---

# 1. Executive Summary

## Bewertung

Der Browser-Block in LifeHub ist **nicht produktionsreif** und eignet sich **nicht für echtes Internet-Browsing**. Die aktuelle Implementierung besteht aus **zwei separaten, sich widersprechenden Browser-Lösungen**, die beide fundamentale Sicherheits-, Architektur- und Funktionslücken aufweisen.

**Reifegrad: 2/10 — Prototyp-Stadium**

## Kernproblem

Es existieren **zwei völlig unterschiedliche Browser-Implementierungen** mit unterschiedlichen Proxy-Pfaden, unterschiedlichen Rendering-Strategien und unterschiedlichen Sicherheitsprofilen:

| Implementierung | Proxy-Pfad | Rendering | Auth | Einsatzort |
|----------------|------------|----------|------|------------|
| Standalone-Seite | `/browser/proxy` | Chrome/Puppeteer (JS-Ausführung) | ❌ Keine | `/(dashboard)/browser/page.tsx` |
| ResearchWorkspaceBlock | `/proxy` | Direkter `fetch()` (kein JS) | ❌ Keine | `/(dashboard)/pages/components/blocks/ResearchWorkspaceBlock.tsx` |

Keine dieser Implementierungen ist ein eigenständiger Block-Typ im Sinne der Zielarchitektur. Der Browser ist aktuell ein Unter-Tab des Research-Workspace-Blocks — nicht der geforderte modulare `browser_embed`-Block.

## Kritischste Erkenntnisse

1. **3 kritische Sicherheitslücken** (CVSS 8.5–9.1): Fehlende Auth, SSRF, Chrome ohne Sandbox
2. **Kein `browser_embed` Block-Typ** im Code definiert — nur in der Doku
3. **Keine Session-Isolation** zwischen Browser-Blöcken — widerspricht der Zielarchitektur fundamental
4. **Kein State-Management**: History, Cookies, Bookmarks, Settings gehen beim Reload verloren
5. **Puppeteer-Microservice ohne Session-Management, ohne Concurrency-Limit, ohne Memory-Management**
6. **13 Dokumente mit 11 Widersprüchen** zur tatsächlichen Implementierung

## Empfehlung

Der Browser muss **komplett neu architektiert** werden. Inkrementelle Fixes des aktuellen Codes sind nicht wirtschaftlich. Es wird ein **5-Phasen-Implementierungsplan** mit 8 unabhängigen Aufgabenpaketen empfohlen (siehe §16).

---

# 2. Architekturübersicht

## 2.1 Ist-Architektur (aktuell implementiert)

```text
┌─────────────────────────────────────────────────────────────┐
│ Frontend (Next.js 14)                                       │
│                                                             │
│  ┌──────────────────────┐   ┌─────────────────────────────┐ │
│  │ /browser/page.tsx    │   │ /pages/[slug]/page.tsx      │ │
│  │ (Standalone)         │   │  └─ ResearchWorkspaceBlock  │ │
│  │                      │   │      └─ Browser Tab         │ │
│  │ iframe → /proxy      │   │ iframe → /proxy             │ │
│  │   (browser/proxy)    │   │   (proxy, kein Chrome)      │ │
│  └──────────┬───────────┘   └──────────┬──────────────────┘ │
│             │                           │                    │
└─────────────┼───────────────────────────┼────────────────────┘
              │                           │
              ▼                           ▼
┌─────────────────────────────────────────────────────────────┐
│ Backend (NestJS)                                            │
│                                                             │
│  BrowserController        ProxyController                   │
│  (/browser/proxy)         (/proxy)                          │
│  GET/POST proxy           GET/POST proxy                    │
│  GET screenshot           (direkter fetch, kein Chrome)     │
│  (→ chrome:3000/content)                                    │
│                                                             │
│  PagesController (Browser-Tabs CRUD)                        │
│  /pages/.../tabs  (mit JwtGuard, aber ohne Owner-Prüfung)   │
│                                                             │
│  ⚠️ Kein BrowserController hat Auth-Guards!                 │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ Infrastructure (Docker)                                     │
│                                                             │
│  chrome (Puppeteer)     searxng                             │
│  Port 3111              Port 3121                           │
│  --no-sandbox           frame-ancestors *                   │
│  SYS_ADMIN              secret_key: hardcoded               │
│  Keine Auth             Keine Auth                          │
│  CORS: *                CORS: *                             │
└─────────────────────────────────────────────────────────────┘
```

## 2.2 Soll-Architektur (Ziel)

```text
┌─────────────────────────────────────────────────────────────┐
│ Frontend (Next.js 14)                                       │
│                                                             │
│  /pages/[slug]/page.tsx                                     │
│  └─ BlockEditor                                            │
│      ├─ TextBlock, HeadingBlock, ...                        │
│      ├─ BrowserBlock (eigenständiger Block-Typ)             │
│      │   ├─ Eigene Session (sessionId)                      │
│      │   ├─ Eigene Tabs[]                                   │
│      │   ├─ Eigene History[]                                │
│      │   ├─ Eigene Bookmarks[]                              │
│      │   ├─ Eigene Settings{}                               │
│      │   └─ iframe (sandboxed, isolated)                    │
│      └─ ResearchWorkspaceBlock (optional, nutzt BrowserBlock)│
│                                                             │
│  ⛔ Keine Standalone /browser-Seite mehr                    │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ Backend (NestJS)                                            │
│                                                             │
│  BrowserController (mit JwtGuard + PermissionGuard)         │
│  /browser/:blockId/session   → Session-State                │
│  /browser/:blockId/tabs      → Tabs CRUD                    │
│  /browser/:blockId/history   → Navigation History           │
│  /browser/:blockId/bookmarks → Bookmarks CRUD               │
│  /browser/proxy              → Proxy (mit SSRF-Schutz)      │
│  /browser/screenshot         → Screenshot (rate-limited)    │
│                                                             │
│  SSRF-Guard (IP-Blocklist, Allowlist)                       │
│  Rate-Limiter                                               │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ Infrastructure (Docker)                                     │
│                                                             │
│  chrome (Puppeteer)                searxng                  │
│  Port 3111 (intern only)           Port 3121 (intern only)  │
│  --sandbox (seccomp profile)        frame-ancestors: self   │
│  Session-Pool (max 10 contexts)     Auth via API-Key        │
│  Memory-Limit: 512MB/Page          CORS: LifeHub origin     │
│  Concurrency-Queue                                         │
└─────────────────────────────────────────────────────────────┘
```

## 2.3 Komponenten-Übersicht

| Komponente | Datei | Zeilen | Status |
|------------|-------|--------|--------|
| Standalone Browser-Seite | `apps/frontend/src/app/(dashboard)/browser/page.tsx` | 199 | ⚠️ Prototyp |
| ResearchWorkspaceBlock | `apps/frontend/src/app/(dashboard)/pages/components/blocks/ResearchWorkspaceBlock.tsx` | 672 | ⚠️ Prototyp |
| Block-Registry | `apps/frontend/src/lib/blockRegistry.ts` | 299 | ⚠️ Alle Komponenten `null` |
| BlockHandle | `apps/frontend/src/app/(dashboard)/pages/components/BlockHandle.tsx` | 185 | ⚠️ Kein Browser-Typ |
| Browser Controller | `domains/pages/src/api/browser.controller.ts` | 116 | 🔴 Keine Auth, SSRF |
| Proxy Controller | `domains/pages/src/api/proxy.controller.ts` | 59 | 🔴 Keine Auth, SSRF |
| Pages Controller | `domains/pages/src/api/pages.controller.ts` | 448 | ⚠️ Browser-Tabs ohne Owner-Check |
| Pages Service | `domains/pages/src/services/pages.service.ts` | 777 | ⚠️ Browser-Tabs ohne Owner-Check |
| Pages Repository | `domains/pages/src/repositories/pages.repository.ts` | 624 | ⚠️ Race Condition |
| DB-Schema | `shared/db/src/schema/public.ts` | 823 | ⚠️ Keine Browser-Session-Tabelle |
| Puppeteer Service | `infrastructure/browser-renderer/server.js` | 211 | 🔴 Sicherheitsrisiko |
| SearXNG Config | `infrastructure/searxng/settings.yml` | 30 | ⚠️ Hardcoded Secret |
| Docker Compose | `docker-compose.yml` | 120 | ⚠️ SYS_ADMIN, Ports exponiert |

---

# 3. Positiv bewertete Bereiche

Trotz der vielen Probleme gibt es solide Fundamente, auf denen aufgebaut werden kann:

## 3.1 Block-System-Architektur (Konzept)
- **JSONB-Speicherung** ist flexibel genug für beliebige Block-Typen inkl. Browser
- **Versionierung** (Block-Versionen, Page-Versionen) ist bereits implementiert
- **Block-Registry-Pattern** ist sauber konzipiert (Map-basiert, Kategorie-Support)
- **Permissions-System** (RBAC mit Page/Block-Level Overrides) existiert

## 3.2 Backend-Struktur
- **PagesService** hat saubere Trennung: Controller → Service → Repository
- **Events-System** (`PageCreated`, `BlockUpdated`, etc.) ist vorhanden
- **Zod-Validierung** für DTOs ist durchgängig implementiert
- **TanStack Query** im Frontend für effizientes Data-Fetching
- **Import/Export** (JSON + Markdown) ist funktional

## 3.3 Research-Workspace
- **Session-Konzept** (Seiten-gebundene Recherchen) ist gut durchdacht
- **Quellen-Management** (pinnen, kategorisieren, collections) ist nützlich
- **4-Tab-Layout** (Sources, Collections, Notes, Browser) ist pragmatisch

## 3.4 Notion-Editor
- **TipTap-Integration** mit Slash-Commands ist implementiert
- **Drag & Drop** (@dnd-kit) für Block-Reordering
- **BlockHandle** mit Dropdown-Menü (Typ ändern, Duplizieren, Löschen)
- **Breadcrumbs** und **PageHeader** sind vorhanden

## 3.5 Dokumentation
- **Umfassende Doku-Struktur** (DOX-Hierarchie mit AGENTS.md-Kette)
- **Klare Architektur-Vision** (PAGE_SYSTEM_VISION.md)
- **ADR (Architecture Decision Records)** für wichtige Entscheidungen

---

# 4. Kritische Probleme

## K-01: Fehlende Auth-Guards auf Browser- und Proxy-Controller
- **Datei**: `domains/pages/src/api/browser.controller.ts` (gesamte Datei)
- **Datei**: `domains/pages/src/api/proxy.controller.ts` (gesamte Datei)
- **CVSS**: 9.1
- **Beschreibung**: Weder `BrowserController` noch `ProxyController` haben `@UseGuards(JwtGuard, PermissionGuard)`. Der `PagesController` im selben Modul (Zeile 24) hat diese Guards korrekt. Jeder, der die Endpunkte kennt (inkl. unauthentifizierte Tailscale-Clients), kann den Proxy nutzen.
- **Auswirkung**: Unbegrenzter Zugriff auf Rendering-Infrastruktur, SSRF, Bandbreiten-Missbrauch
- **Lösung**: `@UseGuards(JwtGuard, PermissionGuard)` + `@RequirePermission('pages', 'read')` auf beiden Controllern

## K-02: SSRF (Server-Side Request Forgery)
- **Datei**: `browser.controller.ts:10,51,93`, `proxy.controller.ts:8,20`
- **CVSS**: 9.0
- **Beschreibung**: Beide Controller akzeptieren beliebige URLs via `@Query('url')`. Einzige Prüfung: `url.startsWith('http')`. Keine IP-Blocklist für private Ranges.
- **Auswirkung**: Angreifer können interne Dienste abfragen: PostgreSQL (`localhost:5432`), Redis (`localhost:6379`), Meilisearch (`localhost:7700`), Cloud-Metadaten (`169.254.169.254`), den Chrome-Service selbst (`chrome:3000`)
- **Lösung**: URL-Validierung mit DNS-Auflösung + IP-Blocklist (RFC 1918, Loopback, Link-Local, Metadata)

## K-03: Chrome ohne Sandbox + SYS_ADMIN
- **Datei**: `infrastructure/browser-renderer/server.js:12-16`, `docker-compose.yml:99`
- **CVSS**: 8.5
- **Beschreibung**: Puppeteer startet Chrome mit `--no-sandbox`, `--disable-setuid-sandbox`, `--single-process`. Docker Compose gibt `cap_add: SYS_ADMIN`.
- **Auswirkung**: Bösartige gecrawlte Webseiten können potenziell den Container kompromittieren (Container-Escape)
- **Lösung**: Chrome mit Sandbox + seccomp-Profile statt `--no-sandbox`; `SYS_ADMIN` entfernen

## K-04: Kein `browser_embed` Block-Typ im Code
- **Datei**: `blockRegistry.ts`, `pages.ts:19-25`, `pages.dto.ts:37-44`
- **Beschreibung**: Der dokumentierte `browser_embed` Block-Typ existiert in keiner Code-Datei. Weder im Frontend (Block-Registry, BlockHandle, SlashMenu) noch im Backend (Entity, DTO, Zod-Schema). Der Browser ist nur als Unter-Tab des Research-Workspace-Blocks erreichbar.
- **Auswirkung**: Die Zielarchitektur (eigenständiger moduler Browser-Block) ist nicht umgesetzt
- **Lösung**: Neuer Block-Typ `browser_embed` in Registry, Entity, DTO, Zod-Schema und BlockHandle

## K-05: Keine Session-Isolation zwischen Browser-Blöcken
- **Datei**: DB-Schema `public.ts:604-617`, `ResearchWorkspaceBlock.tsx:78-82`
- **Beschreibung**: Browser-Tabs sind an `researchSessions` gebunden, nicht an Block-IDs. History liegt im `useState` der React-Komponente (geht beim Reload verloren). Keine Cookies, Bookmarks oder Settings pro Block. Puppeteer teilt sich einen globalen Browser mit shared state.
- **Auswirkung**: Mehrere Browser-Blöcke auf einer Page beeinflussen sich gegenseitig. Zielarchitektur fordert explizit vollständige Isolation.
- **Lösung**: Eigene `browser_sessions`-Tabelle, blockId-Referenz, History/Cookies/Bookmarks/Settings als JSONB-Felder

## K-06: Race Condition bei Tab-Aktivierung
- **Datei**: `pages.repository.ts:614-623`
- **Beschreibung**: `setActiveBrowserTab` führt zwei `db.update()` ohne Transaktion aus. Bei parallelen Requests können mehrere Tabs gleichzeitig `isActive=true` haben oder kein Tab aktiv sein.
- **Auswirkung**: Inkonsistenter UI-State, falsch aktive Tabs
- **Lösung**: `db.transaction()` um beide Updates

---

# 5. Mittlere Probleme

## M-01: CSP extrem aufgeweicht
- **Datei**: `browser.controller.ts:45,86`, `proxy.controller.ts:55`
- **Beschreibung**: `default-src 'self' 'unsafe-inline' 'unsafe-eval' https: http: data: blob:; frame-ancestors *;`
- **Problem**: `unsafe-inline` + `unsafe-eval` machen XSS-Schutz wirkungslos; `frame-ancestors *` erlaubt Clickjacking von jeder Domain; `http:` erlaubt Mixed Content

## M-02: X-Frame-Options explizit entfernt
- **Datei**: `browser.controller.ts:44,85`, `proxy.controller.ts:54`
- **Beschreibung**: `res.removeHeader('X-Frame-Options')` entfernt den von helmet gesetzten Schutz

## M-03: iframe sandbox mit `allow-top-navigation`
- **Datei**: `browser/page.tsx:181`
- **Beschreibung**: `sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-top-navigation"` — `allow-top-navigation` erlaubt dem iframe, die Parent-Seite (LifeHub) zu navigieren (Phishing-Risiko). `allow-same-origin` + `allow-scripts` zusammen können die Same-Origin-Policy umgehen.

## M-04: Puppeteer-Service ohne Auth, CORS *, Port exponiert
- **Datei**: `server.js:126`, `docker-compose.yml:94-95`
- **Beschreibung**: Port 3111 ist nach außen exponiert, CORS `*`, keine Auth. Jeder im Netzwerk kann den Service nutzen.

## M-05: Kein Owner-Check bei Browser-Tab-Operationen
- **Datei**: `pages.controller.ts:414-446`, `pages.service.ts:521-550`
- **Beschreibung**: Alle 5 Browser-Tab-Endpunkte akzeptieren keinen `@CurrentUser()`. User A kann Tabs von User B erstellen, ändern, löschen, aktivieren.

## M-06: Regex-basiertes URL-Rewriting (3x dupliziert)
- **Datei**: `browser.controller.ts:36-41`, `proxy.controller.ts:40-51`, `server.js:152-158`
- **Beschreibung**: Identische Regex-Logik zur URL-Umschreibung in 3 Dateien. Erfasst keine dynamischen URLs, SPAs, HTML-Entities, Template-Literale. Wartungsproblem.

## M-07: Memory-Leaks im Puppeteer-Service
- **Datei**: `server.js:30-31,121-206`
- **Beschreibung**: Kein Page-Pool, kein Concurrency-Limit, kein Browser-Recycling. Jeder Request erzeugt eine neue Page. Unter Last → OOM.

## M-08: Kein try/catch in Browser/Proxy-Controller
- **Datei**: `browser.controller.ts` (gesamte Datei)
- **Beschreibung**: Chrome-Fehler (Timeout, ungültige Antwort) crashen den Endpunkt ohne sinnvolle Fehlermeldung.

## M-09: POST-Rendering funktioniert nicht im Puppeteer-Service
- **Datei**: `server.js:103-108`
- **Beschreibung**: POST-Daten werden als Header gesetzt, aber dann `page.goto()` (GET) aufgerufen. POST ist faktisch nicht implementiert.

## M-10: Hardcoded Ports im Frontend
- **Datei**: `browser/page.tsx:7`, `ResearchWorkspaceBlock.tsx:73-74`
- **Beschreibung**: `http://${window.location.hostname}:3007` ist hardcoded. Nicht konfigurierbar, bricht bei Reverse-Proxy/Ingress.

---

# 6. Kleine Probleme

| # | Problem | Datei:Zeile | Beschreibung |
|---|---------|-------------|--------------|
| K-01 | SearXNG secret_key hardcoded | `settings.yml:22` | `"lifehub_searxng_secret_change_me"` |
| K-02 | `headless: 'new'` veraltet | `server.js:10` | Puppeteer 22+ nutzt `headless: true` |
| K-03 | Kein Soft-Delete für browser_tabs | `public.ts:610-612` | Hard-Delete, inkonsistent mit pages/pageBlocks |
| K-04 | Screenshot ohne Resource-Blocking | `server.js:170-196` | Lädt alle Ressourcen, langsam |
| K-05 | Notes-Update ohne Debounce | `ResearchWorkspaceBlock.tsx:651` | Jedes Zeichen löst API-Call aus |
| K-06 | Navigation-Interception invasiv | `server.js:46-101` | Patched `history.pushState`, `location`, Event-Listener |
| K-07 | Kein `favicon`-Loading | `ResearchWorkspaceBlock.tsx` | Tab-Title zeigt URL, kein Favicon |
| K-08 | `createBrowserTab` ohne Session-Check | `pages.service.ts:527` | FK-Constraint fängt ab, aber DB-Rohfehler |
| K-09 | `err.message` an Client | `server.js:164,192` | Information Disclosure (Pfade, Stack-Traces) |
| K-10 | Keine `scrollPosition`-Persistenz | DB-Schema | Scroll-Position geht verloren |

---

# 7. Fehlende Funktionen

## 7.1 Kernfunktionen (fehlend)

| Funktion | Soll-Zustand | Ist-Zustand | Priorität |
|----------|-------------|-------------|-----------|
| Eigenständiger Browser-Block | `browser_embed` Block-Typ | Nicht implementiert | 🔴 P0 |
| Session pro Block | Eigene Session pro BrowserBlock | Global/keine | 🔴 P0 |
| Tabs pro Block | Eigene Tabs pro Block | An Research-Session gebunden | 🔴 P0 |
| History (Chronik) | JSONB persistiert | `useState` (flüchtig) | 🔴 P1 |
| Cookies | Isoliert pro Block | Nicht vorhanden | 🟡 P1 |
| Bookmarks | CRUD pro Block | Nicht vorhanden | 🟡 P2 |
| Settings | Pro Block (Zoom, UA, etc.) | Nicht vorhanden | 🟡 P2 |
| Downloads | Mit Page-Association | Nicht vorhanden | 🟢 P3 |
| DevTools | Integriert | Nicht vorhanden | 🟢 P4 |
| Split View | Mehrere Browser nebeneinander | Nicht vorhanden | 🟢 P4 |
| Extensions | Plugin-System | Nicht vorhanden | 🟢 P4 |

## 7.2 Browser-Funktionen (fehlend)

| Funktion | Soll | Ist |
|----------|------|-----|
| URL-Autovervollständigung | ja | nein |
| Suchmaschinen-Integration | SearXNG als Default | SearXNG läuft, aber nicht integriert |
| Favicon-Anzeige | ja | nein |
| Zoom | einstellbar | nein |
| Print/PDF | ja | nein |
| Fullscreen | ja | nein |
| Inkognito-Modus | optional | nein |
| Web-Inspector | ja | nein |

---

# 8. Sicherheitsprobleme (Zusammenfassung)

> Vollständige Sicherheitsanalyse: `docs/SECURITY_ANALYSIS_BROWSER.md`

## 8.1 Bedrohungsmodell

| Bedrohung | Wahrscheinlichkeit | Impact | Risiko |
|-----------|-------------------|--------|--------|
| Unauthentifizierter Proxy-Zugriff | Hoch (Tailscale-Netzwerk) | Hoch | 🔴 Kritisch |
| SSRF auf interne Dienste | Mittel | Kritisch | 🔴 Kritisch |
| Container-Escape via Chrome | Niedrig | Katastrophal | 🔴 Hoch |
| Clickjacking via frame-ancestors * | Mittel | Mittel | 🟡 Mittel |
| XSS via unsafe-inline/eval | Mittel | Hoch | 🟡 Mittel |
| Cross-User Tab-Manipulation | Niedrig | Hoch | 🟡 Mittel |
| Information Disclosure (err.message) | Hoch | Niedrig | 🟢 Klein |

## 8.2 Sicherheits-Empfehlungen (priorisiert)

### Sofort (P0)
1. `@UseGuards(JwtGuard, PermissionGuard)` auf beide Controller
2. SSRF-Schutz: URL-Validierung + IP-Blocklist
3. Chrome-Sandbox aktivieren (`--no-sandbox` entfernen)
4. Ports 3111, 3121 nicht nach außen exponieren (nur intern)

### Mittelfristig (P1)
5. CSP strikt konfigurieren (Nonce-basiert, kein `unsafe-inline`)
6. `frame-ancestors 'self'` statt `*`
7. iframe `sandbox` ohne `allow-top-navigation`
8. Owner-Validierung bei allen Browser-Tab-Operationen
9. Rate-Limiting für Proxy/Screenshot

### Langfristig (P2)
10. Cookie-Isolation pro Browser-Block
11. Content-Security-Policy-Report-Only zum Testen
12. Audit-Logging für Browser-Aktivitäten
13. SearXNG secret_key aus Environment-Variable

---

# 9. Performanceprobleme

## 9.1 Puppeteer-Service

| Problem | Auswirkung | Lösung |
|---------|-----------|--------|
| Kein Concurrency-Limit | OOM bei parallelen Requests | Page-Pool (max 10) + Queue |
| Kein Browser-Recycling | Memory-Leak über Zeit | Neustart nach N Requests |
| Kein Caching | Jede URL wird neu gerendert | Response-Cache (TTL-basiert) |
| `waitTimeout: 30000` + 2s sleep | 32s pro Request | Progressives Loading |
| Kein Resource-Blocking bei Screenshot | Lädt alle Ressourcen | Media/Font blocken |

## 9.2 Frontend

| Problem | Auswirkung | Lösung |
|---------|-----------|--------|
| iframe `key={currentUrl}` | Re-Render bei jeder Navigation | Key stabiler halten |
| Notes-Update ohne Debounce | API-Spam bei Tippen | `useDebounce` oder `setTimeout` |
| Keine Lazy-Loading von Browser-Block | Alle Browser-Blöcke sofort geladen | Intersection Observer |
| Keine Virtualisierung bei vielen Tabs | DOM-Wachstum | Tab-List virtualisieren |

## 9.3 Backend

| Problem | Auswirkung | Lösung |
|---------|-----------|--------|
| `setActiveBrowserTab` ohne Transaktion | Race Condition | `db.transaction()` |
| Keine Pagination bei Tab-Listen | Unbegrenzte Result-Sets | `LIMIT/OFFSET` |
| Kein Connection-Pooling zu Chrome | Verbindungsaufbau pro Request | Keep-Alive / Pool |

---

# 10. UI/UX-Probleme

## 10.1 Standalone Browser-Seite (`/browser`)

| Problem | Beschreibung |
|---------|--------------|
| Kein echter Lade-Indikator | `setTimeout(3000)` als Fake-Loading — lädt nie wirklich fertig |
| Keine Fehleranzeige bei Proxy-Fehlern | `onError` setzt Error, aber iframe lädt trotzdem |
| Keine Tab-Unterstützung | Nur ein Fenster, keine Tabs |
| Keine Adress-Autovervollständigung | Manuelle URL-Eingabe |
| History nur im Memory | Nach Reload weg |
| Kein Dunkelmodus für iframe | iframe immer hell (außer externe Seite hat Dark Mode) |
| `allow-top-navigation` | iframe kann Parent-Seite navigieren (ungewollt) |

## 10.2 ResearchWorkspaceBlock Browser-Tab

| Problem | Beschreibung |
|---------|--------------|
| Browser nur als 1 von 4 Tabs | Nicht direkt als Block sichtbar |
| Keine Bookmarks/Lesezeichen | URLs müssen manuell als "Quelle" gepinnt werden |
| Keine Favicon-Anzeige | Tabs zeigen nur Text |
| Kein Zoom | Feste Größe |
| Kein "Als Startseite festlegen" | Keine Default-URL pro Block |
| URL-Bar zeigt rohe URL | Keine Pretty-URLs |
| Kein Progressiver Ladebalken | Nutzer weiß nicht, wann Seite fertig ist |
| Neue Tabs ohne automatische Navigation | "+" erstellt leeren Tab, navigiert nicht automatisch |

## 10.3 Konsistenz

| Problem | Beschreibung |
|---------|--------------|
| Zwei verschiedene Browser-UIs | Standalone vs. Block — inkonsistente UX |
| Unterschiedliche Proxys | `/browser/proxy` vs `/proxy` — unterschiedliche Rendering-Qualität |
| Keine einheitliche Toolbar | Standalone hat `ExternalLink`, Block hat `Pin` + `ExternalLink` |

---

# 11. Wartbarkeit

## 11.1 Code-Duplikation

| Duplikat | Dateien | Aufwand zur Konsolidierung |
|----------|---------|---------------------------|
| URL-Rewriting Regex | `browser.controller.ts:36-41`, `proxy.controller.ts:40-51`, `server.js:152-158` | Mittel |
| CSP-Header setzen | `browser.controller.ts:45-47`, `proxy.controller.ts:55-57` | Gering |
| X-Frame-Options entfernen | `browser.controller.ts:44`, `proxy.controller.ts:54` | Gering |
| URL-Normalisierung | `browser/page.tsx:19-24`, `ResearchWorkspaceBlock.tsx:196-203` | Gering |
| Browser-History-Logic | `browser/page.tsx:14-15,30-43`, `ResearchWorkspaceBlock.tsx:78-81,205-261` | Mittel |
| Proxy-URL-Builder | `browser/page.tsx:26-28`, `ResearchWorkspaceBlock.tsx:72-75` | Gering |

## 11.2 Technische Schulden

| Schuld | Impact | Zins |
|--------|--------|------|
| Alle Block-Komponenten sind `null` | Keine echte Block-Registry | Jede Feature-Erweiterung muss das Rad neu erfinden |
| Keine einheitliche Browser-API | 2 Proxy-Pfade, 2 Rendering-Strategien | Jede Änderung muss an 2+ Stellen erfolgen |
| Keine Browser-Tests | Keine Qualitätssicherung | Regressionen bei jeder Änderung |
| Hardcoded Ports | Keine Flexibilität | Bricht bei Reverse-Proxy-Setup |
| Kein TypeScript im Renderer | `server.js` ist Plain-JS | Keine Type-Safety, IDE-Support |

## 11.3 Wartungs-Empfehlungen

1. **Zentrale Proxy-Logik** in einem Service extrahieren (`BrowserProxyService`)
2. **TypeScript für Renderer** (`server.ts` statt `server.js`)
3. **Shared Utility für URL-Rewriting** (ein Modul, drei Konsumenten)
4. **Einheitliche Browser-Komponente** (BrowserBlock nutzt BrowserCore, nicht eigene Implementierung)
5. **Playwright statt Puppeteer** überdenken (bessere API, Session-Management, TypeScript-native)

---

# 12. Erweiterbarkeit

## 12.1 Bewertung der Plugin-Fähigkeit

| Kriterium | Bewertung | Begründung |
|-----------|-----------|------------|
| Neuer Block-Typ hinzufügbar | ⚠️ Ja, aber | Backend akzeptiert beliebiges JSONB, aber Zod-Schema muss erweitert werden |
| Browser als eigenständiger Block | ❌ Nein | Kein `browser_embed` in Code; Browser ist in ResearchWorkspaceBlock eingebettet |
| Features pro Block konfigurierbar | ❌ Nein | Keine Settings/Props pro Browser-Block |
| Mehrere Browser-Blöcke pro Page | ⚠️ Theoretisch | ResearchWorkspaceBlock kann mehrfach hinzugefügt werden, aber keine Isolation |
| Downloads | ❌ Nein | Keine Download-Infrastruktur |
| Extensions | ❌ Nein | Keine Plugin-Schnittstelle |
| DevTools | ❌ Nein | Keine Integration |
| Split View | ❌ Nein | Keine Layout-Unterstützung |

## 12.2 Erweiterungs-Roadmap

```text
Phase 1 (MVP):     browser_embed Block-Typ + Basis-Browser + Session-Isolation
Phase 2 (Core):    History + Bookmarks + Settings + Downloads
Phase 3 (Enhanced): Tabs + Split View + Favicon + Search-Engine-Integration
Phase 4 (Pro):     DevTools + Extensions + Annotation + Web-Clipping
```

---

# 13. Risiken

| Risiko | Wahrscheinlichkeit | Impact | Risiko-Level | Mitigation |
|--------|-------------------|--------|--------------|------------|
| SSRF-Angriff auf interne Dienste | Hoch | Kritisch | 🔴 Sehr Hoch | IP-Blocklist sofort implementieren |
| Container-Escape via Chrome | Niedrig | Katastrophal | 🔴 Hoch | Sandbox aktivieren, seccomp |
| OOM durch Puppeteer | Hoch | Hoch | 🔴 Hoch | Concurrency-Limit, Memory-Limit |
| Datenleck durch fehlende Auth | Mittel | Hoch | 🟡 Mittel-Hoch | Auth-Guards setzen |
| Cross-User Datenmanipulation | Niedrig | Hoch | 🟡 Mittel | Owner-Checks implementieren |
| Brechen von Webseiten durch URL-Rewriting | Hoch | Niedrig | 🟡 Mittel | AST-basiertes Rewriting statt Regex |
| Veraltete Puppeteer-Version | Mittel | Mittel | 🟡 Mittel | Upgrade auf aktuelle Version |
| Tailscale-Netzwerk-Exposition | Hoch | Mittel | 🟡 Mittel | Ports nur intern exponieren |

---

# 14. Technische Schulden

## 14.1 Code-Level

| Schuld | Aufwand | Priorität |
|--------|---------|-----------|
| URL-Rewriting in 3 Dateien dupliziert | 2 Tage | P1 |
| Kein TypeScript im Renderer | 1 Tag | P2 |
| Alle Block-Komponenten = `null` | 5 Tage | P1 |
| Keine Browser-Tests | 3 Tage | P2 |
| Kein einheitliches Fehler-Handling | 1 Tag | P1 |

## 14.2 Architektur-Level

| Schuld | Aufwand | Priorität |
|--------|---------|-----------|
| Kein `browser_embed` Block-Typ | 3 Tage | P0 |
| Keine Browser-Session-Tabelle | 2 Tage | P0 |
| Keine Session-Isolation | 2 Tage | P0 |
| Zwei parallele Implementierungen | 3 Tage | P0 |
| Keine Browser-API-Spezifikation | 2 Tage | P1 |
| **4 konkurrierende Block-Typ-Listen** (Frontend/Entity/DTO/Doku) | 2 Tage | P1 |
| **Doku-Nomenklatur veraltet** (`toggle_heading` vs `toggle`, etc.) | 2 Tage | P1 |
| **Frontend/Backend-Desync** (`search` nur in Frontend) | 0,5 Tage | P1 |
| **Kein ADR für Browser-Modell** | 0,5 Tage | P0 |

## 14.3 Dokumentations-Level

| Schuld | Aufwand | Priorität |
|--------|---------|-----------|
| 11 Widersprüche zwischen Doku und Code | 2 Tage | P1 |
| **Doku-Nomenklatur komplett veraltet** (pages_block_registry.md, pages_block_system.md) | 2 Tage | P1 |
| Keine Browser-Block-API-Spec | 1 Tag | P1 |
| Keine Browser-Architektur-Doku | 1 Tag | P1 |
| Veraltete pages_data_model.md | 0,5 Tage | P2 |
| **Vollständige Analyse**: `docs/domains/pages/011_block_system_browser_embed_analysis.md` | — | — |

---

# 15. Priorisierte Handlungsempfehlungen

## 15.1 Sofortmaßnahmen (P0 — diese Woche)

| # | Maßnahme | Aufwand | Begründung |
|---|----------|---------|------------|
| 1 | Auth-Guards auf Browser- & Proxy-Controller | 1h | Sicherheitskritisch |
| 2 | SSRF-Schutz (IP-Blocklist) | 4h | Sicherheitskritisch |
| 3 | Chrome-Sandbox aktivieren | 4h | Sicherheitskritisch |
| 4 | Ports 3111/3121 nur intern | 1h | Sicherheitskritisch |
| 5 | Owner-Checks bei Browser-Tabs | 4h | Sicherheitskritisch |

**Geschätzter Aufwand: 2 Tage**

## 15.2 Architektur (P1 — nächste 2 Wochen)

| # | Maßnahme | Aufwand |
|---|----------|---------|
| 6 | `browser_embed` Block-Typ definieren (Registry, Entity, DTO) | 2 Tage |
| 7 | Browser-Session-Tabelle + Migration | 2 Tage |
| 8 | BrowserBlock-Komponente (Frontend) | 5 Tage |
| 9 | Browser-API (Backend, pro Block) | 3 Tage |
| 10 | Standalone `/browser`-Seite entfernen | 0,5 Tage |

**Geschätzter Aufwand: 12 Tage**

## 15.3 Features (P2 — Folgemonat)

| # | Maßnahme | Aufwand |
|---|----------|---------|
| 11 | History-Persistenz | 2 Tage |
| 12 | Bookmarks | 2 Tage |
| 13 | Settings (Zoom, UA, etc.) | 1 Tag |
| 14 | Session-Isolation im Puppeteer-Service | 3 Tage |
| 15 | Puppeteer Concurrency-Limit + Memory-Management | 2 Tage |

**Geschätzter Aufwand: 10 Tage**

## 15.4 Qualität (P3 — kontinuierlich)

| # | Maßnahme | Aufwand |
|---|----------|---------|
| 16 | Doku-Konsistenz herstellen | 2 Tage |
| 17 | Browser-Tests (Unit + E2E) | 3 Tage |
| 18 | TypeScript für Renderer | 1 Tag |
| 19 | URL-Rewriting zentralisieren | 2 Tage |

**Geschätzter Aufwand: 8 Tage**

**Gesamtaufwand: ~32 Entwicklungstage**

---

# 16. Gap-Analyse (Ist vs. Soll)

## 16.1 Architektur-Gaps

| ID | Ist-Zustand | Soll-Zustand | Auswirkung | Priorität | Lösung |
|----|-------------|-------------|------------|-----------|--------|
| G-01 | Browser als Unter-Tab des ResearchWorkspaceBlock | Eigenständiger `browser_embed` Block-Typ | Browser nicht modular, nicht unabhängig einsetzbar | P0 | Neuer Block-Typ in Registry/Entity/DTO |
| G-02 | Standalone `/browser`-Seite existiert parallel | Browser NUR als Block in Pages | Duplizierung, Verwirrung, Inkonsistenz | P0 | Standalone-Seite entfernen |
| G-03 | Zwei Proxy-Pfade (`/browser/proxy` und `/proxy`) | Ein einheitlicher Proxy-Pfad pro Block | Unterschiedliche Rendering-Qualität, Wartung | P0 | Einheitlichen Browser-Service schaffen |
| G-04 | Tabs an Research-Session gebunden | Tabs an Browser-Block gebunden | Keine Isolation zwischen Browser-Blöcken | P0 | browser_sessions-Tabelle |
| G-05 | History im React-State (flüchtig) | History in DB persistiert (JSONB) | Chronik geht beim Reload verloren | P1 | History-Feld in browser_sessions |
| G-06 | Keine Cookies pro Block | Cookies isoliert pro Browser-Block | Login-Zustände gehen verloren | P1 | Cookie-Isolation via Puppeteer Contexts |
| G-07 | Keine Bookmarks | Bookmarks CRUD pro Block | Funktionalität fehlt | P2 | Bookmarks als JSONB oder eigene Tabelle |
| G-08 | Keine Settings | Settings pro Block (Zoom, UA, etc.) | Keine Konfiguration | P2 | Settings-Feld (JSONB) |
| G-09 | Keine Downloads | Downloads mit Page-Association | Funktionalität fehlt | P3 | Download-Tabelle + Storage-Integration |
| G-10 | Puppeteer global, shared state | Isolierte Browser-Contexts pro Block | Cross-Block State-Leak | P1 | `browser.createBrowserContext()` |

## 16.2 Sicherheits-Gaps

| ID | Ist-Zustand | Soll-Zustand | Priorität |
|----|-------------|-------------|-----------|
| G-11 | Keine Auth auf Proxy/Browser-Controller | JwtGuard + PermissionGuard | P0 |
| G-12 | URLs ungefiltert (SSRF) | URL-Validierung + IP-Blocklist | P0 |
| G-13 | Chrome ohne Sandbox | Chrome mit Sandbox + seccomp | P0 |
| G-14 | CSP `frame-ancestors *` | CSP `frame-ancestors 'self'` | P1 |
| G-15 | `unsafe-inline` + `unsafe-eval` | Nonce-basierte CSP | P1 |
| G-16 | iframe `allow-top-navigation` | Ohne `allow-top-navigation` | P1 |
| G-17 | Ports nach außen exponiert | Nur intern (docker network) | P0 |

## 16.3 Funktions-Gaps

| ID | Ist-Zustand | Soll-Zustand | Priorität |
|----|-------------|-------------|-----------|
| G-18 | Keine Suchmaschinen-Integration | SearXNG als Default-Suchmaschine | P1 |
| G-19 | Keine Favicon-Anzeige | Favicons pro Tab | P2 |
| G-20 | Kein Zoom | Zoom einstellbar | P2 |
| G-21 | Keine Tab-Ansicht (im BrowserBlock) | Tabs innerhalb eines Browser-Blocks | P2 |
| G-22 | Keine URL-Autovervollständigung | History-basierte Vorschläge | P2 |

---

# 17. Aufgabenpakete für Entwickler

## Paket 1: Sicherheits-Hardening (P0)

| Feld | Wert |
|------|------|
| **Ziel** | Kritische Sicherheitslücken schließen |
| **Beschreibung** | Auth-Guards, SSRF-Schutz, Chrome-Sandbox, Port-Isolation, Owner-Checks |
| **Betroffene Komponenten** | `browser.controller.ts`, `proxy.controller.ts`, `pages.controller.ts:414-446`, `pages.service.ts:521-550`, `server.js`, `docker-compose.yml` |
| **Abhängigkeiten** | Keine |
| **Aufwand** | 2 Tage |
| **Priorität** | P0 — Vor aller anderen Arbeit |
| **Akzeptanzkriterien** | ✅ Alle Browser-Endpunkte erfordern JWT ✅ SSRF-Schutz blockiert private IPs ✅ Chrome läuft mit Sandbox ✅ Ports 3111/3121 nicht extern erreichbar ✅ Browser-Tab-Operationen prüfen Owner |
| **Risiken** | SSRF-Blocklist könnte legitime URLs blockieren → Allowlist-Modus testen |

## Paket 2: Browser-Block-Typ-Definition (P0)

| Feld | Wert |
|------|------|
| **Ziel** | `browser_embed` als offiziellen Block-Typ definieren |
| **Beschreibung** | Block-Typ in Frontend-Registry, Backend-Entity, DTO, Zod-Schema, BlockHandle und SlashMenu registrieren |
| **Betroffene Komponenten** | `blockRegistry.ts`, `pages.ts`, `pages.dto.ts`, `BlockHandle.tsx`, `SlashMenu.tsx` |
| **Abhängigkeiten** | Keine |
| **Aufwand** | 2 Tage |
| **Priorität** | P0 |
| **Akzeptanzkriterien** | ✅ `browser_embed` im BlockType-Union ✅ In Zod blockTypes-Array ✅ In Frontend-Registry ✅ In BlockHandle BLOCK_TYPE_OPTIONS ✅ Im SlashMenu sichtbar |
| **Risiken** | Keine |

## Paket 3: Browser-Session-Datenmodell (P0)

| Feld | Wert |
|------|------|
| **Ziel** | DB-Schema für isolierte Browser-Sessions pro Block |
| **Beschreibung** | Neue Tabelle `browser_sessions` mit blockId-Referenz, History, Cookies, Bookmarks, Settings. Migration erstellen. |
| **Betroffene Komponenten** | `shared/db/src/schema/public.ts`, neue Migration |
| **Abhängigkeiten** | Paket 2 |
| **Aufwand** | 2 Tage |
| **Priorität** | P0 |
| **Akzeptanzkriterien** | ✅ `browser_sessions`-Tabelle existiert ✅ FK zu `page_blocks.id` (CASCADE) ✅ Felder: history JSONB, cookies JSONB, bookmarks JSONB, settings JSONB ✅ browser_tabs referenziert browser_sessions statt research_sessions ✅ Migration ist idempotent |
| **Risiken** | Migration bestehender Daten (research_sessions → browser_sessions) |

## Paket 4: Browser-API (Backend) (P0)

| Feld | Wert |
|------|------|
| **Ziel** | REST-API für Browser-Block-Operationen |
| **Beschreibung** | Endpunkte für Session-Management, Tabs, History, Bookmarks, Settings — alle pro Block und mit Owner-Prüfung |
| **Betroffene Komponenten** | `browser.controller.ts` (Refactor), `pages.service.ts`, `pages.repository.ts` |
| **Abhängigkeiten** | Paket 1, 3 |
| **Aufwand** | 3 Tage |
| **Priorität** | P0 |
| **Akzeptanzkriterien** | ✅ `GET /browser/:blockId/session` → Session-State ✅ `POST /browser/:blockId/tabs` → Tab erstellen ✅ `PUT /browser/tabs/:tabId` → Tab aktualisieren ✅ `DELETE /browser/tabs/:tabId` → Tab löschen ✅ `GET /browser/:blockId/history` → History ✅ `POST /browser/:blockId/bookmarks` → Bookmark hinzufügen ✅ Alle Endpunkte mit JwtGuard + Owner-Prüfung ✅ Zod-Validierung für alle Inputs |
| **Risiken** | Breaking Change für bestehende ResearchWorkspaceBlock |

## Paket 5: BrowserBlock-Komponente (Frontend) (P1)

| Feld | Wert |
|------|------|
| **Ziel** | Eigenständige BrowserBlock-Komponente als Block im Editor |
| **Beschreibung** | React-Komponente mit Toolbar, URL-Bar, Tabs, iframe, Navigation. Nutzt Paket 4 API. |
| **Betroffene Komponenten** | Neue Datei: `blocks/BrowserBlock.tsx`, `ResearchWorkspaceBlock.tsx` (Refactor) |
| **Abhängigkeiten** | Paket 2, 4 |
| **Aufwand** | 5 Tage |
| **Priorität** | P1 |
| **Akzeptanzkriterien** | ✅ BrowserBlock ist als Block im Editor hinzufügbar ✅ Eigene Session pro Block ✅ Eigene Tabs ✅ Navigation (Back, Forward, Reload, URL-Bar) ✅ History wird persistiert ✅ Bookmarks CRUD ✅ Settings (mindestens Höhe/Zoom) ✅ iframe sandboxed (ohne allow-top-navigation) ✅ Responsive ✅ Keyboard-Navigation ✅ Deutsche UI-Texte |
| **Risiken** | iframe-Einschränkungen (X-Frame-Options, CSP der Ziel-Site) |

## Paket 6: Puppeteer-Service Refactor (P1)

| Feld | Wert |
|------|------|
| **Ziel** | Session-Management, Concurrency-Limit, Memory-Management |
| **Beschreibung** | Refactor zu TypeScript, Browser-Context-Pool, Session-Caching (TTL), Concurrency-Queue, Memory-Limits |
| **Betroffene Komponenten** | `infrastructure/browser-renderer/` (kompletter Refactor) |
| **Abhängigkeiten** | Paket 1 |
| **Aufwand** | 4 Tage |
| **Priorität** | P1 |
| **Akzeptanzkriterien** | ✅ Max 10 gleichzeitige Browser-Contexts ✅ Request-Queue für überschüssige Requests ✅ Session-Caching mit TTL (15min) ✅ Browser-Recycling nach 50 Requests ✅ Memory-Limit pro Context (512MB) ✅ Auth via API-Key ✅ TypeScript ✅ Health-Check mit Memory-Reporting |
| **Risiken** | Session-Management erhöht Komplexität; Puppeteer-Context-Leaks |

## Paket 7: Standalone-Seite entfernen + Cleanup (P1)

| Feld | Wert |
|------|------|
| **Ziel** | Standalone `/browser`-Seite entfernen, Proxy-Controller konsolidieren |
| **Beschreibung** | `/(dashboard)/browser/page.tsx` löschen, `proxy.controller.ts` in `browser.controller.ts` mergen, duplizierte URL-Rewriting-Logik zentralisieren |
| **Betroffene Komponenten** | `browser/page.tsx` (löschen), `proxy.controller.ts` (mergen), Sidebar-Navigation |
| **Abhängigkeiten** | Paket 5 |
| **Aufwand** | 1 Tag |
| **Priorität** | P1 |
| **Akzeptanzkriterien** | ✅ `/browser`-Route existiert nicht mehr ✅ Nur ein Proxy-Controller ✅ Sidebar-Link auf Browser entfernt oder leitet zu Pages um ✅ Keine Dead-Links |
| **Risiken** | Bestehende Bookmarks/Links auf `/browser` |

## Paket 8: Doku-Konsistenz (P2)

| Feld | Wert |
|------|------|
| **Ziel** | Alle Doku-Dokumente konsistent mit Code |
| **Beschreibung** | Widersprüche auflösen, Browser-Block-API-Spec schreiben, BLOCK_SYSTEM_ARCHITECTURE aktualisieren, RESEARCH_WORKSPACE_ARCHITECTURE aktualisieren, ADR für Browser-Block erstellen |
| **Betroffene Komponenten** | 13 Markdown-Dateien |
| **Abhängigkeiten** | Paket 2, 4 |
| **Aufwand** | 2 Tage |
| **Priorität** | P2 |
| **Akzeptanzkriterien** | ✅ `browser_embed` in BLOCK_SYSTEM_ARCHITECTURE ✅ Keine Widersprüche zwischen Doku und Code ✅ Neue Browser-Block-API-Spec ✅ ADR-0005 für Browser-Block ✅ DOX-Pass für alle AGENTS.md |
| **Risiken** | Keine |

---

# 18. Implementierungs-Reihenfolge

```text
Woche 1:  Paket 1 (Sicherheit) + Paket 2 (Block-Typ)          [parallel]
Woche 2:  Paket 3 (DB-Schema) + Paket 6 (Puppeteer Refactor)   [parallel]
Woche 3:  Paket 4 (Backend API)
Woche 4-5: Paket 5 (Frontend BrowserBlock)
Woche 5:  Paket 7 (Cleanup) + Paket 8 (Doku)                   [parallel]
```

**Kritischer Pfad**: Paket 1 → Paket 3 → Paket 4 → Paket 5

---

# 19. Abhängigkeitsgraph

```text
Paket 1 (Sicherheit) ──────────────────────────────┐
                                                    │
Paket 2 (Block-Typ) ──┬── Paket 3 (DB-Schema) ──┐  │
                      │                          │  │
                      │    Paket 6 (Puppeteer) ──┼──┤
                      │                          │  │
                      └── Paket 4 (API) ◄────────┘  │
                                 │                   │
                                 └── Paket 5 (Frontend)
                                          │
                                          └── Paket 7 (Cleanup)
                                                   │
Paket 8 (Doku) ◄──────────────────────────────────┘
```

---

# Anhang A: Analysierte Dateien

## Code-Dateien

| # | Datei | Zeilen | Analyse-Fokus |
|---|-------|--------|---------------|
| 1 | `apps/frontend/src/app/(dashboard)/browser/page.tsx` | 199 | Standalone Browser UI |
| 2 | `apps/frontend/src/app/(dashboard)/pages/components/blocks/ResearchWorkspaceBlock.tsx` | 672 | Browser als Block-Tab |
| 3 | `apps/frontend/src/lib/blockRegistry.ts` | 299 | Block-Registry |
| 4 | `apps/frontend/src/app/(dashboard)/pages/components/BlockHandle.tsx` | 185 | Block-Typ-Selektor |
| 5 | `domains/pages/src/api/browser.controller.ts` | 116 | Chrome-Proxy API |
| 6 | `domains/pages/src/api/proxy.controller.ts` | 59 | Direct-Proxy API |
| 7 | `domains/pages/src/api/pages.controller.ts` | 448 | Browser-Tabs API |
| 8 | `domains/pages/src/services/pages.service.ts` | 777 | Business-Logic |
| 9 | `domains/pages/src/repositories/pages.repository.ts` | 624 | Datenbank-Operationen |
| 10 | `shared/db/src/schema/public.ts` | 823 | DB-Schema |
| 11 | `infrastructure/browser-renderer/server.js` | 211 | Puppeteer Service |
| 12 | `docker-compose.yml` | 120 | Infrastruktur |

## Doku-Dateien

| # | Datei | Status |
|---|-------|--------|
| 1 | `docs/domains/pages/blocks/block_browser_embed.md` | ⚠️ Definiert nicht existierenden Block |
| 2 | `docs/01_Architecture/RESEARCH_WORKSPACE_ARCHITECTURE.md` | ⚠️ Widerspricht Block-Konzept |
| 3 | `docs/01_Architecture/BLOCK_SYSTEM_ARCHITECTURE.md` | ⚠️ Browser fehlt |
| 4 | `docs/01_Architecture/PAGE_ARCHITECTURE.md` | ⚠️ Nur Research erwähnt |
| 5 | `docs/01_Architecture/PAGES_NOTION_REDESIGN_PLAN.md` | ⚠️ Browser nicht erwähnt |
| 6 | `docs/01_Architecture/PAGE_SYSTEM_VISION.md` | ✅ "Browsermodule" als Future erwähnt |
| 7 | `docs/domains/pages/pages_overview.md` | ⚠️ Nur erwähnt |
| 8 | `features/pages.feature.md` | ⚠️ Kein Browser |
| 9 | `features/pages.AGENTS.md` | ⚠️ Kein Browser im Scope |
| 10 | `docs/domains/pages/blocks/block_embed.md` | ⚠️ Überlappt mit Browser |
| 11 | `docs/domains/pages/pages_block_registry.md` | ⚠️ Listet browser_embed |
| 12 | `docs/domains/pages/pages_block_system.md` | ⚠️ Listet browser_embed |
| 13 | `docs/domains/pages/pages_api_spec.md` | ⚠️ Keine Browser-API |

---

# Anhang B: Widersprüche Doku vs. Code

| # | Doku sagt | Code zeigt | Auflösung |
|---|-----------|------------|-----------|
| 1 | `browser_embed` ist ein Advanced Block (block_registry.md) | Nicht im Code-Registry | Block-Typ muss implementiert werden |
| 2 | `browser_embed` ist ein Advanced Block (block_system.md) | Nicht im Code | Siehe oben |
| 3 | Browser hat Content `{url, title}` (block_browser_embed.md) | Kein Content-Schema im Code | Schema definieren |
| 4 | "Browser ist nur UI-Komponente, nicht Teil der Architektur" (research_workspace.md §8) | Browser hat eigene Backend-Controller | Architektur-Doku aktualisieren |
| 5 | "Browser Implementation nicht Bestandteil" (block_system.md §13) | Browser-Controller existiert | Doku aktualisieren |
| 6 | API-Spec hat keine Browser-Endpunkte (pages_api_spec.md) | Browser-Endpunkte existieren | API-Spec erweitern |
| 7 | `pages.feature.md` definiert keine Browser-Blöcke | Browser-Logik existiert im Backend | Feature-Spec erweitern |
| 8 | `pages.AGENTS.md` Scope ohne Browser | Browser-Tabs im Backend | AGENTS.md aktualisieren |
| 9 | `block_embed.md` und `block_browser_embed.md` überlappen | Zwei verschiedene Implementierungen | Klare Abgrenzung definieren |
| 10 | `pages_data_model.md` zeigt vereinfachtes Schema | Tatsächliches Schema viel komplexer | Doku aktualisieren |
| 11 | Notion-Redesign-Plan erwähnt Browser nicht | ResearchWorkspaceBlock hat Browser | Plan aktualisieren |
| 12 | Doku-Block-Typen verwenden andere Namen als Code (`toggle_heading` vs `toggle`, `page_link` vs `page-reference`, `table_simple` vs `table`, etc.) | Code-Registry hat andere Nomenklatur | `pages_block_registry.md` und `pages_block_system.md` aktualisieren |
| 13 | Frontend hat `search` als 27. Block-Typ, Backend Entity + DTO haben nur 26 (ohne `search`) | Frontend/Backend-Desync | `search` zu Backend Entity + DTO hinzufügen |
| 14 | Doku beschreibt `list` Block-Typ, Code hat keinen | Doku veraltet | `list` aus Doku entfernen oder implementieren |
| 15 | `RESEARCH_WORKSPACE_ARCHITECTURE.md` §14 "Non-Goals: Nicht Webbrowser" | ResearchWorkspaceBlock hat vollständigen Browser implementiert | Non-Goals korrigieren |
| 16 | Vorherige Analyse `010_browser_doc_consistency_analysis.md` enthält Fehler (behauptet fehlendes Frontend/Registry) | Beide existieren (672 Zeilen TSX, 27 Registry-Typen) | `010` als deprecated markieren |

---

*Ende des Review-Dokuments*
