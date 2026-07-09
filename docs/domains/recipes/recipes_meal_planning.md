# Recipes Meal Planning

## Overview

The Meal Planning system provides a weekly structured assignment of recipes to meals, fully offline and tightly integrated with the Recipe and Shopping systems.

## Core Structure

```
Week
 ├── Monday
 │    ├── Breakfast → RecipeID
 │    ├── Lunch → RecipeID
 │    └── Dinner → RecipeID
 └── ...
```

## Data Model

```
MealPlanEntity {
  week_id: String
  entries: Map<String, RecipeID>
}
```

Key format:
- mon.breakfast
- tue.dinner

## Interaction Model

### Assign Recipe
- tap slot → open search
- select recipe → assign instantly

### Replace Recipe
- overwrite existing assignment
- no confirmation required (undo available via history)

### Drag & Drop
- reorder recipes between slots
- cross-day movement supported

## Integration Points

### Shopping List
Meal plan selection feeds directly into shopping engine.

### Cookbook
Saved recipes are primary selection source.

### Search
Meal plan slots can be filled directly from search results.

## Constraints
- one recipe per slot
- no auto-scheduling (v1)
- no AI planning engine
- no nutrition aggregation

## Weekly View

**Layout**
- 7 columns (days)
- 3 rows (meals)
- compact card per slot

## Persistence

Stored in local DB:
- Hive or SQLite
- Changes are immediately persisted.

## Performance
- lazy rendering per week
- no preloading of future weeks
- max 4 weeks cached locally

## Edge Cases

- **Empty slot** → shown as placeholder card
- **Deleted recipe** → slot becomes "missing reference"

## UX Principle

> Planning is manual, not automated.
