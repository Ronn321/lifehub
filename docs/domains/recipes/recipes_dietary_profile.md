# Recipes Dietary Profile

> **Spezifikation der Dietary-Profile für Matching-Engine und Personalisierung.**
> Definiert Datenmodell, Settings-UI und Integration mit Matching-Engine.

---

## 1. Überblick

Das Dietary Profile ist die zentrale Benutzer-Konfiguration für die Rezept-Filterung. Es steuert:
- Welche Rezepte einem User angezeigt werden (Matching Engine)
- Welche Varianten priorisiert werden (Variant Scoring)
- Welche Allergene/Inhaltsstoffe ausgeschlossen werden

**Entspricht dem MorphCook-Profil-Konzept** aus `MorphCook/SPEC.md` §Profile, ist aber in LifeHub serverseitig gespeichert.

---

## 2. Datenmodell

### 2.1 Tabelle: `recipes.dietary_profiles`

```sql
CREATE TABLE recipes.dietary_profiles (
  id                UUID PRIMARY KEY,
  user_id           UUID NOT NULL REFERENCES public.users(id) UNIQUE,
  
  -- Vermeidungs-Flags (Compound-Flags werden expandiert)
  avoid_flags       TEXT[] NOT NULL DEFAULT '{}',
  -- z.B. {'vegan', 'halal', 'lactosefrei'}
  
  -- Spezifische vermiedene Zutaten (aus ingredient_ontology)
  avoid_ingredient_ids TEXT[] NOT NULL DEFAULT '{}',
  -- z.B. {uuid-koriander, uuid-aepfel}
  
  -- Erforderliche positive Attribute
  required_attributes TEXT[] NOT NULL DEFAULT '{}',
  -- z.B. {'halal', 'zuckerfrei'}
  
  -- Kalorien-Ziel (pro Mahlzeit/Portion)
  calorie_target    INT,
  -- z.B. 500 (kcal)
  calorie_tolerance INT NOT NULL DEFAULT 100,
  -- z.B. ±100 kcal
  
  -- Maximale Zubereitungszeit (Minuten)
  max_time_minutes  INT,
  -- z.B. 60 (wenn null = keine Begrenzung)
  
  -- Bevorzugter Aufwand
  preferred_effort  TEXT DEFAULT 'medium',
  -- 'easy' | 'medium' | 'hard'
  
  -- UI-Präferenzen
  show_variant_tags BOOLEAN NOT NULL DEFAULT TRUE,
  show_calorie_info BOOLEAN NOT NULL DEFAULT TRUE,
  reduce_motion     BOOLEAN NOT NULL DEFAULT FALSE,
  
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 2.2 TypeScript Entity

```typescript
interface DietaryProfile {
  id: string;
  userId: string;
  
  avoidFlags: string[];          // Compound flags: 'vegan', 'halal', etc.
  avoidIngredientIds: string[];  // Specific ingredient UUIDs to exclude
  
  requiredAttributes: string[];  // Must-have attributes
  calorieTarget: number | null;
  calorieTolerance: number;      // ± tolerance in kcal
  maxTimeMinutes: number | null; // null = no limit
  
  preferredEffort: 'easy' | 'medium' | 'hard';
  
  showVariantTags: boolean;
  showCalorieInfo: boolean;
  reduceMotion: boolean;
  
  createdAt: string;
  updatedAt: string;
}
```

---

## 3. Compound-Flag Expansion

Compound-Flags werden vor dem Matching expandiert:

| User wählt | Expandiert zu (alle ausgeschlossen) |
|---|---|
| `vegan` | `meat`, `beef`, `pork`, `lamb`, `poultry`, `fish`, `shellfish`, `molluscs`, `dairy`, `egg`, `honey`, `gelatin` |
| `vegetarisch` | `meat`, `beef`, `pork`, `lamb`, `poultry`, `fish`, `shellfish`, `molluscs`, `gelatin-non-halal` |
| `pescetarisch` | `meat`, `beef`, `pork`, `lamb`, `poultry`, `gelatin-non-halal` |
| `halal` | `pork`, `alcohol`, `gelatin-non-halal` |
| `kosher` | `pork`, `shellfish`, `gelatin-non-kosher` |
| `lactosefrei` | `dairy` (angepasst auf lactosehaltige Subtypen) |
| `glutenfrei` | `gluten`, `wheat`, `barley`, `rye`, `oats` |
| `zuckerfrei` | `added-sugar`, `honey`, `syrup` |
| `nussfrei` | `peanuts`, `tree-nuts`, `almonds`, `walnuts`, `cashews`, `pistachios`, `hazelnuts` |

Die Expansion wird aus `recipes.ontology_compound_flags` geladen.

---

## 4. Matching-Integration

```typescript
// Aus dem DietaryProfile das effektive Filter-Set berechnen
function getEffectiveFilters(profile: DietaryProfile): EffectiveFilters {
  // Compound-Flags expandieren
  const expandedAvoidFlags = expandCompoundFlags(profile.avoidFlags);
  
  // Vermiedene Zutaten aus ingredient_ontology laden
  const avoidIngredientNames = loadIngredientNames(profile.avoidIngredientIds);
  
  return {
    avoidFlags: expandedAvoidFlags,
    avoidIngredientIds: profile.avoidIngredientIds,
    avoidIngredientNames,
    requiredAttributes: profile.requiredAttributes,
    maxTimeMinutes: profile.maxTimeMinutes ?? Number.MAX_SAFE_INTEGER,
    calorieTarget: profile.calorieTarget,
    calorieTolerance: profile.calorieTolerance,
    preferredEffort: profile.preferredEffort,
  };
}

// Matching-Engine nutzt diese Filter
function isVisible(recipe: RecipeEntity, filters: EffectiveFilters): boolean {
  return (
    // Keine Überschneidung mit vermiedenen Flags
    intersection(recipe.containsFlags, filters.avoidFlags).length === 0 &&
    // Keine vermiedene Zutat enthalten
    intersection(recipe.ingredientNames, filters.avoidIngredientNames).length === 0 &&
    // Alle erforderlichen Attribute vorhanden
    filters.requiredAttributes.every(attr => recipe.attributes.includes(attr)) &&
    // Zeit im Limit
    (recipe.totalTime ?? Infinity) <= filters.maxTimeMinutes &&
    // Kalorien im Toleranzbereich
    (filters.calorieTarget === null || 
     Math.abs((recipe.calories ?? filters.calorieTarget) - filters.calorieTarget) <= filters.calorieTolerance)
  );
}
```

---

## 5. Settings-UI

### 5.1 Seite: `/settings/diet`

```
┌──────────────────────────────────────────────────────────┐
│  Ernährungs-Einstellungen                                │
│                                                          │
│  ── Diät-Präferenzen ─────────────────────────────────   │
│                                                          │
│  ☐ Vegan          (keine tierischen Produkte)            │
│  ☐ Vegetarisch    (kein Fleisch/Fisch)                   │
│  ☐ Pescetarisch   (Fisch erlaubt)                        │
│  ☐ Halal          (halal-kompatible Zutaten)             │
│  ☐ Laktosefrei    (keine Milchprodukte)                  │
│  ☐ Glutenfrei     (kein Gluten)                          │
│  ☐ Zuckerfrei     (kein zugesetzter Zucker)              │
│  ☐ Nussfrei       (keine Nüsse)                          │
│                                                          │
│  ── Allergene / Vermeidungen ─────────────────────────   │
│                                                          │
│  Spezifische Zutaten vermeiden:                          │
│  ┌──────────────────────────────────────┐                │
│  │ [Koriander                       ✕] │                │
│  │ [Äpfel                           ✕] │                │
│  │ [Zutat hinzufügen...             ▾] │                │
│  └──────────────────────────────────────┘                │
│                                                          │
│  ── Ernährungs-Ziele ─────────────────────────────────   │
│                                                          │
│  Kalorienziel (pro Portion):  [500] kcal ± [100]         │
│  Maximale Kochzeit:           [60] Minuten                │
│  Bevorzugter Aufwand:         [● Einfach] [○ Mittel]    │
│                               [○ Aufwändig]              │
│                                                          │
│  ── Anzeige ─────────────────────────────────────────    │
│                                                          │
│  ☑ Varianten-Tags anzeigen                               │
│  ☑ Kalorien-Info anzeigen                                │
│  ☐ Reduzierte Animationen                                │
│                                                          │
│                          [Speichern]                      │
└──────────────────────────────────────────────────────────┘
```

### 5.2 Typeahead für Zutaten

```typescript
// API: GET /api/v1/ontology/ingredients/search?q=kori
// Response: Vorschläge aus ingredient_ontology

interface IngredientSuggestion {
  id: string;
  name: string;         // "Koriander"
  path: string;         // "Kräuter > Koriander"
  parentName: string;   // "Kräuter"
}
```

---

## 6. API-Endpunkte

| Methode | Pfad | Beschreibung |
|---|---|---|
| `GET` | `/api/v1/profile/diet` | Dietary-Profil abrufen |
| `PUT` | `/api/v1/profile/diet` | Dietary-Profil aktualisieren |
| `GET` | `/api/v1/ontology/flags` | Verfügbare Avoid-Flags + Compound-Flags |
| `GET` | `/api/v1/ontology/ingredients/search?q=X` | Zutaten-Suche für Typeahead |

---

> **Referenzen:**
> - `recipes_matching_engine.md` — Matching-Logik, die das Profil nutzt
> - `recipes_variant_system.md` — Varianten-Auswahl basierend auf Profil
> - `recipes_lifehub_architecture.md` — API-Übersicht