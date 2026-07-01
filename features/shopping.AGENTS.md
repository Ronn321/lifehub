# shopping.AGENTS.md

# LifeHub — `shopping` Domain DOX Contract

Version: 1.0
Parent: `../AGENTS.md` → `../../AGENTS.md`

---

## 1. Purpose

Geteilte Einkaufslisten mit Live-Sync (WebSocket), Mehrfach-Listen, Rezept-Integration, MorphCook-Sync-Vorbereitung. **Phase 2.**

## 2. Scope

- Schema `shopping`: `shopping_lists`, `shopping_items`
- Mehrere Listen mit `color`, `store`, `archived`
- Items: Menge, Einheit, Kategorie, `checked`, `checked_by`, `ord`
- Live-Sync via WebSocket (Redis Pub/Sub Backbone)
- Rezept-Integration: „Rezept auf Einkaufsliste" aggregiert Zutaten
- REST-API für MorphCook: `POST /api/v1/shopping-lists`, `POST /api/v1/shopping-lists/{id}/items`, `GET /api/v1/shopping-lists/{id}`

## 3. Dependencies

- Spec: `shopping.feature.md`
- DB: `DATABASE_SCHEMA.md` §9
- Architektur: `ARCHITECTURE.md` §4.8
- Status: `docs/DOMAIN_STATUS.md`
- Vorgänger: `users`, `recipes`
- Externe Konsumenten: MorphCook-App (API-Vertrag in OpenAPI-Spec dokumentiert)

## 4. Work Guidance

- WebSocket-Endpoint `/ws/shopping` mit JWT-Auth (Phase 1) — Redis Pub/Sub für Multi-Instance (später, MVP ist single-instance).
- Beim Check/Uncheck WebSocket-Event an alle verbundenen Clients.
- Mengen-Aggregation aus Rezept: gleiche Zutat (Name + Einheit) wird zusammengeführt.
- API-Vertrag für MorphCook MUSS im OpenAPI-Spec versioniert sein (`/v1/shopping/sync`).
- Offline-Verhalten für Mobile: Clients puffern, beim Reconnect Deltas synchronisieren (Phase 3+).

## 5. Verification

- [ ] Migration idempotent.
- [ ] Liste + Items CRUD, Reihenfolge via `ord` stabil.
- [ ] WebSocket: 2 Clients verbunden, einer checked Item, der andere sieht Update < 500 ms.
- [ ] Rezept-Integration: 3 Rezepte mit überlappenden Zutaten → korrekte Aggregation.
- [ ] API-Konformität mit MorphCook-Spec (OpenAPI-Schema-Validierung).
- [ ] Permission + Audit + Events.
- [ ] `DOMAIN_STATUS.md` auf `DONE`.
