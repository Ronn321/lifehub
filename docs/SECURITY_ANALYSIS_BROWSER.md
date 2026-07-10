# Sicherheitsanalyse: LifeHub Browser-Implementierung

**Datum:** 2026-07-09  
**Geprüfte Komponenten:** Browser Controller, Proxy Controller, Puppeteer Renderer, SearXNG, Frontend iframe, CSP/Helmet-Konfiguration  
**Kontext:** LifeHub läuft auf einem NAS im privaten Tailscale-Netzwerk

---

## Zusammenfassung

Die Browser-Komponente enthält **3 kritische, 4 mittlere und 2 kleinere Sicherheitslücken**. Die kritischsten Probleme sind das **Fehlen von Auth-Guards** (zwei Controller sind ungeschützt), das **SSRF-Risiko** (beliebige URLs werden serverseitig gefetcht) und die **global geteilte Chrome-Instanz ohne Sandbox**. Das System ist durch Tailscale zwar vom öffentlichen Internet isoliert, aber jeder Client im Tailscale-Netzwerk (oder bei kompromittiertem Frontend) kann diese Lücken ausnutzen.

---

## Kritische Sicherheitsprobleme (CVSS 8.0–9.5)

### K-01: Fehlende Auth-Guards auf Browser- und Proxy-Controller

**Betroffene Dateien:** `domains/pages/src/api/browser.controller.ts`, `domains/pages/src/api/proxy.controller.ts`  
**Vergleich:** `domains/pages/src/api/pages.controller.ts` Zeile 24 — `@UseGuards(JwtGuard, PermissionGuard)` ist vorhanden.  
**CVSS-ähnlich:** 9.1 (AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N)  
**Begründung:** Unauthenticated Access, volle Read/Write-Fähigkeit auf jedem internen HTTP-Endpunkt über den Proxy.

**Auswirkung:** Jeder Client, der das Netzwerk erreicht (Tailscale-Peers, kompromittierte Geräte, Mitbewohner), kann:
- **GET /api/v1/browser/proxy?url=<beliebig>** — serverseitiges Rendering jeder URL
- **POST /api/v1/browser/proxy?url=<beliebig>** — Form-Submissions durch den Proxy
- **GET /api/v1/proxy?url=<beliebig>** — direkten HTTP-Proxy ohne Chrome
- **GET /api/v1/browser/screenshot?url=<beliebig>** — Screenshots beliebiger Seiten

Der `PagesController` (der echte Auth-Schutz hat) und die Browser/Proxy-Controller **leben im selben Modul** (`pages.module.ts`), was die Inkonsistenz besonders auffällig macht.

**Prüfung möglich durch:** `curl http://<lifehub>:3007/api/v1/proxy?url=http://google.com` ohne jeden Auth-Header.

---

### K-02: SSRF (Server-Side Request Forgery) — Kritisch

**Betroffene Dateien:**  
- `browser.controller.ts` Zeilen 9, 15, 51, 57, 92, 97 — akzeptiert `@Query('url')` ohne Einschränkungen
- `proxy.controller.ts` Zeilen 7, 11, 19, 23 — akzeptiert `@Query('url')` ohne Einschränkungen
- `infrastructure/browser-renderer/server.js` Zeilen 141, 147, 175, 183 — ebenso ungefiltert

**CVSS-ähnlich:** 9.0 (AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:L)  
**Begründung:** Volle Netzwerkerkundung möglich, kein Auth nötig (kombiniert mit K-01).

**Auswirkung:** Die einzige Prüfung ist `url.startsWith('http')` (browser.controller.ts Zeile 10, proxy.controller.ts Zeile 8). Damit sind folgende Angriffe möglich:

| Ziel | Auswirkung |
|------|-----------|
| `http://127.0.0.1:5432` | PostgreSQL-Datenbank (kein externes Auth wenn `trust`) |
| `http://127.0.0.1:6379` | Redis-Befehle via CRLF-Injection im URL-Pfad |
| `http://postgres:5432` (Docker-intern) | DB-Zugriff im internen Docker-Netzwerk |
| `http://cache:6379` | Redis-Zugriff |
| `http://search:7700` | Meilisearch-Admin-Endpunkt (Master-Key könnte erraten werden) |
| `http://searxng:8080` | SearXNG-intern |
| `http://[::1]:3007` | Loopback auf den eigenen Backend-Service |
| `http://metadata.google.internal/` | Nur relevant falls auf Google Cloud; aber andere Cloud-Metadaten-Endpunkte |
| `http://169.254.169.254/` | Cloud-Metadaten (AWS, GCP, Azure) |
| `file:///etc/passwd` | Wird durch `startsWith('http')` blockiert, aber `http://127.0.0.1:80/../../etc/passwd` könnte Verzeichnistraversale triggern |

**Speziell `proxy.controller.ts`:** Fetcht direkt ohne Chrome — gibt **rohen HTML/JSON-Inhalt** zurück. Das ist der gefährlichste SSRF-Vektor, weil er keine Chrome-Sandbox durchlaufen muss und binäre Protokolle erreichen kann.

**Speziell `browser.controller.ts`:** Der Chrome-Prozess rendert die Seite vollständig (JavaScript). Damit können auch Client-seitige Angriffe auf Chrome-interne Seiten (`chrome://`) gestartet werden.

---

### K-03: Chrome läuft ohne Sandbox mit `SYS_ADMIN` und `--single-process`

**Betroffene Dateien:**  
- `infrastructure/browser-renderer/server.js` Zeilen 12–16
- `docker-compose.yml` Zeilen 98–99 (`cap_add: SYS_ADMIN`)

**CVSS-ähnlich:** 8.5 (AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:L/A:L)  
**Begründung:** Vollständiger Escape aus dem Chrome-Container bei gerenderter bösartiger Seite.

**Flags im Detail:**

| Flag | Problem |
|------|---------|
| `--no-sandbox` | Chrome-Prozesse sind nicht isoliert. Ein Exploit in Chrome = Host-Codeausführung im Container. |
| `--disable-setuid-sandbox` | Alternativer Sandbox-Mechanismus deaktiviert. |
| `--single-process` | Alle Tabs teilen einen Prozess — ein abstürzender/crashbarer Tab reißt alle mit. |
| `cap_add: SYS_ADMIN` | Gewährt dem Container weitreichende Sysadmin-Rechte (mount, namespace ops). In Kombination mit `--no-sandbox` völlig überdimensioniert. |
| `--disable-blink-features=AutomationControlled` | Nur legitim — versteckt Automation. |

**Auswirkung:** Wird eine bösartige Website im Browser-Renderer geladen, kann diese Chrome-eigene Schwachstellen ausnutzen. Da Chrome ohne Sandbox läuft, ist der Container nicht geschützt. Mit `SYS_ADMIN` kann ein Angreifer den Container verlassen oder andere Container angreifen.

---

## Mittlere Sicherheitsprobleme (CVSS 5.0–7.5)

### M-01: CSP-Header extrem aufgeweicht, `frame-ancestors *` erlaubt Clickjacking

**Betroffene Dateien:**  
- `browser.controller.ts` Zeilen 45, 86: `default-src 'self' 'unsafe-inline' 'unsafe-eval' https: http: data: blob:; frame-ancestors *;`
- `proxy.controller.ts` Zeile 55: `default-src 'self' 'unsafe-inline' 'unsafe-eval' https: http: data:; frame-ancestors *;`
- `infrastructure/searxng/settings.yml` Zeile 30: `frame-ancestors *;`
- `apps/backend/src/main.ts` Zeile 16: `app.use(helmet())` — wird durch die Controller überschrieben

**CVSS-ähnlich:** 7.0 (AV:N/AC:L/PR:N/UI:R/S:C/C:H/I:L/A:N)

**Einzelprobleme der CSP:**

| CSP-Direktive | Problem |
|---------------|---------|
| `frame-ancestors *` | **Clickjacking**: Jede externe Website kann LifeHub in einem iframe einbetten und User zu Aktionen verleiten |
| `default-src … http:` | Erlaubt HTTP-Quellen — ermöglicht MitM für Skripte und Styles |
| `unsafe-inline` | Erlaubt inline-Skripte — XSS in beliebigem Kontext kann dann Code ausführen |
| `unsafe-eval` | Erlaubt `eval()` — weitere XSS-Vektoren |
| `default-src … blob: data:` | Erlaubt Daten-URIs als Skriptquellen |

**Helmet-Override:** `main.ts` setzt `app.use(helmet())` mit sicheren Defaults (kein `frame-ancestors *`, kein `unsafe-inline`). Die Controller **überschreiben** diese globalen Header pro Request. Helmet wäre ohne die Overrides sicher.

**SearXNG CSP:** `frame-ancestors *` erlaubt ebenfalls Clickjacking auf den SearXNG-Dienst.

---

### M-02: `X-Frame-Options` explizit entfernt

**Betroffene Dateien:**  
- `browser.controller.ts` Zeilen 44, 85: `res.removeHeader('X-Frame-Options')`
- `proxy.controller.ts` Zeile 54: `res.removeHeader('X-Frame-Options')`
- `searxng/settings.yml` Zeile 29: `X-Frame-Options: ""` (leerer Wert)
- `main.ts` (indirekt): Helmet setzt `X-Frame-Options: SAMEORIGIN`, wird aber überschrieben

**CVSS-ähnlich:** 6.5 (AV:N/AC:L/PR:N/UI:R/S:C/C:L/I:L/A:N)

**Auswirkung:** `X-Frame-Options: SAMEORIGIN` verhindert, dass eine Seite in fremden iframes eingebettet wird. Die Entfernung erlaubt explizit die Einbettung. In Kombination mit `frame-ancestors *` gibt es **keinen Schutz vor Clickjacking**. Ein Angreifer kann:
1. Eine täuschend echte Kopie der LifeHub-Oberfläche erstellen
2. Den echten LifeHub-Browser in einem unsichtbaren iframe laden
3. User zu Aktionen verleiten (z.B. "Klicken Sie hier, um zu bestätigen")

**Warum wurde es entfernt?** Die Browser-Komponente braucht iframe-Einbettung — aber nur innerhalb der LifeHub-Frontend-Seite. Die Lösung wäre `frame-ancestors 'self'` statt kompletter Entfernung.

---

### M-03: Iframe-Sandbox erlaubt `allow-top-navigation` und `allow-same-origin` + `allow-scripts`

**Betroffene Datei:** `apps/frontend/src/app/(dashboard)/browser/page.tsx` Zeile 181

**Aktuelle Sandbox:**  
`sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-top-navigation"`

**CVSS-ähnlich:** 7.5 (AV:N/AC:L/PR:N/UI:R/S:C/C:H/I:H/A:N)

**Risiko-Analyse:**

| Attribut | Sicherheitsauswirkung |
|----------|----------------------|
| `allow-top-navigation` | Der iframe kann `window.top.location.href` ändern und den User auf eine Phishing-Seite umleiten. Ermöglicht Top-Navigation-Navigation-Spoofing. |
| `allow-same-origin` + `allow-scripts` | **Bekannte Sicherheitslücke**: Diese Kombination erlaubt es dem iframe, auf die DOM-API des Parent-Fensters zuzugreifen und Session-Cookies zu lesen. Der iframe gilt als "same-origin" und hat vollen Zugriff auf `window.parent`. |
| `allow-popups` | Der iframe kann Popup-Fenster öffnen (zusätzlicher Phishing-Vektor). |
| `allow-forms` | Formular-Submission aus dem iframe heraus — notwendig für Funktionalität, aber in Kombination mit `allow-top-navigation` kann ein Formular die Parent-Seite navigieren. |

**Gesamt-Risiko:** Ein Angreifer, der eine Seite im Browser-iframe lädt (z.B. via Redirect), kann:
1. Auf das Parent-DOM zugreifen (`allow-same-origin` + `allow-scripts`)
2. Session-Tokens klauen
3. Die Parent-Seite auf eine Phishing-Seite navigieren (`allow-top-navigation`)

---

### M-04: Keine Authentifizierung auf dem Puppeteer-Microservice

**Betroffene Datei:** `infrastructure/browser-renderer/server.js` Zeilen 121–211

**CVSS-ähnlich:** 7.0 (AV:A/AC:L/PR:N/UI:N/S:C/C:L/I:L/A:L)

**Auswirkung:**
- **Endpunkte:** `/content` (POST), `/screenshot` (POST), `/health` (GET) — alle ohne Auth
- **CORS:** `Access-Control-Allow-Origin: *` (Zeile 126) — jeder darf von überall im Netzwerk aufrufen
- **Port 3111** (docker-compose.yml Zeile 95) ist auf dem Host exponiert
- Der Service ist **ohne Browserless-Token** konfiguriert (server.js Zeilen 19–21: `BROWSERLESS_TOKEN` wird gesetzt wenn vorhanden, aber es gibt keine Prüfung)

Jeder Container im Docker-Netzwerk oder jeder Client mit Zugriff auf Port 3111 kann:
- Beliebige Seiten rendern lassen
- Screenshots erstellen
- Den Chrome-Prozess durch viele Requests lahmlegen

---

## Kleinere Sicherheitsprobleme (CVSS 2.0–4.5)

### KLE-01: CORS wildcard auf dem Backend

**Betroffene Datei:** `docker-compose.yml` Zeile 12: `CORS_ORIGINS: '*'`  
**Backend-Logik (main.ts Zeilen 18–25):** Erlaubt `*` — gibt jeden Origin ohne Einschränkung frei.

**CVSS-ähnlich:** 4.0 (AV:N/AC:L/PR:N/UI:R/S:U/C:L/I:N/A:N)

In einem privaten Tailscale-Netzwerk ist das Risiko gering, aber bei einem Tailscale-kompromittierten Client oder einem Browser-Plugin, das lokale Requests macht, können API-Aufrufe von jeder Website ausgehen. **Empfehlung:** Auf die tatsächliche Frontend-URL einschränken.

---

### KLE-02: Shared State / Keine Cookie-Isolation zwischen Browser-Blocks

**Betroffene Datei:** `infrastructure/browser-renderer/server.js`  
**Globale Variable:** `let browser` (Zeile 5) — **eine** Browser-Instanz für alle Requests.

**CVSS-ähnlich:** 3.5 (AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:L)

**Auswirkung:**
- Alle geteilten Sessions teilen sich **einen** Chrome-Prozess (`--single-process`), **ein** Profil, **einen** Cache, **einen** Cookie-Store
- User A besucht `http://example.com/login` und logged sich ein → User B sieht im nächsten Request die eingeloggte Session
- Cookies, LocalStorage, IndexedDB sind global geteilt
- Keine Isolation zwischen verschiedenen Browser-Blocks oder Research-Sessions

Die Zielarchitektur (isolierte Sessions pro Browser-Block) ist nicht implementiert.

---

### KLE-03: Regex-basiertes URL-Rewriting ist fehleranfällig

**Betroffene Dateien:**  
- `browser.controller.ts` Zeilen 36–41, 78–83
- `proxy.controller.ts` Zeilen 40–51
- `server.js` Zeilen 152–158

**CVSS-ähnlich:** 3.0 (AV:N/AC:H/PR:N/UI:R/S:C/C:N/I:L/A:N)

**Probleme:**
- **Kein SPA-Routing:** `src="/` und `href="/` werden nur für statische Pfade ersetzt. Single-Page-Apps, die über `history.pushState` oder `fetch` navigieren, funktionieren nicht korrekt (Teile der Seite laden aus der falschen Quelle).
- **Regex-Injection:** In `proxy.controller.ts` Zeile 37 wird `escapedOrigin` via `RegExp` verwendet — korrekt escaped, aber komplex und fehleranfällig bei unerwarteten URLs.
- **Form-Action-Rewriting nur auf Root-Ebene:** Formulare mit relativen Actions wie `action="submit.php"` (ohne führenden `/`) werden nicht erfasst.
- **`base`-Tag-Override:** Wenn die geladene Seite ein `<base href="...">`-Tag hat, greifen die Rewrites nicht mehr korrekt.

---

## Empfohlene Gegenmaßnahmen

Nach Priorität geordnet — **sofort umsetzen** (Kritisch), **zeitnah** (Mittel), **langfristig** (Klein).

### Sofort (Critical) — nächster Release

| # | Maßnahme | Aufwand | Effekt |
|---|----------|---------|--------|
| 1 | **Auth-Guards auf BrowserController und ProxyController setzen** — `@UseGuards(JwtGuard, PermissionGuard)` auf Klassenebene (wie in `pages.controller.ts` Zeile 24). Alternativ auf Modulebene in `pages.module.ts`. | Gering | Schließt K-01 |
| 2 | **URL-Allowlist für SSRF-Schutz implementieren** — Nur explizit erlaubte Domains/IP-Bereiche dürfen angefragt werden. Private IPs (127.0.0.0/8, 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, ::1/128) blocken. `node:net`-basierte IP-Validierung. | Mittel | Schließt K-02 |
| 3 | **Proxy-Controller-Route entfernen oder schützen** — Der direkte HTTP-Proxy (`/api/v1/proxy`) ohne Chrome ist der gefährlichste SSRF-Vektor. Entweder löschen oder mit den strengsten Guards + Allowlist versehen. | Gering | Schließt K-02 (Proxy) |
| 4 | **Chrome-Sandbox aktivieren** — `--no-sandbox` entfernen, `--disable-setuid-sandbox` entfernen, `cap_add: SYS_ADMIN` entfernen. Docker-Container mit `seccomp=default` und `no-new-privileges: true` starten. | Gering | Schließt K-03 |

### Zeitnah (Medium)

| # | Maßnahme | Aufwand | Effekt |
|---|----------|---------|--------|
| 5 | **CSP verschärfen** — `frame-ancestors 'self'` statt `*`. `http:` aus `default-src` entfernen. `unsafe-inline` durch Nonce- oder Hash-basierte Policy ersetzen. Alle Overrides in den Controllern auf das notwendige Minimum reduzieren. | Mittel | Schließt M-01 |
| 6 | **X-Frame-Options wieder aktivieren** — Statt `removeHeader('X-Frame-Options')` auf `X-Frame-Options: SAMEORIGIN` setzen, kombiniert mit `frame-ancestors 'self'` in der CSP. | Gering | Schließt M-02 |
| 7 | **Iframe-Sandbox verschärfen** — `allow-top-navigation` entfernen (nicht nötig für Browser-Funktionalität). `allow-same-origin` + `allow-scripts` trennen — falls möglich `allow-scripts` entfernen oder den Proxy auf eine separate Subdomain legen, sodass Same-Origin nicht greift. | Gering | Schließt M-03 |
| 8 | **Auth-Token für Puppeteer-Service einführen** — Den `BROWSERLESS_TOKEN` zwingend setzen und im Service prüfen. Den Container-Port 3111 nicht auf dem Host exposen, wenn nicht nötig. Docker-Netzwerk-internen Zugriff ausreichend. | Gering | Schließt M-04 |

### Langfristig (Low)

| # | Maßnahme | Aufwand | Effekt |
|---|----------|---------|--------|
| 9 | **CORS-Origin einschränken** — Statt `*` die tatsächliche Frontend-URL eintragen. | Gering | KLE-01 |
| 10 | **Session-Isolation pro Browser-Block** — Puppeteer-Browser-Context („Incognito") pro Research-Session. `browser.createIncognitoBrowserContext()` erzeugt isolierte Cookie-Stores. | Mittel | KLE-02 |
| 11 | **URL-Rewriting durch Proxy-Architektur ersetzen** — Statt Regex-Rewriting serverseitig einen echten Reverse Proxy verwenden, der relative URLs korrekt auflöst und SPA-Routing unterstützt. | Hoch | KLE-03 |

---

## Priorisierte Roadmap

```
Woche 1:  Auth-Guards + SSRF-Allowlist + Chrome-Sandbox aktivieren
          → 3 kritische Lücken geschlossen

Woche 2:  CSP verschärfen + X-Frame-Options
          + Iframe-Sandbox + BROWSERLESS_TOKEN
          → 4 mittlere Lücken geschlossen

Woche 3:  CORS einschränken + Incognito-Contexts
          + Proxy-Rewrite evaluieren
          → 3 kleine Lücken geschlossen
```

---

##  Gesamtbilanz

| Stufe | Anzahl | CVSS-Range |
|-------|--------|------------|
| Kritisch | 3 | 8.5 – 9.1 |
| Mittel | 4 | 6.5 – 7.5 |
| Klein | 3 | 3.0 – 4.0 |

**Bemerkung:** Alle drei kritischen Lücken (K-01, K-02, K-03) sind durch das private Tailscale-Netzwerk teilweise mitigiert. Da Tailscale aber Zero-Trust-Networking ist und jeder authentifizierte Client im Netzwerk diese Endpunkte erreichen kann, ist das **kein ausreichender Schutz**. Die Lücken sind mit geringem Aufwand zu schließen.
