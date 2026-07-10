# Browser-Block Zielarchitektur — Spezifikation

Version: 1.0
Domain: Pages / Browser
Erstellt: 2026-07-10
Status: Architektur-Spezifikation (Ready for Implementation)
Review: `docs/reviews/browser_block_review.md`

---

# 1. Ziel

Diese Spezifikation definiert die Zielarchitektur für den Browser-Block (`browser_embed`) im LifeHub Pages-System.

Der Browser ist ein **eigenständiger Block-Typ**, der in jede Notion-Page eingebettet werden kann. Jeder Browser-Block ist vollständig **isoliert** — mit eigener Session, eigenen Tabs, eigener History, eigenen Cookies, eigenen Einstellungen und eigenen Bookmarks.

---

# 2. Design-Prinzipien

1. **Block-First**: Der Browser existiert NUR als Block-Typ, nicht als Standalone-Seite
2. **Vollständige Isolation**: Browser-Blöcke beeinflussen sich gegenseitig nicht
3. **Modularität**: BrowserCore als wiederverwendbare Komponente; BrowserBlock als Block-Wrapper
4. **Sicherheit**: SSRF-Schutz, Auth-Guards, Cookie-Isolation, strikte CSP
5. **Erweiterbarkeit**: Plugin-Schnittstelle für Downloads, DevTools, Extensions, Split View
6. **Konsistenz**: Verhält sich wie jeder andere Block im Editor (Drag & Drop, Versionierung, Permissions)

---

# 3. Block-Typ-Definition

## 3.1 Registrierung

```typescript
type: 'browser_embed'
label: 'Browser'
icon: Globe
category: 'Widgets'
defaultContent: {
  startUrl: '',
  title: '',
  sessionId: null  // wird beim ersten Render erstellt
}
defaultLayout: {
  height: 600,
  minHeight: 300,
  resizable: true
}
```

## 3.2 Block-Type-Union (Backend)

`browser_embed` MUSS hinzugefügt werden zu:
- `domains/pages/src/entities/pages.ts` → `BlockType` Union
- `domains/pages/src/dtos/pages.dto.ts` → `blockTypes` Array (Zod)
- `apps/frontend/src/lib/blockRegistry.ts` → Registry
- `apps/frontend/src/app/(dashboard)/pages/components/BlockHandle.tsx` → `BLOCK_TYPE_OPTIONS`

---

# 4. Datenmodell

## 4.1 Neue Tabelle: `browser_sessions`

```sql
CREATE TABLE browser_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  block_id        UUID NOT NULL REFERENCES page_blocks(id) ON DELETE CASCADE,
  owner_id        UUID NOT NULL REFERENCES users(id),
  start_url       TEXT DEFAULT '',
  settings        JSONB NOT NULL DEFAULT '{
    "zoom": 1.0,
    "userAgent": null,
    "blockImages": false,
    "blockScripts": false,
    "darkMode": false,
    "viewport": { "width": 1280, "height": 720 }
  }'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);

CREATE INDEX browser_sessions_block_idx ON browser_sessions(block_id);
CREATE INDEX browser_sessions_owner_idx ON browser_sessions(owner_id);
```

## 4.2 Geänderte Tabelle: `browser_tabs`

```sql
-- ALT: session_id → research_sessions.id
-- NEU: session_id → browser_sessions.id

ALTER TABLE browser_tabs
  DROP CONSTRAINT browser_tabs_session_id_research_sessions_id_fk;

ALTER TABLE browser_tabs
  ADD COLUMN session_id_new UUID REFERENCES browser_sessions(id) ON DELETE CASCADE;

-- Migration der Daten...
-- Danach: session_id entfernen, session_id_new umbenennen

-- Neue Felder:
ALTER TABLE browser_tabs
  ADD COLUMN scroll_position JSONB DEFAULT '{"x": 0, "y": 0}',
  ADD COLUMN favicon_url TEXT,
  ADD COLUMN loading_state TEXT DEFAULT 'idle'; -- 'idle' | 'loading' | 'error'
```

## 4.3 Neue Tabelle: `browser_history`

```sql
CREATE TABLE browser_history (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  UUID NOT NULL REFERENCES browser_sessions(id) ON DELETE CASCADE,
  tab_id      UUID REFERENCES browser_tabs(id) ON DELETE SET NULL,
  url         TEXT NOT NULL,
  title       TEXT,
  visited_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX browser_history_session_idx ON browser_history(session_id, visited_at DESC);
CREATE INDEX browser_history_tab_idx ON browser_history(tab_id, visited_at DESC);
```

## 4.4 Neue Tabelle: `browser_bookmarks`

```sql
CREATE TABLE browser_bookmarks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  UUID NOT NULL REFERENCES browser_sessions(id) ON DELETE CASCADE,
  url         TEXT NOT NULL,
  title       TEXT,
  favicon_url TEXT,
  folder      TEXT DEFAULT '',    -- Ordner-Struktur als String-Pfad
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX browser_bookmarks_session_idx ON browser_bookmarks(session_id, sort_order);
CREATE UNIQUE INDEX browser_bookmarks_session_url_uq ON browser_bookmarks(session_id, url);
```

## 4.5 Cookie-Speicherung

Cookies werden NICHT in der DB gespeichert, sondern im Puppeteer-Service via `browser.createBrowserContext()` isoliert. Der Context wird über die `sessionId` referenziert und mit einer TTL von 15 Minuten gecacht.

---

# 5. API-Spezifikation

## 5.1 Session-Management

```
POST   /api/v1/browser/:blockId/session
       → Erstellt eine neue Browser-Session für den Block
       → Response: { id, blockId, settings, createdAt }

GET    /api/v1/browser/:blockId/session
       → Lädt die Session für den Block (erstellt automatisch, falls nicht vorhanden)
       → Response: { id, blockId, settings, tabs[], history[], bookmarks[] }

PUT    /api/v1/browser/sessions/:sessionId/settings
       → Aktualisiert Session-Settings (zoom, userAgent, etc.)
       → Body: { zoom?: number, userAgent?: string, blockImages?: boolean, ... }
```

## 5.2 Tabs

```
GET    /api/v1/browser/sessions/:sessionId/tabs
       → Listet alle Tabs der Session
       → Response: Tab[]

POST   /api/v1/browser/sessions/:sessionId/tabs
       → Erstellt einen neuen Tab
       → Body: { url?: string, title?: string }
       → Response: Tab

PUT    /api/v1/browser/tabs/:tabId
       → Aktualisiert einen Tab (url, title, isActive, scrollPosition)
       → Body: { url?: string, title?: string, isActive?: boolean }

DELETE /api/v1/browser/tabs/:tabId
       → Löscht einen Tab

POST   /api/v1/browser/sessions/:sessionId/tabs/:tabId/activate
       → Setzt den aktiven Tab (deaktiviert alle anderen in der Session)
```

## 5.3 History

```
GET    /api/v1/browser/sessions/:sessionId/history
       → Listet die Browser-History
       → Query: ?tabId=xxx (optional, filter nach Tab)
       → Query: ?limit=50&offset=0
       → Response: HistoryEntry[]

DELETE /api/v1/browser/sessions/:sessionId/history
       → Löscht die komplette History der Session

DELETE /api/v1/browser/sessions/:sessionId/history/:entryId
       → Löscht einen einzelnen History-Eintrag
```

## 5.4 Bookmarks

```
GET    /api/v1/browser/sessions/:sessionId/bookmarks
       → Listet alle Bookmarks
       → Query: ?folder=xxx (optional)
       → Response: Bookmark[]

POST   /api/v1/browser/sessions/:sessionId/bookmarks
       → Fügt ein Bookmark hinzu
       → Body: { url, title?, faviconUrl?, folder? }

PUT    /api/v1/browser/bookmarks/:bookmarkId
       → Aktualisiert ein Bookmark (title, folder, sortOrder)

DELETE /api/v1/browser/bookmarks/:bookmarkId
       → Löscht ein Bookmark
```

## 5.5 Proxy & Rendering

```
GET    /api/v1/browser/proxy?url=xxx&sessionId=xxx
       → Rendert eine URL über den Browser-Renderer (Chrome/Puppeteer)
       → sessionId für Cookie-Isolation
       → SSRF-Schutz aktiv
       → Auth erforderlich

POST   /api/v1/browser/proxy?url=xxx&sessionId=xxx
       → POST-Rendering (Form-Submissions)
       → Body: beliebige Form-Daten

GET    /api/v1/browser/screenshot?url=xxx&sessionId=xxx
       → Erstellt einen Screenshot
       → Rate-limited (10/Minute pro User)
```

## 5.6 Auth & Permissions

Alle Endpunkte benötigen:
```typescript
@UseGuards(JwtGuard, PermissionGuard)
@RequirePermission('pages', 'read')  // oder 'update' für schreibende Operationen
```

Zusätzlich MUSS bei jeder Operation geprüft werden:
1. Gehört die Session zum Block?
2. Gehört der Block zur Page?
3. Gehört die Page zum User (Owner)?

---

# 6. Frontend-Architektur

## 6.1 Komponenten-Struktur

```
apps/frontend/src/app/(dashboard)/pages/components/blocks/
├── BrowserBlock.tsx              # Block-Wrapper (BlockProps Interface)
├── browser/
│   ├── BrowserCore.tsx           # Wiederverwendbare Browser-Komponente
│   ├── BrowserToolbar.tsx        # URL-Bar + Navigation + Tabs
│   ├── BrowserTabs.tsx           # Tab-Liste (mit Close-Button)
│   ├── BrowserView.tsx           # iframe-Container (sandboxed)
│   ├── BrowserSettings.tsx       # Settings-Panel (Zoom, UA, etc.)
│   ├── BrowserBookmarks.tsx      # Bookmarks-Dropdown
│   ├── BrowserHistory.tsx        # History-Dropdown
│   └── useBrowserSession.ts      # Custom Hook für Session-State
```

## 6.2 BrowserCore Props

```typescript
interface BrowserCoreProps {
  sessionId: string;
  blockId: string;
  height?: number;
  readOnly?: boolean;       // Wenn Page im View-Mode
  onUrlChange?: (url: string) => void;
  onTitleChange?: (title: string) => void;
}
```

## 6.3 BrowserBlock (Block-Wrapper)

```typescript
interface BrowserBlockProps {
  pageId: string;
  blockId: string;
  content: { startUrl?: string; title?: string; sessionId?: string | null };
  onChange: (data: Record<string, unknown>) => void;
}
```

Der BrowserBlock:
1. Prüft, ob `content.sessionId` existiert
2. Wenn nicht: erstellt Session via `POST /browser/:blockId/session`
3. Speichert `sessionId` in Block-Content
4. Rendert `<BrowserCore sessionId={...} blockId={...} />`

## 6.4 iframe Sandbox

```html
<iframe
  sandbox="allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
  <!-- NICHT: allow-same-origin (SOP-Bypass-Risiko) -->
  <!-- NICHT: allow-top-navigation (Phishing-Risiko) -->
  referrerpolicy="no-referrer"
  loading="lazy"
/>
```

## 6.5 State Management

- **TanStack Query** für Server-State (Tabs, History, Bookmarks, Settings)
- **React State** für flüchtigen UI-State (URL-Input, Loading-Indicator)
- **Kein globaler Zustand** — jeder BrowserBlock hat seinen eigenen Query-Scope

---

# 7. Puppeteer-Service (Renderer)

## 7.1 Session-Management

```typescript
// Pro Browser-Session ein isolierter Browser-Context
const context = await browser.createBrowserContext();
const page = await context.newPage();

// Session-Cache mit TTL
const sessionCache = new Map<string, { context: BrowserContext; lastUsed: number }>();
const SESSION_TTL = 15 * 60 * 1000; // 15 Minuten

// Cleanup-Interval
setInterval(() => {
  const now = Date.now();
  for (const [id, { context, lastUsed }] of sessionCache) {
    if (now - lastUsed > SESSION_TTL) {
      await context.close();
      sessionCache.delete(id);
    }
  }
}, 60 * 1000);
```

## 7.2 Concurrency-Limit

```typescript
const MAX_CONTEXTS = 10;
const requestQueue = new Queue();

async function handleRequest(sessionId: string, url: string) {
  if (sessionCache.size >= MAX_CONTEXTS) {
    await requestQueue.enqueue(); // Warten bis ein Slot frei ist
  }
  // ... Request verarbeiten
}
```

## 7.3 Auth

Der Renderer-Service benötigt einen API-Key (Environment-Variable):
```typescript
const API_KEY = process.env.BROWSER_RENDERER_KEY;
// Jeder Request muss den Key im Header senden
if (req.headers['x-api-key'] !== API_KEY) {
  res.writeHead(401);
  res.end();
  return;
}
```

## 7.4 TypeScript-Migration

`server.js` → `server.ts` mit:
- Typen für alle Requests/Responses
- Interface für Session-Cache
- Type-safe Queue-Implementation

---

# 8. Security-Spezifikation

## 8.1 SSRF-Schutz

```typescript
const PRIVATE_IP_RANGES = [
  /^10\./,
  /^172\.(1[6-9]|2[0-9]|3[01])\./,
  /^192\.168\./,
  /^127\./,
  /^169\.254\./,
  /^::1$/,
  /^fc00:/,
  /^fe80:/,
];

function isPrivateIp(ip: string): boolean {
  return PRIVATE_IP_RANGES.some(range => range.test(ip));
}

async function validateUrl(urlStr: string): Promise<void> {
  const url = new URL(urlStr);
  // DNS auflösen
  const addresses = await dns.promises.lookup(url.hostname, { all: true });
  for (const addr of addresses) {
    if (isPrivateIp(addr.address)) {
      throw new BadRequestException('Zugriff auf interne Adressen nicht erlaubt');
    }
  }
}
```

## 8.2 CSP (Content Security Policy)

```typescript
// Statt frame-ancestors *:
const CSP = [
  "default-src 'self'",
  "script-src 'self'",                    // KEIN unsafe-inline/eval
  "style-src 'self' 'unsafe-inline'",     // Inline-Styles erlaubt (eingeschränkt)
  "img-src 'self' https: data: blob:",
  "font-src 'self' https:",
  "connect-src 'self' https:",
  "frame-ancestors 'self'",               // NUR LifeHub selbst
].join('; ');
```

## 8.3 Docker-Compose

```yaml
chrome:
  container_name: lifehub-chrome
  build:
    context: .
    dockerfile: infrastructure/browser-renderer/Dockerfile
  environment:
    PORT: 3000
    BROWSER_RENDERER_KEY: ${BROWSER_RENDERER_KEY}
  # KEINE Port-Exposition nach außen!
  # Nur internes Docker-Netzwerk
  restart: always
  shm_size: 2gb
  # KEIN cap_add: SYS_ADMIN
  # Stattdessen seccomp-Profile:
  security_opt:
    - seccomp:unconfined  # oder angepasstes Profile
  deploy:
    resources:
      limits:
        memory: 2G

searxng:
  container_name: lifehub-searxng
  image: searxng/searxng:latest
  # KEINE Port-Exposition nach außen!
  restart: always
  environment:
    SEARXNG_SECRET: ${SEARXNG_SECRET}  # NICHT hardcoded!
```

---

# 9. Integration mit Research Workspace

Der ResearchWorkspaceBlock kann optional einen BrowserBlock referenzieren, anstatt den Browser selbst zu implementieren:

```text
Page
  ├── ResearchWorkspaceBlock
  │     ├── Sources (Quellen)
  │     ├── Collections
  │     ├── Notes
  │     └── Browser → referenziert einen BrowserBlock auf derselben Page
  │
  ├── BrowserBlock (eigenständig)
  └── BrowserBlock (eigenständig)
```

Der ResearchWorkspaceBlock nutzt `BrowserCore` als wiederverwendbare Komponente (kein eigenes iframe, kein eigener Proxy-Aufruf).

---

# 10. Erweiterungs-Punkte (Future)

| Feature | Erweiterungspunkt | Implementierung |
|---------|-------------------|-----------------|
| Downloads | `browser_downloads`-Tabelle + Storage-Integration | Phase 3 |
| DevTools | Puppeteer CDP-Forwarding über WebSocket | Phase 4 |
| Split View | BrowserBlock mit `layout.columns` + mehrere BrowserCore | Phase 4 |
| Extensions | Chrome-Extensions via Puppeteer `--load-extension` | Phase 5 |
| Annotation | Overlay-Layer über iframe + Position-Tracking | Phase 5 |
| Web Clipping | Content-Extraction via Readability.js + Storage | Phase 5 |

---

# 11. Abgrenzung: BrowserBlock vs. EmbedBlock

| Kriterium | BrowserBlock (`browser_embed`) | EmbedBlock (`embed`) |
|-----------|-------------------------------|---------------------|
| Zweck | Vollständiger Webbrowser | Statisches Embed einer bekannten URL |
| Navigation | Ja (Back, Forward, URL-Bar) | Nein (feste URL) |
| Tabs | Ja | Nein |
| History | Ja | Nein |
| Cookies | Ja (isoliert) | Nein |
| JS-Ausführung | Ja (Puppeteer) | Ja (iframe nativ) |
| Session-Persistenz | Ja | Nein |
| Bookmarks | Ja | Nein |
| Use Case | Recherche, Web-Apps | YouTube, Maps, Dokumente |

Beide Blöcke sind berechtigt, aber sie haben klar unterschiedliche Use-Cases.

---

# 12. Validierung & Testing

## 12.1 Unit-Tests (Backend)
- SSRF-Schutz: private IPs werden blockiert
- Owner-Validierung: fremde Sessions sind nicht zugänglich
- Session-Erstellung pro Block
- Tab-Aktivierung (Race-Condition-Test)

## 12.2 Integration-Tests
- Vollständiger Browser-Workflow: Session → Tab → Navigate → History → Bookmark
- Proxy-Rendering mit SSRF-Schutz
- Cookie-Isolation zwischen Sessions

## 12.3 E2E-Tests (Frontend)
- BrowserBlock zum Editor hinzufügen
- Zu URL navigieren
- Tab erstellen/schließen
- Bookmark hinzufügen
- History durchsuchen
- Settings ändern (Zoom)

---

*Ende der Spezifikation*
