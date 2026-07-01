# insurance.AGENTS.md

# LifeHub — `insurance` Domain DOX Contract

Version: 1.0
Parent: `../AGENTS.md` → `../../AGENTS.md`

---

## 1. Purpose

Versicherungsverträge mit Gesellschaft, Nummern, Beiträgen, Laufzeiten, Kündigungsfristen, Ansprechpartnern, Dokumenten. **Phase 3.**

## 2. Scope

- Schema `insurance`: `insurance_policies`, `insurance_documents`
- Kategorien: `health | liability | car | home | life | legal | other`
- Beitrags-Intervalle: `monthly | quarterly | yearly`
- Dokumenten-Anhänge (verweist auf `documents`-Domain-Schema, Storage über `StorageService`)
- Kündigungsfrist-Erinnerung via `calendar`-Domain (Phase 4+)
- Beitragsübersicht: Jahr-Summe, Monat-Schnitt

## 3. Dependencies

- Spec: `insurance.feature.md`
- DB: `DATABASE_SCHEMA.md` §11
- Architektur: `ARCHITECTURE.md` §4.10
- Status: `docs/DOMAIN_STATUS.md`
- Vorgänger: `users`, `documents` (für Doku-Anhänge)

## 4. Work Guidance

- Dokumente werden in der `documents`-Domain gespeichert (Data-Ownership), `insurance` referenziert per `document_id`.
- `cancellation_period_days` zusammen mit `ends_on` für automatische Erinnerung.
- Keine externe API für Versicherungs-Vergleich (Privacy by default).

## 5. Verification

- [ ] Migration idempotent.
- [ ] 10 Policen, 5 Kategorien, 20 Doku-Anhänge.
- [ ] Beitragsübersicht: korrekte Aggregation über Intervalle (monthly × 12 vs. yearly).
- [ ] Kündigungsfrist-Erinnerung erscheint im Kalender (Phase 4).
- [ ] Permission + Audit + Events.
- [ ] `DOMAIN_STATUS.md` auf `DONE`.
