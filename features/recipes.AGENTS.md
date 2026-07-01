# recipes.AGENTS.md

# LifeHub — `recipes` Domain DOX Contract

Version: 1.0
Parent: `../AGENTS.md` → `../../AGENTS.md`

---

## 1. Purpose

Digitales Familien-Kochbuch. Rezepte mit Zutaten, Schritten, Bildern, Videos, Nährwerten, Tags, Quellen (manuell, URL, YouTube, PDF, Buch). Portionen-Slider, Import-Workflow, Vorbereitung für MorphCook-Integration. **Phase 2.**

## 2. Scope

- Schema `recipes`: `recipes`, `ingredients`, `steps`, `recipe_tags`
- Quellen: `manual | url | youtube | pdf | book`
- Portionen-Slider skaliert Zutaten linear (Mengenangaben, Zeiten bleiben)
- URL-Import: Schema-org Scraper mit Whitelist (Chefkoch, Lecker, etc.)
- YouTube-Embed (gleiche Sanitisierung wie `projects`)
- Nährwerte: manuell + optionaler Import aus USDA-API (Phase 2+)
- Tag-System aus `public.tags`
- API-Endpunkt für MorphCook: `GET /api/v1/recipes?ids=…`

## 3. Dependencies

- Spec: `recipes.feature.md`
- DB: `DATABASE_SCHEMA.md` §8
- Architektur: `ARCHITECTURE.md` §4.7
- Status: `docs/DOMAIN_STATUS.md`
- Vorgänger: `users`, `media`
- Consumer: `shopping` (Rezept-zu-Einkaufsliste), MorphCook-App (extern)

## 4. Work Guidance

- Rezept-Daten sind **nicht verschlüsselt** (anders als Vault). Nährwerte sind öffentlich-pro-Familie.
- URL-Import: serverseitig in Worker, Rate-Limit pro Domain (max 100/h).
- „Auf Einkaufsliste"-Aktion erzeugt `shopping.shopping_items` mit `recipe_ref_id`.
- YouTube-Sanitisierung identisch zu `projects` (zentraler Helper in `shared/`).

## 5. Verification

- [ ] Migration idempotent.
- [ ] Rezept-Erstellung, Update, Delete mit allen 5 Quellen-Typen.
- [ ] Portionen-Slider: 4 Portionen → 8 Portionen skaliert alle Mengen korrekt.
- [ ] Schema-org-Scraper mit 3 Test-URLs (Chefkoch, Lecker, eigene Quelle).
- [ ] YouTube-Sanitisierung + Markdown-Sicherheit.
- [ ] API-Endpunkt für MorphCook liefert JSON mit Zutaten/Schritten.
- [ ] Permission + Audit + Events (`RecipeUpdated` emittiert).
- [ ] `DOMAIN_STATUS.md` auf `DONE`.
