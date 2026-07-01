# AGENTS.md (features/)

# LifeHub — `features/` DOX Contract

Version: 1.0
Framework: DOX (AGENTS.md hierarchy)
Parent: `../AGENTS.md` (MUSS vorher gelesen werden)

---

## 1. Purpose

Dieser Ordner `features/` enthält die **16 Domain-Feature-Specs** (User Stories, Screens, API, Regeln pro Bounded Context) sowie die **parallelen Domain-AGENTS.md**-Dateien, die den DOX-Vertrag pro Domain kapseln.

Jede Domain-Spec folgt implizit dem Muster: **Goal → Features → Entities → Screens/API → Rules → Akzeptanzkriterien**.

---

## 2. Ownership

`features/AGENTS.md` ist verantwortlich für:

- Kohärenz der 16 Domain-Specs (`<name>.feature.md`)
- Kohärenz der 16 Domain-AGENTS.md (`<name>.AGENTS.md`)
- Erkennung von Cross-Domain-Widersprüchen → Eskalation an `docs/AGENTS.md` bzw. Root-`AGENTS.md`
- Konsistenz mit den Master-Specs im Root

`features/` enthält **keine** Cross-Domain-Regeln, Permissions-Modelle oder globale API-Standards — die gehören in `docs/`.

---

## 3. Local Contracts

### 3.1 Datei-Paarung pro Domain

Pro Domain existieren **zwei** Dateien nebeneinander:

| Datei | Inhalt | Editor-Verantwortung |
|-------|--------|----------------------|
| `<name>.feature.md` | Domain-Spec (was die Domain leistet) | Mensch + Agent gemeinsam |
| `<name>.AGENTS.md` | DOX-Vertrag (wie der Agent die Domain zu lesen/ändern hat) | primär Agent |

### 3.2 Pflichtinhalt jeder `<name>.feature.md`

(Siehe ChatGPT-Originalstruktur, übernommen aus Dialog, beibehalten in der heutigen Form)

```markdown
# <NAME> FEATURE

## Goal
[1–2 Sätze Zweck der Domain]

## Features
[Aufzählung der Funktionen]

## Entities
[Aufzählung der Aggregate / Entitäten]

## Screens
[für UI-Domains]

## API
[Endpoints, falls sinnvoll]

## Rules
[Domänenspezifische Regeln]

## Integrations
[optional, externe Abhängigkeiten]
```

### 3.3 Pflichtinhalt jeder `<name>.AGENTS.md`

```markdown
# <name> AGENTS.md
[Parent-Verweis]
[Purpose / Scope-Statement]
[Dependencies: Welche anderen Domains / Master-Specs sind Pflicht]
[Work Guidance: Konkrete Hinweise zur Domain-Implementierung]
[Verification: Wie wird getestet, dass die Domain fertig ist]
[Status: Direkter Verweis auf DOMAIN_STATUS.md]
```

### 3.4 Schreibregeln

- Eine Domain-Spec darf **keine** andere Domain referenzieren **außer** über ID-Typen (`media_id`, `user_id`, `recipe_id`, …). Cross-Domain-Geschäftslogik ist verboten.
- API-Endpoints folgen `/api/v1/<resources>`-Konvention (siehe `docs/GLOBAL_RULES.md` + `ARCHITECTURE.md` §7).
- Permission-Aktionen sind immer eines von `read | create | update | delete | share | admin` (siehe `DATABASE_SCHEMA.md` §4.4).
- Event-Namen folgen `<Domain><PastTense>`-Konvention (`MediaCreated`, `TransactionAdded`).

---

## 4. Work Guidance

### 4.1 Wann diese `AGENTS.md` lesen?

Immer wenn **eine Datei in `features/`** gelesen oder geändert werden soll.

### 4.2 Wann diese `AGENTS.md` aktualisieren?

- neue Domain hinzugefügt → Domain-Spec + Domain-AGENTS.md anlegen, hier in §6 (Child DOX Index) eintragen
- Domain umbenannt → Dateien umbenennen, Root-`AGENTS.md` §10 aktualisieren, `docs/DOMAIN_MAP.md` prüfen
- Schreibregel (§3.4) geändert → alle bestehenden Domain-Specs gegenchecken

### 4.3 Wann NICHT in `features/` schreiben?

- DB-DDL → `DATABASE_SCHEMA.md` (Root)
- UI-Komponenten-Code → `apps/frontend/` (Code-Root) oder `UI_UX.md` für Design-Tokens
- Cross-Domain-Regel → `docs/FEATURE_SPEC.md` oder `docs/GLOBAL_RULES.md`
- DDD-Beziehungsgraph-Update → `docs/DOMAIN_MAP.md`

### 4.4 DOX-Pass pro Domain

Vor jeder Änderung an einer Domain:

1. Diese `AGENTS.md` lesen.
2. Die zuständige `<name>.AGENTS.md` lesen.
3. Die zugehörige `<name>.feature.md` lesen.
4. `docs/AGENTS.md` lesen.
5. Root-`AGENTS.md` lesen.
6. Pflicht-Master-Specs der Domain lesen (siehe jeweilige Domain-AGENTS.md „Dependencies").

---

## 5. Verification

Aktuell **keine automatische Verifikation** für `features/`. Manuell:

- [ ] jede neue Domain: gibt es **beide** Dateien (`<name>.feature.md` UND `<name>.AGENTS.md`)?
- [ ] sind alle API-Pfade in der Form `/api/v1/...`?
- [ ] sind alle Permission-Aktionen aus dem 6er-Set?
- [ ] sind alle Event-Namen in Past-Tense?
- [ ] gibt es keine Verletzung der Data-Ownership-Regel (kein direkter Zugriff auf andere Domain-Tabellen)?
- [ ] ist der **Child DOX Index** (§6) konsistent?

Sobald CI existiert (Phase MVP): Lint der Markdown-Struktur (Anzahl Headings, Pflicht-Sektionen vorhanden) als Job.

---

## 6. Child DOX Index

Pro Domain existiert ein Paar `<name>.feature.md` + `<name>.AGENTS.md`. Die `.AGENTS.md` ist die DOX-Vertrags-Datei pro Domain.

| Domain-Spec | Domain-AGENTS.md | Scope |
|-------------|------------------|-------|
| `users.feature.md` | `users.AGENTS.md` | Identity, RBAC, Auth-Vorbereitung |
| `media.feature.md` | `media.AGENTS.md` | Fotos, Videos, Alben, Timeline, Karte, Globe |
| `travel.feature.md` | `travel.AGENTS.md` | Reisen, Trips, Routen |
| `projects.feature.md` | `projects.AGENTS.md` | Hobbys, 3D-Druck, Arduino, Raspi, Code |
| `recipes.feature.md` | `recipes.AGENTS.md` | Rezepte, Zutaten, Schritte, Import |
| `shopping.feature.md` | `shopping.AGENTS.md` | Einkaufslisten, Live-Sync, MorphCook-Vorbereitung |
| `finance.feature.md` | `finance.AGENTS.md` | Konten, Buchungen, Budgets, Sparziele, Portfolio |
| `insurance.feature.md` | `insurance.AGENTS.md` | Versicherungsverträge, Dokumente |
| `vault.feature.md` | `vault.AGENTS.md` | Passwort-Manager, AES-256, TOTP |
| `documents.feature.md` | `documents.AGENTS.md` | Dokumente, OCR, Volltext-Suche |
| `calendar.feature.md` | `calendar.AGENTS.md` | Kalender, Google/CalDAV-Sync |
| `it_inventory.feature.md` | `it_inventory.AGENTS.md` | Geräte-Inventar, Netzwerk-Ansicht |
| `jellyfin.feature.md` | `jellyfin.AGENTS.md` | Mediathek, Jellyfin-Integration |
| `search.feature.md` | `search.AGENTS.md` | globale Suche über alle Domains |
| `dashboard.feature.md` | `dashboard.AGENTS.md` | persönliches Hub-UI, Widgets |
| `plugins.feature.md` | `plugins.AGENTS.md` | Plugin-System, Sandboxed Runtime |

Wenn künftig `features/<name>/` als eigener Sub-Ordner mit eigener Struktur entsteht, bekommt **er** eine eigene `AGENTS.md` und wird hier im Index aufgenommen.
