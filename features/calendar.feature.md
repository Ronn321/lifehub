# CALENDAR FEATURE

## Goal

Familien-/Privat-Kalender im Outlook-/Google-Stil mit Multi-Kalender, Google-Zwei-Wege-Sync (OAuth2) und Personalisierung (Akzentfarbe, Hintergrundbild).

---

## Features

- **Vier Ansichten:** Monat / Woche / Tag / Agenda (`CalendarView = month | week | day | agenda`)
- **Multi-Kalender:** mehrere Kalender pro User (`calendars`-Tabelle), Sichtbarkeits-Toggle pro Kalender, automatischer lokaler Default „Mein Kalender"
- **Google-Sync (Zwei-Wege):** OAuth2-Verbindung (via `integrations`-Domain), selektive Google-Kalender-Importe, inkrementeller Sync (syncToken), Push lokal erstellter/geänderter Termine zu Google (best-effort)
- **Personalisierung (server-seitig):** Akzentfarbe, Hintergrundbild (URL + Overlay + Blur), Default-View, Wochenstart, Wochennummern (`GET/PUT /calendar/settings`)
- **Akzentfarben:** `--cal-*`-CSS-Variablen, Default = Hub-Brand-Akzent; Hub-weites Akzent-System (`lib/accent.ts`)
- **Event-Chips:** farbiger 2px-Linkbalken, Kalenderfarbe + 1F-Alpha-Hintergrund; EventDetailModal, EventDialog mit Kalender-Auswahl
- **Hintergrundbild-Semantik:** Lesbarkeits-Overlay `rgb(var(--bg) / overlay)` + `blur`, `CalendarBackground`-Komponente
- Wiederholende Termine (RRULE) — **Follow-up** (nicht in V1 umgesetzt)

---

## Entities

- **Event** (`events`): id, calendarId, title, description, startDate, endDate, allDay, location, color, category, calendarSource (`local | google | caldav`), externalId, ownerId
- **Calendar** (`calendars`): id, name, color, source, externalId (Google-Kalender-ID), ownerId, syncToken, lastSyncAt, isVisible
- **CalendarUserSettings** (`user_settings`): ownerId, accentColor, backgroundUrl, backgroundOverlay (0.85), backgroundBlur (12), defaultView, weekStart, showWeekNumbers
- **GoogleConnection** (aus `integrations.google_connections`, siehe integrations-Feature)

---

## Screens

- Kalender-Toolbar: „Heute", View-Switcher, Einstellungen, Google-Sync-Status/Aktion
- Kalender-Sidebar mit Sichtbarkeits-Toggles + Farb-Dots
- EventDetailModal, EventDialog (mit Kalender-Auswahl)
- Einstellungs-Panel: Akzentfarbe, Hintergrundbild (Transparenz + Blur), Google-Sync
- Google-Konto-Status via Settings-Tab „Google-Konto" (aus `integrations`)

---

## API

```
GET    /calendar/events?from=YYYY-MM-DD&to=YYYY-MM-DD
POST   /calendar/events
GET    /calendar/events/:id
PUT    /calendar/events/:id
DELETE /calendar/events/:id
GET    /calendar/settings
PUT    /calendar/settings
GET    /calendar/calendars
PATCH  /calendar/calendars/:id              # { isVisible }
GET    /calendar/google/status
GET    /calendar/google/calendars
POST   /calendar/google/calendars           # Kalender auswählen/importieren
DELETE /calendar/google/calendars/:id
POST   /calendar/google/sync                # Sync jetzt auslösen
```

---

## Rules

- **Idempotenz:** Sync upsertet per `externalId` pro Kalender — kein Duplikat bei Re-Sync; `deleteGoogleEventsMissing` entfernt gelöschte Google-Termine.
- **Inkrementell:** `syncToken` (nextSyncToken) wird nach jedem Lauf persistiert; Erst-Sync voll, danach Delta.
- **Fenster:** Sync-Fenster `-90d … +365d`.
- **Zeitzone:** Zeiten werden als naive lokale Timestamps gespeichert und via `calendar-timezone.ts` zwischen Europe/Berlin und Googles Offset-ISO konvertiert.
- **Cron:** automatischer Sync alle 15 min (`*/15 * * * *`) für alle User mit selektierten Google-Kalendern.
- **Zwei-Wege:** lokale CRUD auf `google`-Kalendern pusht best-effort nach Google; Push-Fehler brechen die lokale Operation nicht ab (Offline-Toleranz).
- **Sichtbarkeit:** `PATCH /calendar/calendars/:id` setzt `isVisible`; ausgeblendete Kalender bleiben gesynct, aber unsichtbar.
- **Settings:** Defaults `accentColor=null` (→ Hub-Brand), `backgroundOverlay=0.85`, `backgroundBlur=12`, `defaultView=month`, `weekStart=monday`, `showWeekNumbers=true`.

---

## Integrations

- **integrations** — Google-OAuth2-Verbindung, `GoogleConnectionService` (getStatus/getGoogleClient/getGmail)
- **users** — Eigentümer-Beziehung (`ownerId`)
