# EMAIL FEATURE

## Goal

E-Mail-Clients im Hub als **Live-Proxy auf Gmail** (Google-Konto). Kein lokaler Mail-Speicher in V1 — gelesen/geschrieben wird direkt über die Gmail-API der verbundenen Google-Verbindung.

---

## Features

- **3-Spalten-Layout:** Ordner-Liste / Thread-Liste / Lesebereich (sandboxed iframe)
- **Ordner:** Posteingang, Gelesen, Archiv, Papierkorb, Gesendet (Label-Mapping INBOX / ARCHIVE / TRASH / SENT → Gmail-Query), Paging via `pageToken`
- **Aktionen:** Verfassen (send), Antworten (einfach/alle), Weiterleiten, Archivieren, Papierkorb, Als gelesen markieren (Thread-Modify add/remove labels)
- **Threads:** Liste mit Absender/Betreff/Snippet/Ungelesen/Anhangs-Marker; Detail mit vollständiger Nachricht (HTML + Text)
- **Anhänge:** Download via `GET /email/messages/:id/attachments/:att`
- **Ungelesen-Badge:** Sidebar-Badge mit ungelesener Posteingang-Zahl (`GET /email/status`)
- **Keine DB-Tabellen in V1** — Live-Proxy-Ansatz

---

## Entities

- **EmailThreadSummary** (id, subject, from, to, date, snippet, unread, hasAttachment, labels)
- **EmailMessage** (id, from, to, cc, subject, date, bodyHtml, bodyText, snippet, labelIds, attachments)
- **EmailAttachment** (id, filename, mimeType, size)
- **EmailStatus** (connected, email, unreadInbox)

(Reine Typen — kein Persistenz-Modell.)

---

## Screens

- `/email`: 3-Spalten-Mail-Client
- Lesebereich: HTML-Body in **sandboxed iframe** (`allow-same-origin`, ohne `allow-scripts`)
- Compose-Dialog (Verfassen/Antworten/Weiterleiten)
- Settings-Tab „Google-Konto" (GoogleAccountCard) steuert die Verbindung (aus `integrations`)

---

## API

```
GET    /email/status
GET    /email/threads?labelId=INBOX&pageToken=...&q=...
GET    /email/threads/:id
POST   /email/send
POST   /email/reply/:threadId
POST   /email/forward/:messageId
POST   /email/threads/:id/modify      # { addLabelIds, removeLabelIds }
GET    /email/messages/:messageId/attachments/:attachmentId
```

---

## Rules

- **Kein lokaler Store in V1:** alle Daten kommen live aus Gmail; keine eigenen Mail-Tabellen.
- **Verbindung erforderlich:** ohne verbundenes Google-Konto → 401/Empty-State mit „Jetzt verbinden".
- **Label-Mapping:** `INBOX`/`SENT`/`TRASH`/`ARCHIVE` werden in Gmail-Suchqueries (`in:inbox`, `in:sent`, `in:trash`, `-in:inbox`) übersetzt (`buildQuery` in `gmail.service.ts`).
- **MIME:** Senden/Antworten/Weiterleiten via `services/mime.ts`-Builder (`buildMimeMessage`, `buildReplyMime`, `encodeHeaderValue`).
- **Antworten:** Betreff-Präfix `AW:`/`Re:` nicht doppeln; `References`/`In-Reply-To` werden korrekt gesetzt; `replyAll` bereinigt eigene Adresse.
- **Weiterleiten:** Betreff-Präfix `WG:`; Original-Nachricht als Zitat-Block eingefügt.
- **Permissions:** Domain `email`, Aktionen `read|create|update` (Status/Listen/Detail/Anhang = read; send/reply/forward = create; modify = update). `delete`/`share`/`admin` reserviert, aktuell ungenutzt.

---

## Integrations

- **integrations** — Google-OAuth2-Verbindung, `GoogleConnectionService.getGmail(ownerId)` (Gmail-Client), `getStatus` (Verbindung + Ungelesen)
- **users** — Eigentümer (`ownerId`)
