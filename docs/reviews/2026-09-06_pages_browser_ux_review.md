# LifeHub Review — Pages, Browser, UI/UX (2026-09-06)

Umfang: Gründliches Review aller Funktionen, Architektur, Struktur, Design und UI/UX mit Fokus auf die Pages-Domäne (Notion/AppFlowy-Ausrichtung) und den eingebauten Browser (Echtzeit, hohe Auflösung, lückenlose native Maus für Captchas).

Methodik — zwei Durchläufe:
1. **Durchlauf 1**: drei parallele Tiefen-Explorationen (Pages-Domäne, Browser-Pipeline, Gesamtarchitektur/UI) inkl. direkter Code-Verifikation der kritischen Pfade.
2. **Durchlauf 2**: Abgleich gegen die bestehenden Reviews vom 22.08.2026 (`2026-08-22_lifehub_ui_design_review.md`, `2026-08-22_lifehub_code_functionality_review.md`, Backlog-CSV) — Deltas identifiziert, noch offene Findings verifiziert.

Baseline: Commit `6c25966`. Ergebnis des Fix-Lauffs: Phasen 1–4 umgesetzt (siehe §4), Restlücken in §5.

---

## 1. Browser (eingebetteter Chromium) — Befunde

### P0 — Architektur erreichte die Anforderungen strukturell nicht
| Befund | Detail | Status |
|---|---|---|
| Screenshot-Polling statt Stream | `page.screenshot()` JPEG q60 → sharp auf **960px** → CPU-I420 → VP8; ~15 FPS für 2s nach Input, sonst 4 FPS (`server.js` alte capture-Loop) | ✅ GEFIXT: CDP `Page.startScreencast` — event-getrieben, volle Auflösung × DPR (`BROWSER_DPR`, default 1.5), FPS-Gate 30 |
| Maus lückenhaft | Frontend 33ms-Drossel + 3px-Gate; Server verwirft Moves bei >4 pending; `mouse.down` zahlt künstliche Bézier-Kurve + 40–120ms Pause | ✅ GEFIXT: jedes `pointermove` sofort (inkl. `getCoalescedEvents()`), Server 16ms-Pacer last-write-wins, keine künstliche Verzögerung — Trajektorie = echte User-Bewegung |
| Head-of-Line-Blocking | Serielle Input-Queue: 30s-Navigation blockierte ALLE Eingaben | ✅ GEFIXT: Navigation läuft asynchron neben der Queue; `release`/Control sofort; Queue nur für schnelle Ops |
| Kein Resize/DPR | Feste 1280×720, `object-fill` verzerrt, `resize()` existierte aber ungenutzt | ✅ GEFIXT: ResizeObserver → resize-Nachricht, `object-contain` + letterbox-korrektes Koordinaten-Mapping |
| Falscher Stall-Watchdog | Harte Resets bei statischen Seiten („kein Frame“ ≠ Stall) | ✅ GEFIXT: CDP-Ping-Probe (`Runtime.evaluate`) unterscheidet statisch vs. eingefroren; Keepalive-Replay hält Client-Watchdog am Leben |

### P0/P1 — Security
| Befund | Status |
|---|---|
| Port `3111` ungebunden exponiert (BROW-009) | ✅ `BROWSER_RENDERER_BIND` in beiden Compose-Dateien (Prod-Empfehlung: Tailscale-IP) + Ressourcen-Limits (mem 4g / cpus 3 / pids 512) |
| 24h-Stream-Token in WS-Query-URL (BROW-003) | ✅ TTL 30 min; Token als WebSocket-Subprotocol `bearer-<token>` (Query nur als Legacy-Fallback) |
| Keine Origin-Prüfung | ✅ `BROWSER_ALLOWED_ORIGINS` |
| SSRF nur bei Erst-URL; Popups/Redirects ungeprüft (BROW-004) | ✅ Request-Interceptor auf jeder Page (Subrequests, Redirects, Popups) mit DNS-Cache; Restrisiko DNS-Rebinding TOCTOU dokumentiert |
| Downloads komplett gepuffert (RAM-Spitzen) | ✅ Stream-Passthrough (Renderer `createReadStream` → Backend `pipeline(Readable.fromWeb)`) |
| `--no-sandbox` + unbegrenzte Chromium-Instanzen (BROW-005/006) | ⚠️ teilweise: Non-Root + `no-new-privileges` + Limits im Compose; Session-Anzahl-Limit offen (§5) |
| Headless-Fingerprint | ✅ optionaler Headful-Modus (`BROWSER_HEADFUL=1`, Xvfb im Dockerfile/start.sh) |

## 2. Pages-Domäne — Befunde

### Editor/UX (P0/P1)
| Befund | Status |
|---|---|
| Titel nach Erstellung nicht editierbar (`PageHeader.tsx` statisches `<h1>`) | ✅ Editierbarer Input im Notion-Stil, debounced Autosave (600ms) |
| Kein Notion-Editor-Gefühl: per-Block TipTap ohne Resync, rohes `contentEditable` für Headings, kein Enter-Split/Backspace-Merge/Undo-Redo, 3 voneinander abweichende Block-Menüs | ✅ Migration auf **BlockNote 0.31** (Open-Source-Notion-Editor, React/TipTap-basiert): Slash-Menü, Drag-Handles, Undo/Redo, Inline-Toolbar, Tastatur-Flow nativ; altes per-block TipTap + custom SlashMenu/DragDropContainer/BlockHandle entfernt |
| BlockNote-Wahl vs. AppFlowy | AppFlowy ist Flutter/Dart und nicht in Next.js einbettbar; BlockNote ist das funktionale Open-Source-Äquivalent. LifeHub-Spezialblöcke als `createReactBlockSpec`-NodeViews (browserEmbed, researchWorkspace, lifehubImage, gallery, lifehubTable, bookmark, embed, video, file, map, pageReference, search, timeline, toggle, callout, divider) |
| Stubs: `gallery` renderte keine Bilder, `file-list` Stub, 4 tote Widget-Blöcke im Slash-Menü | ✅ Gallery als Bilderraster mit Media-Picker; tote Widget-Blöcke aus Registry/Slash-Menü entfernt, Migration rettet deren Text als Absatz |
| Suche matchte falschen JSON-Pfad (`content->>'text'`, TipTap speichert `{json:…}`) | ✅ `jsonb_path_query_array(content, 'lax $.**.text')` über Doc UND Legacy-Blocks |
| Markdown-Export verlor Text-/Tabellen-/Bildinhalte | ✅ Export aus dem Doc (`docToMarkdown`), Legacy-Fallback |
| `?open=` statt echter Route; `page.tsx` 1622-Zeilen-Monolith | ✅ Echte Route `/pages/[slug]` (UUID|Slug); Liste neu gebaut (~430 Zeilen): Baum mit Einklappen, Suche, Pins-Manager (`?manage-pins=true`), `?new=true` (beides vorher kaputte Sidebar-Aktionen) |
| Pins/Move/Export-Import-APIs ohne UI | ✅ Pins (anheften + Manager), Markdown/JSON-Export-Buttons, Unterseiten-Anlegen in der Detail-Toolbar (Move-Dialog bleibt offen, §5) |
| Hardcoded `hostname:3007` + Token-Scrape an 4 Stellen | ✅ zentrale `mediaFileUrl()` in `lib/api.ts` |
| Hover-only Handles (kein Touch/Keyboard), Typo „Loschen“ | ✅ Tree/Liste: `focus-within`-sichtbare Aktionen, `aria-label`s; Detail-Seite neu gebaut ohne Hover-only-Handles |
| Löschen via `window.confirm` statt Undo-Toast | ⚠️ offen (braucht globale Toast-Infrastruktur, §5) |

### Datenmodell
- Neu: `pages.content` JSONB (BlockNote-Doc) + `page_versions.doc` JSONB, Migration `0023_pages_doc.sql`. Legacy `page_blocks` bleibt (FK von `browser_sessions`), Synthese persist-on-read (`PagesService.resolveDoc`), Speichern via `PUT /pages/:id/doc` mit ratenlimitierten Version-Snapshots (5min-Fenster gegen Snapshot-Spam), Restore schreibt Doc direkt zurück (löst den Resync-Bug strukturell).
- Tests: `domains/pages/src/services/pages-doc.spec.ts` — 24 Tests grün (Migration, TipTap-Konvertierung, Text-Extraktion, Markdown-Export).

## 3. Global — Befunde & Fixes

| Befund | Status |
|---|---|
| 6 Backend-lose Menüeinträge (documents, insurance, vault, search, it-inventory, plugins — Module existierten, nicht in `app.module.ts`) | ✅ Module gewired (Backend-SubAgent; Verifikation: `nest build`) |
| Live-500er Finance (FUNC-003) / Shopping (FUNC-004) | ✅ durch Backend-SubAgent diagnostiziert + gefixt (Details in dessen Report) |
| Auth-Hydration-Race verlor 8 Deep-Links (FUNC-001) | ✅ BootGate in `providers.tsx`: Queries mounten erst nach persist-Hydration + `initClientMode()` |
| Vorbefüllte Admin-Creds im Login (SEC-001) | ✅ entfernt; Dev-only-Hinweis statt Input-Prefill |
| ~1799 statische Farben statt Tokens (UI-001) | ✅ in 10 Route-Ordnern auf 0 reduziert (241 Fundstellen in 8 Dateien migriert); media/jellyfin offen (§5) |
| `text-white` auf `brand-500` verletzt AA (UI-002) | ✅ `--brand-fg`-Token (near-black, ≥4.5:1 auf allen Presets; Zahlen im Theme-Report); Aufruf-Migration der CTAs folgt beim media/jellyfin-Sweep |
| Nur Amber hatte Light-Scale (UI-004) | ✅ Light-Scales für blue/green/rose/violet |
| Custom-Hex nur 3 Stufen (UI-005) | ✅ voller 50–900-Scale (JS-sRGB-Mix in `theme-store.applyAccent` + Pre-Paint-Script), `data-accent="custom"` |
| `--fg-subtle` 2.56:1 light (UI-003) | ✅ 4.83:1 light / 5.45:1 dark |
| `.glass` dark-only (UI-006) | ✅ theme-aware + `-webkit-backdrop-filter` |
| Kein `prefers-reduced-motion` (UI-007) | ✅ globale Reduce-Regel |
| Kein Topbar/⌘K/Breadcrumbs, mobile nur Hamburger (UI-009/010) | ✅ Topbar (64px, Breadcrumb + Suche + Benachrichtigungs-Placeholder), ⌘K-Command-Palette (ohne neue Deps), mobile Bottom-Tab-Bar (5 + „Mehr“-Sheet) nach UI_UX.md §4 |
| Keine Error-/Empty-States (UI-014) | ✅ Shared-UI `components/ui/lifehub/` (EmptyState/ErrorState/Skeleton) + Route-`error.tsx` für finance/vault/calendar/insurance |
| Doppel-Eintrag calendar + veralteter Duplikat-Stand | ✅ `docs/DOMAIN_STATUS.md` bereinigt; `docs/05_Development/DOMAIN_STATUS.md` als Redirect |
| Compose: hardcoded Secrets, `CORS *`, Ports offen, keine Limits (SEC-005/006, DOCKER-006/007) | ⚠️ chrome-Service gehärtet (Bind/Limits); Rest (Secrets nach `.env`, CORS, Backend-Port, Non-Root) offen (§5) |

## 4. Umsetzung (Fix-Lauf)

| Phase | Inhalt | Verifikation |
|---|---|---|
| 1 Browser | Screencast-Pipeline, lückenloser Input, Resize/DPR, Xvfb-Headful, Security-Härtung (server.js-Neubau, RemoteBrowserViewport, Backend-Service/Controller, Dockerfile/start.sh, beide Compose-Files, .env.example) | `node --check` grün; Laufzeit-Verifikation via Docker-Boot steht aus (§5) |
| 2 Pages | Doc-Modell + Migration, pages-doc.ts (Konvertierung/Suche/Export), BlockNote-Editor (lifehubBlocks + LifehubEditor), Detail-Route, Listen-Neubau, Title-Editing, mediaUrl-Helper | `pnpm --filter @lifehub/pages-domain typecheck|test` (24/24), `@lifehub/frontend typecheck` grün |
| 3 Global | Module-Wiring (documents, insurance, vault, search, it-inventory, plugins + Migration 0027), Finance/Shopping-500er Root-Cause: Tabellen waren im Schema definiert, aber nie migriert → Migration 0026; Auth-BootGate; Login-Härtung | `nest build` exit 0 |
| 4 UI/UX | Token-Migration (241 statische Farben → 0 in 10 Route-Ordnern), Theme/Akzent/Kontrast (alle 6 UI-Defekte), Shell (Topbar/⌘K/Bottom-Tabs), Shared-UI + Error-Boundaries | Frontend typecheck + `next build` grün |

## 4b. Zweiter Review-Lauf (Post-Fix) — 30 Findings, 22 umgehend gefixt

Ein dedizierter Review-Agent prüfte die gesamte Änderungsfläche nach den Fix-Phasen. Ergebnis:

**P0 (Datenverlust bei Legacy-Migration) — alle gefixt:**
- `pages-doc.ts`: gallery/table/timeline/research_workspace/page_reference emittierten Props in Formen, die die BlockNote-Specs nicht lesen konnten (Array vs. JSON-String-Prop, `targetPageId` vs. `pageId`) → migrierte Blöcke wären leer gewesen. Jetzt: komplexe Props als JSON-Strings (Editor-Konvention), `docToMarkdown` akzeptiert beide Formen; Spec-Tests aktualisiert.

**P1 — gefixt:**
- `RemoteBrowserViewport`: `<video muted={false}>` blockierte Autoplay → Frame-Watchdog hätte Reconnect-Kaskade ausgelöst (jetzt: muted-Start, Unmute bei erster Interaktion); down/up vor dem ersten Frame verworfen (Fallback-Mapping); Wheel-Trailing-Flush; `release` auch über WS-Fallback; `onerror`→`error` Eskalation entfernt; `pendingCandidates` pro connect().
- `server.js`: `hardReset()` ließ Peers/Sockets verwaist; `closeTab()` doppelter Screencast-Restart; `startScreencast()` CDP-Leak ohne Ziel; `resize()` stale lastFrame; legacy-`click` ohne Move-Flush; toter `move`-Branch + ungenutztes Session-`inputQueue` entfernt; Stall-Probe mit 30s-Backoff.
- Pages-Frontend: TreeNode-Collapse propagierte den Eltern-Zustand an alle Kinder; Editor-Autosave flush nicht bei Unmount; Version-Restore remountete den Editor nicht (`key` jetzt `id:updatedAt`); PageHeader-Invalidation `['page', id]` verfehlte Slug-Keys (jetzt Prefix); CoverImage 404-Noise für Builtins; Downloads-Polling nur bei geöffnetem Dropdown.
- Compose/Env: prod `chrome` bekam `BROWSER_INTERNAL_HOSTS: searxng` (sonst blockiert der Egress-Guard die Research-Start-URL) + Healthcheck; `.env.example` vervollständigt.

**Geprüft und sauber befunden:** BlockNote-0.31-Schema-Registrierung, WS-Upgrade (Subprotocol-Token, Origin, Offer-Buffering), Request-Interceptor, Resize-Feedback-Loop, Reconnect-Eskalation, Shell-Keyboard-Handler/Bottom-Tabs/Palette, Suspense/useSearchParams, Docker-Dev-Wiring.

**Bewusst nicht gefixt (P2-Accepted):** `page.mouse._position` (private Puppeteer-API, humanMouseMove ist Legacy), SearchView ungenutzter `editor`-Parameter, `finance_widget`-Purple-Badge ohne Token-Entscheidung, restliche P2-Politur siehe §5.

## 5. Offene Punkte (bewusst zurückgestellt)

0. **Migrations-Abdeckung (neu, Backend-Agent-Befund): 35 Schema-Tabellen ohne `CREATE TABLE`-Migration** — Finance/Shopping (jetzt 0026) und die Ghost-Domains (jetzt 0027) sind gefixt, aber z.B. `trips`/`projects`/`project_notes` haben ebenfalls keine Migration und laufen nur, weil ihre Tabellen out-of-band entstanden sind. Auf jeder frischen DB schlagen diese Domains mit demselben 500-Muster fehl. Empfehlung: Schema↔Migrations-Audit + komplette Migrationskette, damit `db:migrate` auf leerer DB ein bootfähiges System ergibt; zudem DOCKER-004 (`start.sh` schluckt Migrationsfehler) beheben.

1. **Media/Jellyfin-Seiten**: Token-Migration + DE-Strings für `media/` und `jellyfin/` (größte Dateimengen) — gleiche Methode wie der Route-Sweep.
2. **`text-white` → `text-brand-fg`** an CTA-Stellen app-weit (Token existiert, Call-Sites folgen).
3. **Delete-Undo-Toast** statt `window.confirm` (benötigt Toast-Infrastruktur; UI_UX.md §3 listet Toast vor).
4. **Compose-Global-Härtung**: Secrets → `.env`, `CORS_ORIGINS` explizit, Backend/Searxng-Ports binden, Non-Root-User Backend (DOCKER-005, SEC-005/006).
5. **Browser-Follow-ups**: Proxy-Level-Egress (DNS-Rebinding), Session-Anzahl-Limit, HW-Encoding, `browser_history`-Tabelle; Laufzeit-Verifikation der Screencast-Pipeline im Docker-Stack (Screenshots statt Exit-Code, gemäß User-Präferenz).
6. **Vault-Crypto** (SEC-003, plaintext secrets) — höchstprioriges Security-Follow-up, außerhalb dieses Scopes; Vault-Nav bleibt bis dahin ausgeblendet.
7. **Move-Dialog** für Pages (API `POST /pages/:id/move` ohne UI), Shadcn-Migration der Roh-Buttons, Echtzeit-Kollaboration (yjs), Meilisearch-Vereinheitlichung.

## 6. Dokumentation (DOX Pass)

- `docs/01_Architecture/BROWSER_BLOCK_ARCHITECTURE.md` — neu geschrieben (Ist-Architektur v2.0, ersetzt veraltete Ziel-Spec v1.0)
- `features/pages.AGENTS.md` — v2.0: Doc-Modell, BlockNote, Custom-Blocks, Verifikation
- `docs/DOMAIN_STATUS.md` — pages-Eintrag aktualisiert, calendar-Doppelung entfernt; `docs/05_Development/DOMAIN_STATUS.md` als Redirect
- `.env.example`, beide Compose-Dateien — neue Renderer-Variablen dokumentiert
