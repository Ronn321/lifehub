# dashboard.AGENTS.md

# LifeHub — `dashboard` Domain DOX Contract

Version: 1.0
Parent: `../AGENTS.md` → `../../AGENTS.md`

---

## 1. Purpose

Persönliches Hub-UI. Widget-basiert, Drag & Drop, Layout pro User persistiert. Standard-Widgets für Media, Kalender, Finanzen, Einkaufslisten, Wetter, Sparziele, Projekte, Mediathek. **Phase 1.**

## 2. Scope

- Schema `dashboard`: `dashboard_layouts`, `widgets`
- Layout: `{ cols, rows, widgets: [{id, x, y, w, h, config}] }` als JSON
- Widget-System: jedes Widget hat `id`, `domain`, `default_size`, `config_schema` (JSON-Schema)
- Standard-Widgets (MVP): MediaWidget, CalendarWidget, WeatherWidget (Open-Meteo, kein Key)
- Drag & Drop mit `react-grid-layout` (Phase 2, MVP nur statische Anordnung)
- Persistierung: `PUT /api/v1/dashboard/layout`

## 3. Dependencies

- Spec: `dashboard.feature.md`
- DB: `DATABASE_SCHEMA.md` §17
- Architektur: `ARCHITECTURE.md` §4.2
- UI: `UI_UX.md` §6.1 (Dashboard-Detaillayout)
- Stack: `TECH_STACK.md` §2.6 (Zustand für Layout-State)
- Status: `docs/DOMAIN_STATUS.md`
- Vorgänger: `users`, `media` (für MediaWidget)

## 4. Work Guidance

- Widget-Renderer ist generisch: kennt nur `id` + `config`, ruft Domain-API des Widgets auf.
- Widget-Config wird per JSON-Schema validiert (`config_schema`), damit kaputte Layouts nicht persistieren.
- Open-Meteo für Wetter (kein API-Key, Privacy). Kein Google-Maps-Geocoding.
- Performance-Ziel: Dashboard rendert < 1s, Widget-Daten parallel via TanStack Query.

## 5. Verification

- [ ] Migration idempotent.
- [ ] 4 Standard-Widgets (Media, Kalender, Wetter, Sparziele-Stub) gerendert.
- [ ] Layout-Persistenz: Anordnung ändern → Reload → Anordnung identisch.
- [ ] Widget-Config: ungültige Config wird abgelehnt (400).
- [ ] Performance: Dashboard mit 8 Widgets in < 1s.
- [ ] Permission + Audit + Events (`DashboardLayoutUpdated`).
- [ ] `DOMAIN_STATUS.md` auf `DONE`.
