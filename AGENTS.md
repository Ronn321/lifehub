# AGENTS.md (Root)

# LifeHub — Root DOX Rail

Version: 1.0
Framework: DOX (AGENTS.md hierarchy)

> **DOX in diesem Projekt:** Jeder Agent MUSS vor jeder nicht-trivialen Bearbeitung die AGENTS.md-Kette vom Repo-Root bis zum bearbeiteten Pfad lesen. Die Kette bestimmt, welche Master-Specs, Domain-Specs, DB-Schemata, Stack- und Design-Regeln für die aktuelle Aufgabe verbindlich sind.

---

## 1. Project Purpose

LifeHub ist eine private, selbst gehostete Webplattform für die Organisation des gesamten Familien- und Privatlebens (Fotos, Reisen, Rezepte, Finanzen, Vault, Haus-IT, Jellyfin-Mediathek, Plugins). Läuft auf einem NAS, erreichbar über Tailscale. 16 Bounded Contexts, Modular Monolith, vertikale Umsetzung, DDD, Plugin-ready.

Vollständige Vision und Anforderungen: `PLAN.md` (MUSS gelesen werden).

---

## 2. Root-Ownership

Diese Root-`AGENTS.md` ist der **DOX-Rail** für das gesamte Projekt. Sie definiert:

- globale Agent-Workflow-Regeln
- User-Präferenzen
- zwingende Reihenfolge für Code-Arbeit
- Verweise auf die kanonischen Master-Dokumente
- den **Child DOX Index** (Liste aller lokalen AGENTS.md-Dateien)

Sie **ersetzt keine** der Master-Spec-Dateien — sie verweist auf sie.

---

## 3. Read-Before-Editing (DOX Core Contract)

**Vor jeder Bearbeitung eines Pfads:**

1. Diese Root-`AGENTS.md` lesen.
2. Alle Pfade identifizieren, die bearbeitet werden.
3. Vom Repo-Root zu jedem Zielpfad wandern.
4. Jede `AGENTS.md` auf dem Weg lesen.
5. Wenn eine Parent-`AGENTS.md` eine Child-`AGENTS.md` listet, deren Scope den Pfad enthält → Child lesen, von dort weiter.
6. Die **nähere** `AGENTS.md` ist der lokale Vertrag; weiter entfernte definieren repo-weite Regeln.
7. Bei Konflikt: nähere Datei gewinnt für lokale Details, **aber kein Child darf DOX schwächen**.

**Verbot:** Sich auf Erinnerung verlassen. Kette in der aktuellen Session erneut lesen.

---

## 4. Update-After-Editing (DOX Pass)

Nach jeder inhaltlichen Änderung ist ein **DOX Pass** Pflicht, **bevor die Aufgabe als erledigt gilt**.

Aktualisiere die **nächste** zuständige `AGENTS.md`, wenn sich etwas ändert an:

- Zweck, Scope, Ownership oder Verantwortlichkeiten
- dauerhafter Struktur, Verträgen, Workflows oder Betriebsregeln
- erforderlichen Inputs/Outputs, Permissions, Constraints, Seiteneffekten, Artefakten
- User-Präferenzen (Verhalten, Kommunikation, Prozess, Organisation, Qualität)
- AGENTS.md-Erstellung, -Löschung, -Verschiebung, -Umbenennung oder -Index

Aktualisiere **Parent-Docs**, wenn sich Parent-Level-Struktur, Ownership, Workflow oder Child-Index ändert. Aktualisiere **Child-Docs**, wenn eine Parent-Änderung lokale Regeln verändert. Lösche veraltete oder widersprüchliche Texte sofort. Kleine Edits, die weder Verhalten noch Verträge ändern, dürfen die Docs unberührt lassen — der DOX Pass findet trotzdem statt.

---

## 5. Verbindliche Master-Dokumente

Diese Dateien sind **Single Source of Truth** für die jeweilige Domäne. Agenten MÜSSEN sie konsultieren, sobald ihr Scope berührt ist.

| Thema | Kanonische Datei | Pflicht bei |
|-------|------------------|-------------|
| Vision, Anforderungen, Phasen | `PLAN.md` | jeder Änderung am Produkt-Scope |
| Technische Architektur, DDD | `ARCHITECTURE.md` | Struktur-, Modul-, Vertragsentscheidungen |
| DB-Schemata, SQL-DDL | `DATABASE_SCHEMA.md` | jeder DB-, Migration-, Entity-Änderung |
| Technologie-Entscheidungen | `TECH_STACK.md` | jeder Library-/Framework-Entscheidung |
| Design-System, UX | `UI_UX.md` | jeder UI-, Komponenten-, Style-, Layout-Änderung |
| Umsetzungs-Roadmap | `ROADMAP.md` | jeder Phasen- oder Task-Reihenfolge-Änderung |
| Feature-Architektur (Master) | `docs/FEATURE_SPEC.md` | jeder Domain-übergreifenden Feature-Regel |
| Domain-Beziehungsgraph | `docs/DOMAIN_MAP.md` | jeder Cross-Domain-Referenz |
| Globale Regeln (RBAC, Data Ownership) | `docs/GLOBAL_RULES.md` | jeder Auth-, Permission-, Ownership-Änderung |
| Vertical-Slice-Reihenfolge | `docs/AGENT_EXECUTION_SYSTEM.md` | jeder Implementierungs-Reihenfolge-Frage |
| Live-Status pro Domain | `docs/DOMAIN_STATUS.md` | jeder Status-Änderung |
| Boilerplates | `docs/CODE_GENERATION_TEMPLATES.md` | jeder Code-Datei in `domains/` oder `apps/` |
| NAS-Deployment | `docs/DOCKER_COMPOSE_PRODUCTION.md` | jeder Compose-, Container-, Mount-, Secret-Änderung |
| Deployment-Workflow | `docs/DEPLOYMENT.md` | jeder CI/CD-, Registry-, Build-, Versionierungs-Änderung |
| Container-Deployment-Plan | `CONTAINER_DEPLOYMENT_PLAN.md` | jeder Plan-, Status-, Fortschritts-Änderung |
| Knowledge-Graph-Workflow | `docs/GRAPHIFY.md` | Tool-Setup, Korpus-Erweiterung, Workflow-Änderung |

**Regel:** Wenn zwei Quellen widersprechen, gewinnt die **nähere** Datei für lokale Details, aber keine darf die obigen Master-Regeln aushebeln.

---

## 6. Globale Agent-Workflow-Regeln

### 6.1 Vertical Slice (verbindlich)

Jede Domain wird vollständig implementiert, **bevor** die nächste begonnen wird:

1. Domain-Modell (Entities)
2. DB-Schema
3. Repository-Layer
4. Service-Layer (Business-Logic)
5. API-Layer (Controller + Guards + OpenAPI)
6. UI-Layer
7. Permissions
8. Tests (Unit + API + Permission)
9. Audit-Logging
10. Dokumentation

Reihenfolge der Domains: `docs/AGENT_EXECUTION_SYSTEM.md` §3.2.

### 6.2 Single Active Domain

**Nur eine Domain darf `IN_PROGRESS` sein** (siehe `docs/DOMAIN_STATUS.md` Rule 4). Vor dem Start: Status auf `IN_PROGRESS`. Nach Abschluss: auf `DONE`. Bei Blocker: `BLOCKED` + Begründung.

### 6.3 No Cross-Domain Implementation

Eine Domain darf **nicht**:

- interne Logik einer anderen Domain importieren
- direkt auf DB-Tabellen einer anderen Domain zugreifen
- API-Grenzen umgehen

Erlaubt: ID-Referenzen, Aufrufe über dokumentierte Domain-APIs.

### 6.4 Schema First

Innerhalb einer Domain: erst Entity, dann DB-Schema, dann Repository, dann Service, dann API, dann UI. Keine UI vor API. Keine API vor DB.

### 6.5 Definition of Done (global)

System ist „fertig", wenn:

- alle Domains `DONE` in `docs/DOMAIN_STATUS.md`
- Plugin-System aktiv
- Suche vereinheitlicht
- Permissions konsistent
- Backup getestet
- NAS-Integration stabil

Pro Domain: siehe `docs/AGENT_EXECUTION_SYSTEM.md` §14.

### 6.6 Commit-Konvention

Conventional Commits:

- `feat(<domain>): …` — neues Feature
- `fix(<domain>): …` — Bugfix
- `docs(dox): …` — Doku/AGENTS.md
- `chore: …` — Tooling, Build
- `refactor(<domain>): …` — interne Umstrukturierung

---

## 7. User-Präferenzen (dauerhaft)

Robert (Windows, deutsche Sprache):

- **Sprache:** Deutsch für Chat und UI-Texte. Code-Kommentare englisch.
- **Autonomie:** „Mach alles" = sofort umsetzen, keine Rückfragen.
- **Fehlerbehandlung:** still diagnostizieren und fixen, nicht endlos fragen.
- **Verifikation:** bei App-Builds Screenshot machen, nicht nur Exit-Code trauen.
- **Projekt-Lokation:** `C:\Users\Robert_D_AZ_1\Documents\LifeHub\`.
- **Verwandte Projekte:** MorphCook (Flutter, fast fertig), RobertWeb (Portfolio).
- **Stack-Präferenz:** OpenCode Desktop primär, Ollama lokal + OpenCode Go Cloud, ECC-Toolkit.
- **RobertWeb-Designsystem:** Amber-Akzent `#d97706`, Inter, clean-minimal — nicht direkt für LifeHub-Defaults, aber als Referenz dokumentiert.

Präferenzen werden **hier** gepflegt, nicht in Domain-AGENTS.md. Nur lokale Verhaltensänderungen gehören in Child-Docs.

---

## 8. Stack-Quick-Reference (TL;DR)

- **Frontend:** Next.js 14 (App Router), TypeScript strict, Tailwind, shadcn/ui, TanStack Query, Zustand
- **Backend:** NestJS 10, Drizzle ORM, Argon2id, JWT RS256
- **DB:** PostgreSQL 16, PgBouncer (Phase 2+)
- **Cache/Queues:** Redis 7, BullMQ
- **Suche:** Meilisearch v1.8
- **Storage:** NAS-Mount, S3-Stub
- **Infra:** Docker Compose, Traefik v3, Tailscale
- **Kosten:** 0 € Software, ~80 €/Jahr Strom NAS

Vollständige Begründung: `TECH_STACK.md`.

---

## 9. Verzeichnis-Layout (verbindlich)

```
LifeHub/
├── apps/{frontend,backend}/
├── domains/<name>/{entities,services,repositories,api,ui,tests,migrations}/
├── shared/{auth,permissions,storage,audit,events,utils}/
├── infrastructure/{postgres,redis,traefik,tailscale,observability}/
├── docs/                        ← Master-Specs + DOX-Orchestrierung
├── features/<name>.feature.md   ← 16 Domain-Specs (flach)
├── features/<name>.AGENTS.md    ← 16 Domain-AGENTS.md (parallel)
├── PLAN.md / ARCHITECTURE.md / DATABASE_SCHEMA.md
├── TECH_STACK.md / UI_UX.md / ROADMAP.md
├── README.md
└── AGENTS.md                    ← diese Datei (DOX Root Rail)
```

Jeder dauerhafte Ordner (apps/, domains/, shared/, infrastructure/, features/, docs/) bekommt eine eigene lokale `AGENTS.md`. Sub-AGENTS.md für einzelne Domains werden parallel zur jeweiligen `<name>.feature.md` angelegt.

---

## 10. Child DOX Index

Lokale `AGENTS.md`-Dateien (näher am Work = spezifischer):

| Pfad | Owns | Muss gelesen werden bei |
|------|------|-------------------------|
| `docs/AGENTS.md` | Master-Specs, Doku, Status, Templates, Deployment | Änderungen in `docs/`, `README.md`, `PLAN.md`, `ARCHITECTURE.md`, `DATABASE_SCHEMA.md`, `TECH_STACK.md`, `UI_UX.md`, `ROADMAP.md` |
| `features/AGENTS.md` | Alle 16 Domain-Specs, neuer Domain-Spec-Workflow | Änderungen an `features/*.feature.md` oder `features/*.AGENTS.md` |
| `features/users.AGENTS.md` | users-Domain-Spec | `features/users.feature.md`-Änderungen |
| `features/media.AGENTS.md` | media-Domain-Spec | `features/media.feature.md`-Änderungen |
| `features/travel.AGENTS.md` | travel-Domain-Spec | `features/travel.feature.md`-Änderungen |
| `features/projects.AGENTS.md` | projects-Domain-Spec | `features/projects.feature.md`-Änderungen |
| `features/recipes.AGENTS.md` | recipes-Domain-Spec | `features/recipes.feature.md`-Änderungen |
| `features/shopping.AGENTS.md` | shopping-Domain-Spec | `features/shopping.feature.md`-Änderungen |
| `features/finance.AGENTS.md` | finance-Domain-Spec | `features/finance.feature.md`-Änderungen |
| `features/insurance.AGENTS.md` | insurance-Domain-Spec | `features/insurance.feature.md`-Änderungen |
| `features/vault.AGENTS.md` | vault-Domain-Spec | `features/vault.feature.md`-Änderungen |
| `features/documents.AGENTS.md` | documents-Domain-Spec | `features/documents.feature.md`-Änderungen |
| `features/calendar.AGENTS.md` | calendar-Domain-Spec | `features/calendar.feature.md`-Änderungen |
| `features/email.AGENTS.md` | email-Domain-Spec | `features/email.feature.md`-Änderungen |
| `features/integrations.AGENTS.md` | integrations-Domain-Spec | `features/integrations.feature.md`-Änderungen |
| `features/it_inventory.AGENTS.md` | it_inventory-Domain-Spec | `features/it_inventory.feature.md`-Änderungen |
| `features/jellyfin.AGENTS.md` | jellyfin-Domain-Spec | `features/jellyfin.feature.md`-Änderungen |
| `features/search.AGENTS.md` | search-Domain-Spec | `features/search.feature.md`-Änderungen |
| `features/dashboard.AGENTS.md` | dashboard-Domain-Spec | `features/dashboard.feature.md`-Änderungen |
| `features/plugins.AGENTS.md` | plugins-Domain-Spec | `features/plugins.feature.md`-Änderungen |

Wenn `apps/`, `domains/`, `shared/` oder `infrastructure/` mit Code-Inhalt angelegt werden, erhalten **sie** eigene `AGENTS.md` (Code-Wurzel-Kontrakte: NestJS-Conventionen, Drizzle-Patterns, etc.). Bis dahin sind die Master-Specs ausreichend.

---

## 11. DOX Pass — Closeout Checklist

Vor Task-Abschluss:

1. Geänderte Pfade gegen die DOX-Kette re-prüfen.
2. Nächste zuständige `AGENTS.md` aktualisieren.
3. Alle betroffenen **Parent**-`AGENTS.md` aktualisieren (Child-Index, falls nötig).
4. Alle betroffenen **Child**-`AGENTS.md` aktualisieren.
5. Veraltete oder widersprüchliche Texte entfernen.
6. Falls vorhanden, Verifikation laufen lassen (siehe jeweilige Domain-AGENTS.md).
7. Im Abschluss-Bericht dokumentieren, welche DOX-Docs absichtlich nicht angefasst wurden und warum.

---

## 12. Style-Guidance (für DOX-Docs)

- Knapp, aktuell, operativ.
- Stabile Verträge dokumentieren, keine Tagebucheinträge.
- Breite Regeln in Parents, konkrete Details in Children.
- Direkte Bullets mit expliziten Namen bevorzugen.
- Regeln **nicht** über viele Dateien duplizieren, außer jede Scope braucht eine lokale Version.
- Veraltete Notizen löschen, nicht erklären.
- Offensichtliche Aussagen, wiederholte Regeln, fehlplatzierte Details und Warnungen vor nicht mehr existenten Risiken trimmen.

---

## 13. Work Guidance (root-level)

Aktuell **leer** (DOX-Default: leer lassen, wenn keine spezifischen Standards existieren). Befüllung erfolgt, sobald:

- erste Code-Iteration in `domains/users/` startet (dann werden sich Patterns herauskristallisieren)
- die ersten 3 Domains `DONE` sind und Velocity-Daten für realistischere Guidance vorliegen

---

## 14. Verification (root-level)

Aktuell **leer** (DOX-Default: leer lassen, bis ein Verifikations-Framework existiert). Geplant:

- CI-Pipeline (GitHub Actions) gemäß `TECH_STACK.md` §8.4
- `pnpm -r typecheck && pnpm -r lint && pnpm -r test` als Pre-Commit
- NAS-Docker-Smoke-Test (Phase MVP)

Wird aktiviert, sobald die erste Domain (`users`) `IN_PROGRESS` geht.
