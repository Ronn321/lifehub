# email.AGENTS.md

# LifeHub — `email` Domain DOX Contract

Version: 1.0
Parent: `../AGENTS.md` → `../../AGENTS.md`

---

## 1. Purpose

E-Mail-Clients im Hub als **Live-Proxy auf Gmail** über eine Google-Verbindung. Kein lokaler Mail-Speicher in V1 — alle Daten werden live über die Gmail-API des verbundenen Kontos gelesen/geschrieben.

## 2. Scope

- **Keine eigenen DB-Tabellen in V1** — reiner Proxy auf `integrations.google_connections`.
- Endpoints unter `@Controller('email')`, alle mit `JwtGuard` + `PermissionGuard`.
- 3-Spalten-UI (Ordner / Threads / Lesebereich), sandboxed iframe für HTML-Body.
- Status (Verbindung + Ungelesen) für Sidebar-Badge.
- Send/Reply/Forward via MIME-Builder (`services/mime.ts`).

## 3. Dependencies

- Spec: `email.feature.md`
- DB: **keine** (§14 betrifft calendar; email hat kein Schema — nur `docs/DOMAIN_STATUS.md`)
- Architektur: `ARCHITECTURE.md`
- Status: `docs/DOMAIN_STATUS.md`
- Vorgänger: `users`, **`integrations`** (Google-OAuth2 + Gmail-Client)
- **Public-Interface `integrations`:** `GoogleConnectionService` aus `@lifehub/integrations-domain` — `getGmail(ownerId)` liefert einen fertigen `gmail_v1`-Client, `getStatus(ownerId)` Verbindung + E-Mail. **Niemals** direkt auf die Google-API oder auf `google_connections`-Tokens zugreifen.

## 4. Work Guidance

- **Live-Proxy-Ansatz:** KEINE Tabellen, KEIN lokaler Mail-Cache in V1. Jede Anfrage ruft die Gmail-API auf. Skalierung/Persistenz sind bewusst Follow-ups.
- **Client-Bezug:** Gmail-Client ausschließlich über `this.google.getGmail(ownerId)` beziehen (Auto-Refresh + Verschlüsselung handled die `integrations`-Domain).
- **Verbindungs-Guard:** bei `getStatus().connected === false` → `UnauthorizedException('Keine Google-Verbindung.')` statt Gmail-Fehler.
- **Label-Mapping:** `buildQuery(labelId, q)` übersetzt UI-Ordner in Gmail-Suchqueries; neue Ordner hier erweitern, nicht duplizieren.
- **MIME:** Senden über `buildMimeMessage`, Antworten über `buildReplyMime` (setzt `In-Reply-To`/`References`, `AW:`-Präfix ohne Dopplung), Weiterleiten mit `WG:`-Präfix + Zitat-Block. `encodeHeaderValue` für RFC-2047-Handler.
- **Attachments:** Streaming via `users.messages.attachments.get`; `Content-Disposition` mit UTF-8-Filename. Kein Base64 im Antwort-Body.
- **Sandbox:** Frontend rendert `bodyHtml` in iframe `sandbox="allow-same-origin"` (ohne `allow-scripts`) — Tracking-/Schad-Skripte laufen nicht.
- **Permissions:** Domain `email`: `read` (status/threads/thread/detail/attachments), `create` (send/reply/forward), `update` (modify). `delete`/`share`/`admin` reserviert.
- **Paging:** `maxResults` auf 1–100 begrenzt; `pageToken` wird durchgereicht.

## 5. Verification

- [ ] Verbundenes Konto: `/email/threads` liefert reale INBOX-Threads mit Ungelesen-/Anhangs-Marker.
- [ ] Ohne Verbindung: `GET /email/status` → `connected:false`; Thread/Detail → 401.
- [ ] Send/Reply/Forward erzeugen echte Gmail-Nachrichten (Betreff-Präfix, References korrekt).
- [ ] Modify (Archiv/Papierkorb/Gelesen) ändert Labels in Gmail.
- [ ] Anhang-Download liefert korrektes `Content-Disposition` + Bytes.
- [ ] HTML-Body rendert im sandboxed iframe ohne Script-Ausführung.
- [ ] Permission: `read`/`create`/`update` korrekt auf Endpoints gemappt.
- [ ] `DOMAIN_STATUS.md` Status korrekt (DONE V1).
