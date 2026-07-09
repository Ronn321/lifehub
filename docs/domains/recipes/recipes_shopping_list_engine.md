# Recipes Shopping List Engine

## Overview

The Shopping List Engine aggregates ingredients from selected recipes into a normalized, deduplicated, unit-consistent shopping structure. It is fully offline and deterministic.

## Core Principle

> Shopping lists are computed views, never stored truths.

All lists are generated from:
- RecipeEntity selections (meal plan / cookbook / ad-hoc selection)

## Input Sources
- MealPlanEntity
- Selected RecipeEntity list
- Single recipe cook session
- Saved collections

## Aggregation Pipeline

```
Selected Recipes
   ↓
Ingredient Extraction
   ↓
Normalization (units + ontology mapping)
   ↓
Deduplication
   ↓
Unit Conversion
   ↓
Category Grouping
   ↓
Final ShoppingListEntity
```

## Ingredient Normalization

**Rules**
- map ingredient_id → canonical ingredient
- resolve synonyms
- apply hierarchy collapse (e.g. milk variants → milk)

## Unit System

**Supported conversions**
- g ↔ kg
- ml ↔ l
- tbsp ↔ ml
- tsp ↔ ml
- cups (approximation table)

**Rule**
> Only convert within compatible unit families.

## Deduplication Logic

- if ingredient_id matches: sum quantities
- If unit mismatch: convert if possible, else create separate entries

## Category Grouping

Ingredients grouped by:
- produce
- dairy
- meat
- pantry
- spices
- frozen
- bakery

Mapping derived from IngredientEntity ontology tags.

## Scaling Logic

If recipe servings differ:
```
scaled_quantity = base_quantity * (desired_servings / recipe_servings)
```

## Edge Cases

- **Missing unit** → treated as count-based item
- **Ambiguous ingredient** → fallback to raw label entry
- **Composite ingredients** → broken into sub-items if defined in ontology

## Output Structure

```
ShoppingListEntity {
  items: [
    {
      ingredient_id,
      name,
      quantity,
      unit,
      category
    }
  ]
}
```

## UX Behavior
- editable quantities
- checkbox completion
- category collapse/expand
- reorder by aisle flow (future enhancement)

## Performance
- O(n) over selected recipes
- no global dataset scan
- fully cached per session
