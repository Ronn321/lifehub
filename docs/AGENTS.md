# AGENTS.md (docs/)

# LifeHub — `docs/` DOX Contract

Version: 1.0
Framework: DOX (AGENTS.md hierarchy)
Parent: `../AGENTS.md` (MUSS vorher gelesen werden)

---

## 1. Purpose

Dieser Ordner `docs/` enthält die **Master-Orchestrierung** des Projekts: Feature-Architektur, Domain-Beziehungen, globale Regeln, Agent-Execution-Reihenfolge, Live-Status, Boilerplates, NAS-Deployment. Alle Dateien hier sind **Single Source of Truth** für ihren Scope (siehe Root-`AGENTS.md` §5).

---

## 2. Ownership

`docs/AGENTS.md` ist verantwortlich für:

- Pflege und Kohärenz aller 7 Dateien in `docs/`
- Sicherstellung, dass keine `AGENTS.md`-Inhalte dupliziert werden
- Verweise auf Root-`AGENTS.md` und externe Master-Specs im Root (`PLAN.md`, `ARCHITECTURE.md`, `DATABASE_SCHEMA.md`, `TECH_STACK.md`, `UI_UX.md`, `ROADMAP.md`)

`docs/` enthält **keinen ausführbaren Code** und **keine Domain-Specs** (die liegen in `features/`).

---

## 3. Local Contracts

### 3.1 Dateien in `docs/`

| Datei | Zweck | Pflicht-Update bei |
|-------|-------|---------------------|
| `FEATURE_SPEC.md` | Master-Feature-System, Cross-Domain-Regeln | jeder Änderung an Domain-übergreifenden Feature-Regeln |
| `DOMAIN_MAP.md` | Domain-Beziehungsgraph | jeder neuen Cross-Domain-Beziehung |
| `GLOBAL_RULES.md` | RBAC, Data Ownership, Events, Extensions | jeder Auth-, Permission-, Ownership-, Event-Regel |
| `AGENT_EXECUTION_SYSTEM.md` | Vertical-Slice, Phasen, Reihenfolge | jeder Phasen-, Reihenfolge- oder DoD-Änderung |
| `DOMAIN_STATUS.md` | Live-Status pro Domain | jeder Status-Transition einer Domain |
| `CODE_GENERATION_TEMPLATES.md` | Boilerplate-Skelette | jeder Template-Änderung |
| `DOCKER_COMPOSE_PRODUCTION.md` | NAS-Deployment | jeder Compose-, Container-, Mount-, Secret-Änderung |

### 3.2 Schreibregeln für `docs/*.md`

- **Single Source of Truth:** jede Information lebt in **genau einer** Datei. Andere Dateien verweisen, sie duplizieren nicht.
- **DOX-konform:** jede Datei folgt implizit der Struktur Purpose / Ownership / Local Contracts / Work Guidance / Verification / Child DOX Index (wo passend).
- **Tabellen statt Prosa** wo immer möglich (kürzer, leichter zu pflegen).
- **Konkrete Beispiele** in Code-Blöcken, nicht als Fließtext.
- **Verweise auf Master-Specs im Root** statt Inhalte zu kopieren.

### 3.3 Beziehung zu Root-Master-Specs

Inhalte aus `docs/`-Dateien dürfen **nicht** gegen `PLAN.md`, `ARCHITECTURE.md`, `DATABASE_SCHEMA.md`, `TECH_STACK.md`, `UI_UX.md`, `ROADMAP.md` verstoßen. Wenn ein Konflikt auftritt:

1. Root-Master-Spec gewinnt für Inhalt und Korrektheit.
2. `docs/`-Datei muss aktualisiert werden, um konsistent zu sein.
3. Parent-`AGENTS.md` (`../AGENTS.md`) wird über den Konflikt informiert (DOX Pass).

### 3.4 Beziehung zu `features/`

`features/<name>.feature.md` darf **nicht** Cross-Domain-Regeln, Permissions, Event-Typen oder API-Standards **neu definieren**. Diese kommen aus `docs/FEATURE_SPEC.md`, `docs/GLOBAL_RULES.md`, `docs/DOMAIN_MAP.md`. Domain-Specs verweisen darauf.

---

## 4. Work Guidance

### 4.1 Wann diese `AGENTS.md` lesen?

Immer wenn **eine Datei in `docs/`** gelesen oder geändert werden soll.

### 4.2 Wann diese `AGENTS.md` aktualisieren?

- neue Datei in `docs/` angelegt → hier im Child DOX Index ergänzen
- Scope-Änderung einer bestehenden `docs/`-Datei → Tabelle §3.1 anpassen
- Vertragsänderungen (Schreibregeln, Konflikt-Regel) → §3 anpassen + Parent informieren

### 4.3 Wann NICHT in `docs/` schreiben?

- Domain-spezifische User Stories, API-Endpoints, Entitäten → `features/<name>.feature.md`
- SQL-DDL → `DATABASE_SCHEMA.md` (Root)
- UI-Komponenten, Design-Tokens → `UI_UX.md` (Root)
- Implementierungs-Reihenfolge pro Domain → `DOMAIN_STATUS.md` (Tabellen reichen)
- Konkrete Code-Boilerplates > 50 Zeilen → `docs/CODE_GENERATION_TEMPLATES.md`

---

## 5. Verification

Aktuell **keine automatische Verifikation** für `docs/`. Manuell:

- [ ] jede `docs/`-Änderung: ist die Information schon in einer anderen Datei (vermeide Duplikation)?
- [ ] sind alle Verweise (`→ siehe …`) noch aktuell (Link-Rot-Check)?
- [ ] ist der **Child DOX Index** in dieser Datei konsistent mit den real existierenden `docs/`-Dateien?
- [ ] nach größeren Edits: Root-`AGENTS.md` §5 und §10 re-lesen, ob neue Querverweise nötig sind.

Sobald CI existiert (Phase MVP): Link-Checker als Job.

---

## 6. Child DOX Index

| Datei | Owns | Pflicht-Read bei |
|-------|------|------------------|
| `FEATURE_SPEC.md` | Master-Feature-System, Cross-Domain-Regeln | Cross-Domain-Fragen, Definition of Done |
| `DOMAIN_MAP.md` | Domain-Beziehungsgraph | Cross-Domain-ID-Referenzen |
| `GLOBAL_RULES.md` | RBAC, Data Ownership, Events, Extensions | Auth, Permission, Ownership, Events |
| `AGENT_EXECUTION_SYSTEM.md` | Vertical-Slice, Phasen, Reihenfolge, DoD | Domain-Implementierungs-Reihenfolge |
| `DOMAIN_STATUS.md` | Live-Status pro Domain (Tabellen) | Status-Transition |
| `CODE_GENERATION_TEMPLATES.md` | Boilerplate-Skelette | Code-Datei in `domains/` oder `apps/` |
| `DOCKER_COMPOSE_PRODUCTION.md` | NAS-Deployment | Compose-, Container-, Mount-, Secret-Änderung |
| `GRAPHIFY.md` | Knowledge-Graph-Workflow (graphify) | Tool-Install, Watch-/Hook-Workflow, Korpus-Erweiterung |

Keine Sub-Ordner. Wenn künftig z.B. `docs/adr/` entsteht, bekommt **er** eine eigene `AGENTS.md` und wird hier im Index aufgenommen.
