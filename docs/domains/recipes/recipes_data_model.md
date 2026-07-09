# Recipes Data Model

## Overview

Defines the canonical data structures used across the Recipes domain. The model is designed for:
- offline persistence
- deterministic sync
- MorphCook variant system
- NAS future compatibility

## 1. RecipeEntity

```
RecipeEntity {
  id: String
  dish_id: String

  title: Map<Lang, String>
  description: Map<Lang, String>

  ingredients: List<IngredientEntry>
  steps: List<Step>

  contains_flags: Set<String>
  attributes: Set<String>

  time_minutes: Int
  calories_per_serving: Int

  servings: Int

  source: RecipeSource
  created_at: DateTime
  updated_at: DateTime
}
```

## 2. IngredientEntry

```
IngredientEntry {
  ingredient_id: String
  name: Map<Lang, String>

  quantity: Float
  unit: String

  optional: Boolean
}
```

## 3. Step

```
Step {
  index: Int
  text: Map<Lang, String>

  timer_seconds: Int?
  image_ref: String?
}
```

## 4. DishEntity

```
DishEntity {
  id: String
  name: Map<Lang, String>

  hero_text: Map<Lang, String>
  caption: Map<Lang, String>

  recipe_ids: List<String>

  primary_color: String
}
```

## 5. IngredientEntity

```
IngredientEntity {
  id: String
  name: Map<Lang, String>

  parent_id: String?
  children_ids: List<String>

  ontology_tags: Set<String>
}
```

## 6. MealPlanEntity

```
MealPlanEntity {
  week_id: String

  entries: Map<String, RecipeID>
}
```

Key:
- mon.breakfast
- mon.lunch
- mon.dinner

## 7. ShoppingListEntity

```
ShoppingListEntity {
  id: String

  items: List<ShoppingItem>
}
```

## 8. ShoppingItem

```
ShoppingItem {
  ingredient_id: String
  name: String

  quantity: Float
  unit: String

  category: String
}
```

## 9. ImportSource

```
ImportSource {
  type: "chefkoch" | "mealie" | "manual" | "generic_html"
  url: String?
  original_id: String?
}
```

## Design Constraints
- No nullable business-critical fields
- All UI text is multilingual Map
- IDs are stable and never reused
- Recipes are immutable after creation
