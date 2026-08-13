# RECIPES FEATURE

## Goal
Digitales Familien-Kochbuch. Zentrale Rezeptverwaltung für LifeHub (Backend + Web-UI) mit Import-Pipeline für externe Quellen (Chefkoch) und Sync für die MorphCook-Flutter-App.

---

## Features

### Recipe Management
- recipe CRUD (create, read, update, soft-delete)
- dish CRUD (Konzeptuelle Gruppierung von Rezept-Varianten)
- ingredient management (name, amount, unit, note)
- step management (instruction, timer_seconds)
- tag system (via public.tags)

### Import Pipeline
- **Chefkoch-Import per URL**: Automatischer Import von Chefkoch-Rezepten
- **Dual-Extraction**: Primär JSON-LD (Schema.org), Fallback DOM-Parsing
- **Normalisierung**: Einheiten-Normalisierung (EL→tbsp), Mengen-Parsing (½→0.5)
- **Ingredient-Parsing**: "2 EL Olivenöl" → {amount: 2, unit: tbsp, name: olivenöl}
- **Draft-System**: Import erzeugt Draft → User review → Confirm/Discard
- **Fehlerbehandlung**: Retry (3×), Fallback-Ketten, Partial-Import mit Warnings

### Matching Engine
- deterministische Filterung basierend auf Dietary-Profil
- contains_flags ∩ avoid_flags = ∅
- Varianten-Scoring (Attribute, Effort, Time, Calories)

### Dietary Profile
- avoid_flags (vegan, halal, lactosefrei, etc.)
- avoid_ingredients (specific typeahead)
- calorie_target, max_time_minutes, preferred_effort

### Cook Mode
- Fullscreen dark mode
- Schritt-für-Schritt Navigation
- Timer pro Schritt
- Portionen-Skalierung
- Offline-fähig (IndexedDB)

### MorphCook Sync
- GET /api/v1/recipes/export/morphcook → JSON für die Flutter-App
- POST /api/v1/recipes/import/morphcook → Import von MorphCook-Rezepten

### Meal Planning (planned)
- Weekly grid (Mon–Sun × breakfast/lunch/dinner)
- Drag-drop assignment
- Export to shopping list

### Shopping List (planned)
- Aus Meal-Plan + Rezepten generieren
- Unit-aware aggregation

---

## Entities

- Recipe — Atomare Kocheinheit mit Zutaten + Schritten + Nährwerten
- Dish — Konzeptuelle Gruppierung (z.B. "Döner" → Classic, Vegan, Keto)
- Ingredient — Zutat eines Rezepts
- Step — Zubereitungsschritt
- IngredientOntology — Hierarchische Zutaten-Taxonomie
- OntologyFlag — Flag-Taxonomie (contains_flags, attributes, compound)
- ImportJob — Import-Draft mit Status-Tracking
- ImportHistory — Archiv erfolgreicher Imports
- DietaryProfile — User-Einstellungen

---

## API

```
# CRUD
POST   /api/v1/recipes
GET    /api/v1/recipes
GET    /api/v1/recipes/:id
PUT    /api/v1/recipes/:id
DELETE /api/v1/recipes/:id
POST   /api/v1/recipes/:id/servings

# Import
POST   /api/v1/recipes/import           # URL import starten (HTTP 202)
GET    /api/v1/recipes/import/:jobId     # Status + Draft abrufen
POST   /api/v1/recipes/import/:jobId/confirm
DELETE /api/v1/recipes/import/:jobId

# Dishes
POST   /api/v1/dishes
GET    /api/v1/dishes
GET    /api/v1/dishes/:id

# Matching / Search
POST   /api/v1/recipes/search
POST   /api/v1/recipes/match

# Dietary Profile
GET    /api/v1/profile/diet
PUT    /api/v1/profile/diet

# Ontology
GET    /api/v1/ontology/flags
GET    /api/v1/ontology/ingredients

# MorphCook Sync
GET    /api/v1/recipes/export/morphcook
POST   /api/v1/recipes/import/morphcook