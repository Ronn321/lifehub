# Browser-Block Architektur (Ist-Stand)

Version: 2.0
Domain: Pages / Browser
Aktualisiert: 2026-09-06
Status: Beschreibt die implementierte Architektur (ersetzt die Ziel-Spezifikation v1.0 vom 2026-07-10, die ein nie umgesetztes iframe/createBrowserContext-Modell beschrieb)

---

# 1. Ziel & Prinzipien

Der Browser-Block (`browser_embed`) ist ein vollwertiger, in Notion-Pages eingebetteter Webbrowser: eigene Session pro Block, persistente Cookies/Profile, Tabs, Lesezeichen, Downloads. Anforderungen: hohe Auflösung, Echtzeit-Feedback, lückenlose native Mausweiterleitung (Captcha-fähig).

Prinzipien: Block-first (keine Standalone-Seite), Session-Isolation pro Block, Sicherheit (SSRF-Guard, HMAC-Tokens, Origin-Check), keine Abhängigkeit von externen Streaming-Diensten.

---

# 2. Komponenten & Datenfluss

```
BrowserBlock.tsx (UI: Tabs/URL/Bookmarks/Downloads/Layout-Modi)
  └─ RemoteBrowserViewport.tsx (WebRTC <video> + Input-Capture)
       ├─ WebRTC (recvonly Video/Audio)  ← RTCVideoSource ← Screencast-Frames
       ├─ RTCDataChannel "input" (Maus/Tastatur/Wheel, JSON)
       └─ WebSocket (Signaling Offer/Answer/ICE + State + Input-Fallback)
            │
infrastructure/browser-renderer/server.js (Node, Puppeteer + @roamhq/wrtc)
  ├─ Chromium (persistentes Profil pro Session auf Volume, headless|headful)
  ├─ CDP Page.startScreencast (event-getriebene JPEG-Frames, volle Auflösung × DPR)
  ├─ Input-Dispatcher (Move-Pacer 16ms last-write-wins; serielle Queue nur für
  │   down/up/wheel/keyboard; Navigation asynchron neben der Queue)
  ├─ Egress-Guard (Request-Interceptor + DNS-Cache, blockt private/lokale Ziele)
  └─ Self-Healing (Screencast-Restart, CDP-Ping-Watchdog → hardReset, Heartbeat)
            │
domains/pages (NestJS): browser.controller.ts / browser-renderer.service.ts
  └─ POST /browser/sessions/:id/stream → startet Session beim Renderer,
     liefert streamPath + HMAC-Stream-Token (TTL 30 min)
```

Persistenz: `browser_sessions` (blockId+owner), `browser_tabs` (dual-FK: legacy research `session_id` + `browser_session_id`), `browser_bookmarks`. Chromium-Profile: Volume `lifehub-browser-profiles` (`userDataDir` pro Session). Tab-Metadaten synced der Renderer→DB (Client dedupliziert per Signatur).

---

# 3. Rendering-Pipeline (seit 2026-09)

- **CDP-Screencast statt Screenshot-Polling**: `Page.startScreencast({format:'jpeg', quality:70, maxWidth/maxHeight = viewport×DPR, everyNthFrame:1})`. Frames nur bei Repaint, volle Auflösung, jedes Frame wird ge-ackt (`Page.screencastFrameAck`), FPS-Gate `BROWSER_MAX_FPS` (default 30).
- Encode: JPEG → sharp → RGB → I420 (`rgbToI420`, gerade Dimensionen) → `RTCVideoSource.onFrame` an alle Peers (VP8 via @roamhq/wrtc).
- **Keepalive-Replay**: Statische Seiten erzeugen keine Frames — bei >400ms ohne Echtzeit-Frame wird das letzte Frame alle 500ms erneut gepusht, damit der Client-Watchdog (`video.currentTime`) nicht auslöst. Kein Screenshot-/Encode-Aufwand.
- **Stall-Watchdog**: >10s ohne Echtzeit-Frame && Peers>0 → CDP-Ping (`Runtime.evaluate`, 3s-Timeout). Ping ok = statische Seite (normal); Ping fail = `hardReset()` (SIGKILL + Session neu).
- **Dynamisches Resize**: Frontend-ResizeObserver (debounced 200ms) → `{type:'resize', width, height, dpr}` → `page.setViewport` + Screencast-Restart mit neuen Caps. `deviceScaleFactor` = `BROWSER_DPR` (default 1.5) für scharfe Darstellung.
- **Darstellung**: `<video object-contain>` (kein `object-fill`-Stretch); Koordinaten-Mapping letterbox-bewusst über `videoWidth/videoHeight`.

# 4. Input-Pipeline (lückenlos, Captcha-orientiert)

- Frontend: JEDES `pointermove` wird sofort gesendet (keine Zeit-Drossel, kein 3px-Gate, kein Stale-Drop); `getCoalescedEvents()` liefert Zwischenpunkte der echten Trajektorie. Wheel: Akkumulation, Flush alle 16ms. Buttons: left/middle/right.
- Server: `queueMove` — Moves umgehen die serielle Queue; ein 16ms-Pacer übermittelt last-write-wins an `page.mouse.move` (eigene `moveChain`). `down/up/wheel/keyboard` leeren zuerst den Move-Slot (geordnete Übergabe), laufen dann seriell in `inputQueue` (nur schnelle Ops).
- **Navigation blockiert keine Eingaben**: navigate/reload/back/forward/new-tab/close-tab/activate-tab/resize laufen asynchron neben der Queue; `release`/Control-Ops sind sofort.
- Keine synthetische Bézier-Verzögerung bei `down` mehr — die sichtbare Trajektorie IST die echte User-Bewegung. `humanMouseMove` existiert nur noch für den legacy `click`-Befehl (vollsynthetisch, vom Frontend ungenutzt).
- Anti-Bot-Basis: Stealth-Patches (`navigator.webdriver=undefined`, chrome-Objekt, plugins/languages), `--disable-blink-features=AutomationControlled`, optional Headful-Modus (`BROWSER_HEADFUL=1` → Chromium sichtbar unter Xvfb, siehe `start.sh`). Hinweis: Captcha-Erfolg hängt zusätzlich von IP-Reputation ab — keine Architektur kann das garantieren.

# 5. Sicherheit

| Mechanismus | Umsetzung |
|---|---|
| Renderer-API | Header `x-lifehub-renderer-key` (HMAC-Key aus `.env`) auf allen HTTP-Endpunkten |
| WS-Auth | Stream-Token als WebSocket-Subprotocol `bearer-<token>` (statt Query-String); Legacy-Query als Fallback; HMAC `sessionId.expires` (auth.js), TTL 30 min (`browser-renderer.service.ts`) |
| Origin-Check | `BROWSER_ALLOWED_ORIGINS` (kommasepariert); leer = unrestricted (Dev) |
| SSRF | `assertSafeTarget` bei Navigationsstart + Request-Interceptor auf JEDER Page (Subrequests, Redirects, Popups) mit DNS-Cache (60s); `BROWSER_INTERNAL_HOSTS` als Allowlist-Ausnahme (z.B. searxng). Bekannte Lücke: DNS-Rebinding TOCTOU (prüfung bei Request, Verbindung nutzt eigene Auflösung) — Proxy-Level-Egress ist Follow-up |
| Port | `3111` via `BROWSER_RENDERER_BIND` bindbar (Prod: Tailscale-/LAN-IP statt 0.0.0.0); Ressourcen-Limits (`mem_limit 4g`, `cpus 3`, `pids_limit 512`) in beiden Compose-Dateien |
| Downloads | Renderer streamt (`createReadStream`); Backend reicht den Body als Stream durch (kein RAM-Puffering); Limit `BROWSER_MAX_DOWNLOAD_BYTES`; Filename-Traversal-Guard |
| Sandbox | `--no-sandbox` als Non-Root-User (uid 10001) + `no-new-privileges`; Chromium pro Session ungebunden — Session-Anzahl-Limit ist Follow-up |

# 6. Konfiguration (env)

| Variable | Default | Wirkung |
|---|---|---|
| `BROWSER_RENDERER_KEY` | — (Pflicht) | HMAC-Key für Renderer-API + Stream-Tokens |
| `BROWSER_DPR` | 1.5 | devicePixelRatio des Remote-Renderings (1..2) |
| `BROWSER_MAX_FPS` | 30 | Frame-Obergrenze des Screencasts (5..60) |
| `BROWSER_HEADFUL` | 0 | 1 = Chromium headful unter Xvfb (`start.sh`, Dockerfile installiert xvfb) |
| `BROWSER_ALLOWED_ORIGINS` | leer | WS-Origin-Allowlist (Prod empfohlen) |
| `BROWSER_RENDERER_BIND` | 0.0.0.0 | Host-Bindung des 3111-Ports |
| `BROWSER_INTERNAL_HOSTS` | — | SSRF-Ausnahmen (z.B. `searxng`) |
| `BROWSER_SESSION_IDLE_MS` | 15 min | Session-Cleanup ohne Peers |
| `BROWSER_AUDIO` | 0 | 1 = PulseAudio/FFmpeg-Audio-Track |
| `NEXT_PUBLIC_BROWSER_RENDERER_URL` | `hostname:3111` | Renderer-Endpoint vom Browser aus |

# 7. Reconnect/Selbstheilung (Client)

Frame-Watchdog (4s eingefrorenes currentTime → sichtbares Overlay + Reconnect) → Backoff `1500ms×attempts` → nach 5 Fehlversuchen Status `error` → BrowserBlock holt frischen Stream-Token (TTL-Ablauf/Server-Restart) und startet neu. Server-Seite: Heartbeat (30s ping/pong, terminate nach 2 Fehlern), Handshake-Timeouts (Client 12s / Server 20s), Screencast-Restart bei CDP-Fehlern, hartes Session-Recycling bei CDP-Unantwortbarkeit.

# 8. Bekannte Follow-ups

1. Egress auf Proxy-Ebene (DNS-Rebinding-Schutz, zlib-frei), Session-Anzahl-Limit pro User, Chromium-Profil-Quota.
2. Hardware-Encodierung (aktuell libvpx software) falls NAS-CPU bei mehreren parallelen 1080p-Sessions limitiert.
3. History-Tabelle (`browser_history`) + DevTools-Forwarding (siehe alte Ziel-Spec §10) — noch nicht gebaut.
