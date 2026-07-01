# search.AGENTS.md

# LifeHub — `search` Domain DOX Contract

Version: 1.0
Parent: `../AGENTS.md` → `../../AGENTS.md`

---

## 1. Purpose

Globale Suche über **alle** Domains. `⌘K` / `Ctrl+K` Command-Palette, Result-Cards mit Domain-Icon, Filter-Chips. Backend: Meilisearch mit einem Index pro Domain. Indexer-Worker konsumiert Domain-Events. **Phase 4.**

## 2. Scope

- Schema `search` (Analytics): `search_queries`, `search_clicks`
- Meilisearch-Indizes: `media`, `recipes`, `projects`, `documents`, `wiki_pages`, `jellyfin_items`, `devices`, `finance_transactions`, `insurance_policies`
- Indexer-Worker: lauscht auf `public.domain_events`, indiziert/aktualisiert
- `GET /api/v1/search?q=…&domain=…&limit=…` — global, mit optionalem Domain-Filter
- Frontend: Command-Palette (`⌘K`), Result-Vorschau

## 3. Dependencies

- Spec: `search.feature.md`
- DB: `DATABASE_SCHEMA.md` §17
- Architektur: `ARCHITECTURE.md` §4.16
- Stack: `TECH_STACK.md` §5.2 (Meilisearch-Konfiguration)
- Status: `docs/DOMAIN_STATUS.md`
- Vorgänger: `users`, **alle** Domain-Indexer (Phase X hängt davon ab, wie viele Domains schon indexieren)

## 4. Work Guidance

- Search-Index **ist kein Primary-Storage** — Postgres bleibt Source of Truth, Meilisearch ist derived state.
- Re-Index-Job bei Schema-Änderungen: vollständiger Domain-Index neu aufbauen.
- Pro Index: `searchableAttributes` mit Priorität (z.B. bei recipes: `title` > `description` > `ingredients.name`).
- `filterableAttributes`: `owner_id` (immer), Domain-spezifische Filter.
- Privacy: ein User sieht nur seine eigenen Indexeintrge — Filter `owner_id` MUSS in jeder Query erzwungen sein, kein Opt-Out.
- Query-Analytics in `search_queries`, Click-Analytics in `search_clicks` — beide für spätere UX-Verbesserungen.

## 5. Verification

- [ ] Migration idempotent.
- [ ] 6 Domain-Indizes (media, recipes, projects, documents, jellyfin_items, devices).
- [ ] Indexer-Worker: 1000 Medien-Items indiziert in < 30s.
- [ ] `⌘K` + "Italien" findet Reise, Fotos, Dokumente in < 200ms.
- [ ] Cross-User-Test: User A sucht nach Item von User B → 0 Results (Privacy-Filter).
- [ ] Re-Index nach Recipe-Schema-Update: alle 50 Rezepte neu indexiert.
- [ ] `DOMAIN_STATUS.md` auf `DONE`.
