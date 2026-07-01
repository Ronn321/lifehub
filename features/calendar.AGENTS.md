# calendar.AGENTS.md

# LifeHub — `calendar` Domain DOX Contract

Version: 1.0
Parent: `../AGENTS.md` → `../../AGENTS.md`

---

## 1. Purpose

Mehrere Kalender pro User, Familienkalender, externe Sync-Quellen (Google, CalDAV, ICS), Monat/Woche/Tag-Ansicht, Geburtstage aus `users`, Erinnerungen. **Phase 4.**

## 2. Scope

- Schema `calendar`: `calendars`, `events`, `event_attendees`, `event_reminders`
- Quellen: `local | google | caldav | ics`
- Wiederholende Termine (RFC 5545 `RRULE`)
- Externe `external_uid` für Re-Sync-Idempotenz
- Geburtstags-Kalender: automatisch aus `users.birthday` (Spalte ggf. ergänzen)
- Erinnerungen via Notification-Service (Phase 3+)

## 3. Dependencies

- Spec: `calendar.feature.md`
- DB: `DATABASE_SCHEMA.md` §14
- Architektur: `ARCHITECTURE.md` §4.15
- Status: `docs/DOMAIN_STATUS.md`
- Vorgänger: `users`
- Consumer: `travel` (Trip-Daten als Termine), `finance` (Billing-Reminder)

## 4. Work Guidance

- Externe Sync-Worker als separate Container/Prozesse (Google-Polling alle 15 min, CalDAV-Webhooks).
- `external_uid` muss stabil sein: bei Re-Sync kein Duplikat, sondern Update.
- `RRULE`-Parsing via `rrule.js` Bibliothek, nicht selbst implementieren.
- Google OAuth2 Tokens verschlüsselt in `public.users`-Erweiterung oder separater Tabelle (Phase 3).

## 5. Verification

- [ ] Migration idempotent.
- [ ] 3 Kalender (lokal, Google-Sync, ICS-Import), 50 Termine, 5 mit RRULE.
- [ ] Monatsansicht rendert < 500 ms mit 200 Terminen.
- [ ] Re-Sync: gleicher Google-Kalender 2× importiert → keine Duplikate.
- [ ] Geburtstags-Kalender aus `users`.
- [ ] Permission + Audit + Events.
- [ ] `DOMAIN_STATUS.md` auf `DONE`.
