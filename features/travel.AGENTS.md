# travel.AGENTS.md

# LifeHub — `travel` Domain DOX Contract

Version: 1.0
Parent: `../AGENTS.md` → `../../AGENTS.md`

---

## 1. Purpose

Reise-/Urlaubsverwaltung. Eigene Landingpage pro Trip (z.B. „Italien 2025") mit Karte, Route, Tages-Timeline, Medien, Notizen, Dokumenten. **Phase 2, nach `media`.**

## 2. Scope

- Schema `travel`: `trips`, `destinations`, `trip_days`, `trip_media_refs`
- Trip-CRUD mit Cover-Image, Status (`planned | active | completed`)
- Trip-Detail-Landingpage
- Medien-Verknüpfung **per ID-Referenz** (kein Kopieren), Tag-für-Tag-Zuordnung
- Notizen (Markdown), Dokumenten-Anhänge (verweist auf `documents`-Domain)
- Routing auf Karte (Leaflet + OSRM, Phase 4)

## 3. Dependencies

- Spec: `travel.feature.md`
- DB: `DATABASE_SCHEMA.md` §6
- Architektur: `ARCHITECTURE.md` §4.4
- Status: `docs/DOMAIN_STATUS.md` (Life Modules)
- Vorgänger: `users` (`DONE`), `media` (`DONE`)

## 4. Work Guidance

- **Data Ownership:** `travel` besitzt Trips/Destinations/Tage, referenziert aber `media.media_files` **nur per ID** (kein JOIN, kein FK über Schema-Grenze).
- Cover-Image ist `media_id`-Referenz; Anzeige via `media`-API-Endpoint, nicht durch direkten Datei-Zugriff.
- Dokumente werden via `documents`-Domain-Referenz verlinkt, nicht eigenständig gespeichert.
- Tages-Timeline sortiert nach `day_date ASC` + `ord ASC` für wiederholte Einträge pro Tag.

## 5. Verification

- [x] Migration idempotent (DB-Tabellen existieren).
- [x] DB-Schema in Drizzle (`shared/db/src/schema/public.ts`).
- [ ] Trip-Erstellung mit Cover-Image, 3 Destinationen, 5 Tagen, 50 verknüpften Medien.
- [ ] Trip-Detail rendert mit Leaflet-Map und Marker-Cluster.
- [ ] Medien-Zuordnung pro Tag filterbar.
- [ ] Notizen im Markdown gerendert (XSS-Schutz, Sanitization).
- [ ] Permission-Tests: nur `read` für `child`, `update` für `family`, alles für `admin`.
- [ ] Audit + Events emittiert (Backend-Trigger vorhanden, Event-Emission fehlt noch).
- [ ] `DOMAIN_STATUS.md` auf `DONE`.
