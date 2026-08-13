# calendar.AGENTS.md

# LifeHub — `calendar` Domain DOX Contract

Version: 1.1
Parent: `../AGENTS.md` → `../../AGENTS.md`

---

## 1. Purpose

Mehrere Kalender pro User, Familienkalender, Google-Zwei-Wege-Sync (OAuth2), Monat/Woche/Tag/Agenda-Ansicht, Personalisierung (Akzentfarbe, Hintergrundbild), Erinnerungen. **Phase 4.**

## 2. Scope

- Tabellen (public-Schema, via `shared/db`): `calendars`, `events` (`calendar_events`), `user_settings`, plus `event_attendees`, `event_reminders` (Drizzle-Schema vorhanden)
- Migration `0019_calendar_sync_columns.sql` ergänzt `calendars` um `sync_token`, `last_sync_at`, `is_visible` — **nicht** im `shared/db`-Drizzle-Schema; `CalendarsRepository` liest/schreibt sie per Raw-SQL
- Quellen: `local | google | caldav`
- Google-Sync-Service: idempotent via `externalId`, inkrementell via `syncToken`, Fenster -90d/+365d, Cron alle 15 min
- Zwei-Wege-Schreibpfad (`pushEvent`, `deleteEvent`) best-effort
- Kalender-Auswahl/Verbindung delegiert an `integrations.google_connections`
- **Follow-up (nicht V1):** RRULE/Wiederholungen, Geburtstagskalender aus `users`, CalDAV, ICS-Import, Event-Erinnerungen, Drag&Drop

## 3. Dependencies

- Spec: `calendar.feature.md`
- DB: `DATABASE_SCHEMA.md` §14
- Architektur: `ARCHITECTURE.md` §4.15
- Status: `docs/DOMAIN_STATUS.md` (System Modules)
- Vorgänger: `users`, **`integrations`** (Google-OAuth2)
- **Public-Interface `integrations`:** `GoogleConnectionService` aus `@lifehub/integrations-domain` (getStatus / buildAuthUrl / handleCallback / disconnect / getGoogleClient / getGmail). Nur via dieses Service auf Google zugreifen, niemals direkt.
- Consumer: `travel` (Trip-Daten als Termine), `finance` (Billing-Reminder)

## 4. Work Guidance

- **Sync-Idempotenz:** `externalId` (Google-Event-ID) muss pro Kalender stabil sein — `upsertByExternalId` aktualisiert statt dupliziert; `deleteGoogleEventsMissing` bereinigt gelöschte Google-Termine.
- **syncToken:** nach jedem Lauf als `nextSyncToken` persistieren (`updateSyncToken`); Erst-Sync voll, danach Delta. Bei 410/„syncToken invalid" Voll-Sync mit `syncToken=null` wiederholen.
- **Zeitzonen-Regel:** Backend speichert **naive lokale** Timestamps (Europe/Berlin). Alle Google-↔-lokal-Konversionen zentral in `services/calendar-timezone.ts` (`googleToLocal`, `localToOffsetIso`, `localDateForAllDay`) — nie verstreut im Repo neu implementieren.
- **Cron:** `@Cron('*/15 * * * *')` in `CalendarSyncService`; erntet Owner mit selektierten Google-Kalendern via `findGoogleOwners()`. Fehler pro Kalender/User loggen, nicht abbrechen.
- **Kalender-Auswahl:** `calendars`-Tabelle pro User mit `external_id` (Google-Kalender-ID). Idempotenter Upsert über Unique-Index `(owner_id, source, external_id) WHERE deleted_at IS NULL` (Migration 0018). Die Spalte heißt **`name`** (nicht `title`).
- **Google-Config via ENV in `.env`:** `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, `GOOGLE_TOKEN_ENCRYPTION_KEY`, `FRONTEND_URL`. Keine Secrets im Code (Dev-Fallback `dev-key-do-not-use-prod` nur für lokale Tests).
- **Verschlüsselung:** OAuth-Tokens AES-256-GCM via `lib/token-crypto.ts` (in `integrations`-Domain); Tokens niemals im Klartext loggen oder per API exponieren.
- **Permissions:** Domain `calendar`, Aktionen `read|create|update|delete|share|admin`. Settings: `read`/`update`; Google-Sync-Endpoints `update`/`read`.
- **Controller-Pfade:** `calendar/events`, `calendar/settings`, `calendar/calendars`, `calendar/google/*` — `CalendarModule` MUSS in `app.module.ts` registriert sein.

## 5. Verification

- [ ] Migration idempotent (0017, 0018, 0019).
- [ ] 2 Kalender (lokal „Mein Kalender", Google), 50 Termine; `PATCH /calendar/calendars/:id` toggelt Sichtbarkeit.
- [ ] Google-Kalender auswählen → Sync importiert Termine ohne Duplikate (2× Sync = 1× Datensatz).
- [ ] Inkrementell: zweiter Sync nutzt syncToken (Delta), gelöschte Google-Termine verschwinden lokal.
- [ ] Lokal Termin in Google-Kalender anlegen → wird nach Google gepusht (externalId gesetzt); Push-Fehler bricht lokale Anlage nicht ab.
- [ ] Settings: `PUT/GET /calendar/settings` persistiert Akzent/Hintergrund/View; Defaults korrekt.
- [ ] 4 Ansichten (Monat/Woche/Tag/Agenda) rendern; Event-Chips mit 2px-Linkbalken + Farb-Alpha.
- [ ] Permission + Audit + Events.
- [ ] `DOMAIN_STATUS.md` Status korrekt.
