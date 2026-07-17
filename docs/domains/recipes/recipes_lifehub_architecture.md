# Recipes LifeHub Architecture

> **Zentrales Architekturdokument für die LifeHub-Recipes-Domain.**
> Beschreibt die vollständige Zielarchitektur — Backend (NestJS), Frontend (Next.js) und die Beziehung zur externen MorphCook-Flutter-App.

---

## 1. Überblick

Die LifeHub-Recipes-Domain ist das **zentrale Rezept-Management-System** des LifeHub-Ökosystems. Sie kombiniert:

- **Recipes Import Pipeline** — automatischer Import externer Rezepte (Chefkoch, generische HTML-Seiten)
- **Recipes Management** — Speicherung, Bearbeitung, Kuratierung, Suche von Rezepten
- **Recipes API** — REST-Endpunkte für LifeHub-Frontend und MorphCook-App
- **Recipes Web-UI** — Next.js-Frontend mit Cook Mode, Meal Planning und Shopping List
- **MorphCook Sync** — standardisierte Export-Endpunkte zur Versorgung der MorphCook-Flutter-App

### 1.1 Systemkontext

```
┌────────────────────────────────────────────────────────────────────────┐
│                           LifeHub (NAS)                                │
│                                                                        │
│  ┌────────────────┐    ┌────────────────┐    ┌─────────────────────┐  │
│  │  Next.js Web UI │    │  NestJS Backend│    │  PostgreSQL         │  │
│  │  (Cook Mode,    │◄──►│  (API, Import, │◄──►│  (recipes Schema)   │  │
│  │  Verwaltung,    │    │  Matching,     │    │                     │  │
│  │  Meal Plan,     │    │  Search, Sync) │    │                     │  │
│  │  Shopping)      │    │                │    │                     │  │
│  └────────────────┘    └───────┬────────┘    └─────────────────────┘  │
└────────────────────────────────┼──────────────────────────────────────┘
                                 │
                                 │ HTTP REST (Tailscale)
                                 │
                    ┌────────────▼────────────┐
                    │    MorphCook Flutter App  │
                    │  (iOS + Android, Offline) │
                    │  - Rezepte empfangen      │
                    │  - Lokal speichern        │
                    │  - Sync via JSON-Import   │
                    └───────────────────────────┘
```

### 1.2 Architekturprinzipien

| Prinzip | Beschreibung |
|---|---|
| **Offline-First** | LifeHub-Web-UI nutzt Service Worker + IndexedDB für Offline-Fähigkeit. Cook Mode, gespeicherte Rezepte und Grundfunktionen offline. |
| **Deterministisch** | Matching Engine, Variantenauflösung, Import — alles deterministisch, keine Runtime-KI. |
| **Strikte Schichtentrennung** | Controller → Service → Repository → DB. UI nie direkt in DB. |
| **Modulare Adapter** | Import-Quellen, Normalisierer, Parser — alles über Interfaces austauschbar. |
| **MorphCook-kompatibel** | Lebensmitteldaten (Dish→Recipe-Varianten, contains_flags, attributes) sind 1:1 mit MorphCook kompatibel. |
| **NAS-Ready** | Läuft vollständig im Docker-Stack auf dem NAS. PostgreSQL als zentrale Datenquelle. |

---

## 2. Backend-Architektur (NestJS)

### 2.1 Modul-Struktur

```
domains/recipes/
├── entities/                     # TypeScript-Interfaces (Pure Domain)
│   ├── recipes.entity.ts
│   ├── dishes.entity.ts
│   ├── ingredients.entity.ts
│   ├── ontology-flags.entity.ts
│   └── import-jobs.entity.ts
│
├── dtos/                         # Zod-Schemas + NestJS-DTOs
│   ├── recipes.dto.ts            # CRUD + Import
│   ├── dishes.dto.ts
│   ├── ingredients.dto.ts
│   ├── ontology-flags.dto.ts
│   ├── import-jobs.dto.ts
│   └── dietary-profile.dto.ts
│
├── repositories/                 # Drizzle-DB-Zugriff
│   ├── recipes.repository.ts
│   ├── dishes.repository.ts
│   ├── ingredients.repository.ts
│   └── import-jobs.repository.ts
│
├── services/                     # Business-Logik
│   ├── recipes.service.ts        # CRUD + Varianten-Auflösung
│   ├── dishes.service.ts
│   ├── matching.service.ts       # Matching-Engine (deterministisch)
│   ├── search.service.ts         # PostgreSQL Full-Text-Search
│   ├── ontology.service.ts       # Flag-Expansion, Compound-Flags
│   ├── dietary-profile.service.ts
│   ├── meal-plan.service.ts
│   ├── shopping-list.service.ts
│   │
│   ├── import/                   # Import-Pipeline (eigenes Sub-Modul)
│   │   ├── import-orchestrator.service.ts
│   │   ├── url-detector.service.ts
│   │   ├── html-fetcher.service.ts
│   │   ├── recipe-extractor.service.ts
│   │   ├── normalizer.service.ts
│   │   ├── ontology-mapper.service.ts
│   │   ├── import-validator.service.ts
│   │   └── import-worker.service.ts
│   │
│   └── sync/                     # MorphCook-Sync
│       └── morphcook-sync.service.ts
│
├── api/                          # NestJS-Controller + Module
│   ├── recipes.controller.ts
│   ├── dishes.controller.ts
│   ├── recipes-import.controller.ts
│   ├── recipes.module.ts
│   │
│   └── test/                     # (wird später in tests/ verschoben)
│       └── import-pipeline.e2e-spec.ts
│
└── tests/                        # Tests
    ├── unit/
    │   ├── matching.service.spec.ts
    │   ├── import-pipeline.spec.ts
    │   ├── normalizer.service.spec.ts
    │   └── ...
    ├── api/
    │   └── recipes.controller.spec.ts
    └── permissions/
        └── recipes.permissions.spec.ts
```

### 2.2 API-Endpunkte

| Methode | Pfad | Beschreibung |
|---|---|---|
| `POST` | `/api/v1/recipes` | Rezept erstellen |
| `GET` | `/api/v1/recipes` | Rezepte listen (mit Suche, Filter, Pagination) |
| `GET` | `/api/v1/recipes/:id` | Rezept-Detail (mit Ingredients + Steps + Tags) |
| `PUT` | `/api/v1/recipes/:id` | Rezept aktualisieren |
| `DELETE` | `/api/v1/recipes/:id` | Rezept soft-deleten |
| `POST` | `/api/v1/recipes/:id/servings` | Portionen skalieren |
| | | |
| **Import** | | |
| `POST` | `/api/v1/recipes/import` | URL-Import starten (async, gibt jobId zurück) |
| `GET` | `/api/v1/recipes/import/:jobId` | Import-Status + Draft abrufen |
| `POST` | `/api/v1/recipes/import/:jobId/confirm` | Import-Draft bestätigen → Rezept speichern |
| `DELETE` | `/api/v1/recipes/import/:jobId` | Import-Draft verwerfen |
| | | |
| **Dishes** | | |
| `POST` | `/api/v1/dishes` | Dish erstellen |
| `GET` | `/api/v1/dishes` | Dishes listen |
| `GET` | `/api/v1/dishes/:id` | Dish-Detail (mit Rezept-Varianten) |
| | | |
| **Matching / Search** | | |
| `POST` | `/api/v1/recipes/search` | Suche (Text + Filters + Pagination) |
| `POST` | `/api/v1/recipes/match` | Variante zu Profil finden |
| | | |
| **Dietary Profile** | | |
| `GET` | `/api/v1/profile/diet` | Dietary-Profil abrufen |
| `PUT` | `/api/v1/profile/diet` | Dietary-Profil aktualisieren |
| | | |
| **Ontology** | | |
| `GET` | `/api/v1/ontology/flags` | Verfügbare Flags listen |
| `GET` | `/api/v1/ontology/ingredients` | Ingredient-Tree abrufen |
| | | |
| **MorphCook Sync** | | |
| `GET` | `/api/v1/recipes/export/morphcook` | Alle Rezepte im MorphCook-Format exportieren |
| `POST` | `/api/v1/recipes/import/morphcook` | MorphCook-JSON importieren |
| | | |
| **Meal Plan** | | |
| `GET` | `/api/v1/meal-plan` | Wochenplan abrufen |
| `PUT` | `/api/v1/meal-plan` | Wochenplan speichern |
| | | |
| **Shopping List** | | |
| `POST` | `/api/v1/shopping-list/generate` | Aus Meal-Plan + Rezepten generieren |

---

## 3. Datenmodell

### 3.1 Tabellen im `recipes`-Schema

Die vollständige DB-Spezifikation liegt in `DATABASE_SCHEMA.md` §8 und in der Drizzle-DDL (`shared/db/src/schema/public.ts` §372-432).

**Kern-Entities:**

| Tabelle | Zweck |
|---|---|
| `recipes.recipes` | Rezepte. Kern-Entity mit Titel, Beschreibung, Nährwerten, Quelleninfos |
| `recipes.dishes` | Dish-Konzept (z.B. "Döner"). Gruppiert Rezept-Varianten. |
| `recipes.ingredients` | Zutaten eines Rezepts (Menge, Einheit, Name) |
| `recipes.steps` | Zubereitungsschritte eines Rezepts |
| `recipes.recipe_tags` | Viele-zu-Viele: Rezept → Public-Tag |
| `recipes.recipe_media_refs` | Viele-zu-Viele: Rezept → Media (Bilder, Videos) |
| `recipes.ingredient_ontology` | Hierarchische Zutaten-Ontologie (dairy > cheese > parmesan) |
| `recipes.ontology_flags` | Flag-Taxonomie (contains_flags, attributes, technique_tags) |
| `recipes.ontology_compound_flags` | Compound-Flags (vegan → meat+dairy+eggs+honey) |
| `recipes.meal_plans` | Wochenpläne pro User |
| `recipes.shopping_list_items` | Generierte Einkaufslisten-Items |
| `recipes.dietary_profiles` | Dietary-Einstellungen pro User |
| `recipes.import_jobs` | Import-Drafts + Status-Tracking |
| `recipes.import_history` | Archiv erfolgreicher Imports |

**Neue Tabellen (zu implementieren):**

```sql
-- Hierarchische Zutaten-Ontologie
CREATE TABLE recipes.ingredient_ontology (
  id          UUID PRIMARY KEY,
  parent_id   UUID REFERENCES recipes.ingredient_ontology(id),
  name_de     TEXT NOT NULL,
  name_en     TEXT,
  ontology_tags TEXT[],
  default_unit TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Flag-Taxonomie
CREATE TABLE recipes.ontology_flags (
  id          UUID PRIMARY KEY,
  key         TEXT NOT NULL UNIQUE,        -- 'dairy', 'gluten', 'vegan'
  category    TEXT NOT NULL,               -- 'contains_flag', 'attribute', 'technique', 'compound'
  name_de     TEXT NOT NULL,
  name_en     TEXT,
  description TEXT,
  is_compound BOOLEAN NOT NULL DEFAULT FALSE
);

-- Compound-Flag-Expansion
CREATE TABLE recipes.ontology_compound_flags (
  compound_flag_id UUID NOT NULL REFERENCES recipes.ontology_flags(id),
  expanded_flag_id UUID NOT NULL REFERENCES recipes.ontology_flags(id),
  PRIMARY KEY (compound_flag_id, expanded_flag_id)
);

-- Import-Jobs (Draft-System)
CREATE TABLE recipes.import_jobs (
  id            UUID PRIMARY KEY,
  owner_id      UUID NOT NULL REFERENCES public.users(id),
  source_url    TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending',
                -- 'pending' | 'fetching' | 'parsing' | 'normalizing' |
                -- 'mapping' | 'draft' | 'confirmed' | 'failed'
  source_type   TEXT NOT NULL,             -- 'chefkoch' | 'generic_html' | 'morphcook'
  raw_html      TEXT,                      -- cache for reprocessing
  extracted_dto JSONB,                     -- RawRecipeDTO als JSON
  normalized_dto JSONB,                    -- NormalizedRecipeDTO als JSON
  draft_recipe_id UUID REFERENCES recipes.recipes(id),
  error_message TEXT,
  error_details JSONB,
  retry_count   INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Import-Historie
CREATE TABLE recipes.import_history (
  id            UUID PRIMARY KEY,
  owner_id      UUID NOT NULL REFERENCES public.users(id),
  source_url    TEXT NOT NULL,
  source_type   TEXT NOT NULL,
  recipe_id     UUID NOT NULL REFERENCES recipes.recipes(id),
  success       BOOLEAN NOT NULL DEFAULT TRUE,
  duration_ms   INT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Dietary-Profile
CREATE TABLE recipes.dietary_profiles (
  id                UUID PRIMARY KEY,
  user_id           UUID NOT NULL REFERENCES public.users(id) UNIQUE,
  avoid_flags       TEXT[] NOT NULL DEFAULT '{}',
  avoid_ingredients TEXT[] NOT NULL DEFAULT '{}',
  required_attributes TEXT[] NOT NULL DEFAULT '{}',
  calorie_target    INT,
  max_time_minutes  INT,
  preferred_effort  TEXT,                  -- 'easy' | 'medium' | 'hard'
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## 4. Import-Pipeline

### 4.1 Architektur

```
URL → UrlDetector → HtmlFetcher → Extractor → Normalizer → OntologyMapper → Validator → Draft

Jeder Schritt ist ein eigenes Service mit Interface.
Die Pipeline läuft asynchron in BullMQ.
Adapter-Registry wählt den passenden Extractor für die Quelle.
```

### 4.2 Pipeline-Stufen (detailliert)

Siehe separate Specs:
- `recipes_chefkoch_import_pipeline.md` — Chefkoch-spezifische Pipeline
- `recipes_import_dataflow.md` — Datenfluss-Diagramm
- `recipes_import_error_handling.md` — Fehlerbehandlung
- `recipes_import_queue.md` — Queue-Konfiguration

---

## 5. Matching Engine

Die Matching Engine ist eine **deterministische Pure Function**:

```
isVisible(recipe, profile) :=
    recipe.containsFlags ∩ profile.avoidFlags = ∅
    AND profile.avoidIngredientNames ∩ recipe.ingredientNames = ∅
    AND profile.requiredAttributes ⊆ recipe.attributes
    AND recipe.totalTime ≤ profile.maxTimeMinutes
    AND |recipe.calories - profile.calorieTarget| ≤ tolerance
```

**Varianten-Scoring:**

```
score(recipe, profile) =
    attributeMatchCount(recipe, profile) * 10
    + effortScore(recipe, profile)        // exact=20, adjacent=10, else=0
    + timeCloseness(recipe, profile)      // max(0, 20 - |dt|/5)
    + calorieCloseness(recipe, profile)   // max(0, 20 - |dc|/100)
```

Siehe `recipes_matching_engine.md` für Details.

---

## 6. Frontend-Architektur (Next.js)

### 6.1 Seiten-Struktur

```
app/(dashboard)/
├── recipes/
│   ├── page.tsx                    # Rezept-Übersicht (Grid, Suche, Filter)
│   ├── [id]/
│   │   ├── page.tsx                # Rezept-Detail (Variant-Switcher, Zutaten, Steps)
│   │   └── cook/
│   │       └── page.tsx            # Cook Mode (Fullscreen, Step-by-Step, Timer)
│   ├── import/
│   │   └── page.tsx                # Import-UI (URL-Eingabe, Draft-Vorschau)
│   └── create/
│       └── page.tsx                # Manuelle Rezept-Erstellung
├── meal-plan/
│   └── page.tsx                    # Wochenplaner
├── shopping-list/
│   └── page.tsx                    # Einkaufsliste
└── settings/
    └── diet/
        └── page.tsx                # Dietary-Einstellungen
```

### 6.2 Offline-First in der Web-App

| Technik | Zweck |
|---|---|
| Service Worker (Workbox) | Cached App-Shell. API-Responses via Stale-While-Revalidate. |
| IndexedDB (Dexie.js) | Speichert Rezepte lokal. Cook Mode offline. Meal Plans offline. |
| TanStack Query persist | `persistQueryClient` syncs API-Cache → IndexedDB. |
| Zustand persist | User-Profile, UI-State → localStorage. |

### 6.3 Cook Mode

Siehe `recipes_cook_mode.md` für vollständige Spezifikation.

Kern-Features:
- Fullscreen (dark mode)
- Schritt-für-Schritt Navigation
- Timer pro Schritt (optional)
- Portionen-Skalierung
- Vor-/Zurück-Navigation
- Abschluss-Bildschirm
- Funktioniert offline (IndexedDB)

---

## 7. MorphCook-Sync

### 7.1 API-Endpunkt

`GET /api/v1/recipes/export/morphcook` liefert Rezepte im MorphCook-kompatiblen JSON-Format:

```json
{
  "schema_version": 1,
  "exported_at": "2026-07-16T20:00:00Z",
  "recipes": [
    {
      "id": "uuid",
      "dish_id": "uuid",
      "title": { "de": "Blumenkohlauflauf", "en": "Cauliflower Casserole" },
      "description": { "de": "...", "en": "..." },
      "ingredients": [
        {
          "ingredient_id": "uuid",
          "name": { "de": "Blumenkohl", "en": "Cauliflower" },
          "quantity": 1.0,
          "unit": "Stk"
        }
      ],
      "steps": [
        { "index": 0, "text": { "de": "Ofen vorheizen", "en": "Preheat oven" }, "timer_seconds": null }
      ],
      "contains_flags": ["dairy", "gluten"],
      "attributes": ["effort:easy", "time:≤30"],
      "time_minutes": 25,
      "calories_per_serving": 320,
      "servings": 4
    }
  ],
  "dishes": [
    {
      "id": "uuid",
      "name": { "de": "Auflauf", "en": "Casserole" },
      "recipe_ids": ["uuid", "uuid"]
    }
  ]
}
```

### 7.2 Import von MorphCook-Rezepten

`POST /api/v1/recipes/import/morphcook` nimmt das Format entgegen:
- LifeHub prüft Duplikate (per dish_id + title)
- Erzeugt neue Recipes + Dishes + Ontology-Flags
- Gibt Status-Report zurück

### 7.3 Sync-Strategie

Die MorphCook-App bleibt offline-first. Sync ist ein **manueller**, **nutzer-initierter** Prozess:

```
1. User öffnet MorphCook → "Mit LifeHub synchronisieren"
2. MorphCook ruft GET /api/v1/recipes/export/morphcook auf
3. MorphCook merged neue Rezepte in lokale Hive-Datenbank
4. User kann LifeHub-Rezepte speichern, kochen, bewerten
5. Eigene Änderungen in MorphCook werden per Export → LifeHub-Import geteilt
```

---

## 8. Übernahme existierender MorphCook-Rezepte

Die MorphCook-App enthält bereits Rezepte im `assets/`-Verzeichnis. Für die Erstübernahme:

1. `regenerate_all_recipes.py` aus MorphCook-Repo extrahiert alle Rezepte als JSON
2. Script transformiert MorphCook-Format in LifeHub-API-Format
3. `POST /api/v1/recipes/import/morphcook` bulk-importiert alle Rezepte
4. LifeHub prüft auf Duplikate (per dish_id + title + contains_flags)

---

## 9. Definition of Done (pro Domain-Stufe)

| Stufe | Kriterium |
|---|---|
| **Entity + DB** | Alle Tabellen migriert. Idempotent. Seed-Daten für Ontology. |
| **Repository** | CRUD-Operationen. Soft-Delete. Owner-Filter. |
| **Service** | Business-Logik implementiert. Pure Functions. Events emittiert. |
| **API** | Controller mit Guards. Zod-Validierung. OpenAPI-Doku. |
| **Import** | Chefkoch-Import funktioniert. Draft → Confirm. Fehlerbehandlung. |
| **Matching** | `isVisible()` + `score()` korrekt. Tests mit 20+ Profilen. |
| **Search** | Full-Text-Search. Ranking. Pagination. |
| **Frontend** | Alle Pages implementiert. Offline-Fähigkeit. Cook Mode. |
| **MorphCook Sync** | Export-Endpunkt liefert korrektes Format. Import akzeptiert MorphCook-JSON. |
| **Tests** | Unit ≥ 70%. API-Tests grün. Permission-Tests alle. |
| **Audit + Events** | Audit-Logs bei CREATE/UPDATE/DELETE. Domain-Events emittiert. |

---

## 10. Verhältnis zu bestehenden Dokumenten

| Dokument | Verhältnis zu diesem Dokument |
|---|---|
| `recipes_domain_overview.md` | Wird durch dieses Dokument ersetzt. Sollte auf LifeHub-Fokus umgeschrieben werden. |
| `recipes_chefkoch_import_pipeline.md` | Pipeline-Detail. Dieses Dokument beschreibt die Einbettung in LifeHub. |
| `recipes_external_import_adapters.md` | Adapter-Interfaces. Dieses Dokument referenziert sie. |
| `recipes_data_model.md` | Datenmodell als MorphCook-kompatible Referenz. Dieses Dokument erweitert um LifeHub-spezifische Tabellen. |
| `recipes_offline_first_architecture.md` | Spezifiziert PWA-Offline-Strategie. Dieses Dokument beschreibt die Einbettung. |
| `recipes_matching_engine.md` | Detail-Spezifikation der Matching-Logik. |
| `recipes_variant_system.md` | Detail-Spezifikation des Varianten-Systems. |
| Restliche Docs | Behalten ihre Gültigkeit als Detail-Spezifikationen für die Ziel-Architektur. |

---

> **Stand:** Juli 2026  
> **Nächstes Review:** Nach Fertigstellung der Import-Pipeline