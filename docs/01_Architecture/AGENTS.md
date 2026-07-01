# AGENTS.md (docs/01_Architecture/)

# LifeHub — Architecture DOX Contract

Version: 1.0
Framework: DOX (AGENTS.md hierarchy)
Parent: `../AGENTS.md` (MUSS vorher gelesen werden)

---

## 1. Purpose

Dieser Ordner enthält die **technische Architektur** von LifeHub: Domain-Struktur, Architekturentscheidungen, globale Regeln, ADRs und Architektur-Visionen (wie Pages Domain).

## 2. Local Files

| Datei | Zweck |
|-------|-------|
| `ARCHITECTURE.md` | Technische Architektur, DDD, Repository-Layout |
| `DOMAIN_MAP.md` | Domain-Beziehungsgraph |
| `GLOBAL_RULES.md` | RBAC, Data Ownership, Events, Extensions |
| `PAGE_SYSTEM_VISION.md` | Architekturvision der Pages Domain |
| `adr/ADR-0004-Pages-Domain.md` | ADR: Pages Domain (Block-System, TipTap, JSONB) |

## 3. Work Guidance

- Architektur-Entscheidungen mit globaler Wirkung gehören hier, nicht in `02_Features/`.
- ADRs werden bei neuen Architekturentscheidungen angelegt (`docs/01_Architecture/adr/ADR-XXXX-Titel.md`).
- Keine Domain-Specs hier — die gehören nach `features/`.
