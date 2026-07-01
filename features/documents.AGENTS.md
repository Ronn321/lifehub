# documents.AGENTS.md

# LifeHub — `documents` Domain DOX Contract

Version: 1.0
Parent: `../AGENTS.md` → `../../AGENTS.md`

---

## 1. Purpose

Verträge, Rechnungen, Garantien, Anleitungen, Behördendokumente. OCR-Texterkennung, Volltext-Suche (Trigramm-Index), Verschlagwortung, Cross-References zu anderen Domains. **Phase 3.**

## 2. Scope

- Schema `documents`: `documents`, `document_tags`, `document_refs`
- OCR via Tesseract (Worker, `ocr_status: pending | processing | done | failed`)
- Trigramm-Volltextsuche (`pg_trgm`-Index, GIN)
- Cross-Reference-Tabelle: zeigt auf `finance.transactions`, `insurance.policies`, etc.
- Garantie-Tracker via `expires_at`
- Storage über `StorageService`

## 3. Dependencies

- Spec: `documents.feature.md`
- DB: `DATABASE_SCHEMA.md` §13
- Architektur: `ARCHITECTURE.md` §4.12
- Stack: `TECH_STACK.md` §3.5 (Worker-Queue, BullMQ)
- Status: `docs/DOMAIN_STATUS.md`
- Vorgänger: `users`, `storage` (Shared), `search` (für globale Suche, optional in MVP)

## 4. Work Guidance

- OCR asynchron im Worker, niemals im Request-Thread.
- `ocr_text` ist Klartext (für Suche), Original-Datei bleibt im Storage (verschlüsselt at rest optional).
- `document_refs` ist die offizielle Cross-Reference — andere Domains, die auf Dokumente verweisen, nutzen **diese** Tabelle, nicht eigene.
- Trigramm-Index auf `ocr_text` muss manuell nach Migration angelegt werden (kein Auto-Create aus Drizzle).

## 5. Verification

- [ ] Migration idempotent.
- [ ] Trigramm-Index `documents_ocr_trgm_idx` existiert nach Migration.
- [ ] OCR-Worker verarbeitet 3 Test-PDFs (Rechnung, Vertrag, Garantie).
- [ ] Volltextsuche: „Strom" findet Rechnung in < 200ms.
- [ ] Cross-Reference: Rechnung mit `finance.transactions` verknüpft, erscheint in Transaction-Detail.
- [ ] Permission + Audit + Events.
- [ ] `DOMAIN_STATUS.md` auf `DONE`.
