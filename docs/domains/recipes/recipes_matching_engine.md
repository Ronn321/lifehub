# Recipes Matching Engine

## Overview

The matching engine determines recipe visibility and ranking based on:
- user profile constraints
- ontology flags
- ingredient-level avoidance
- time and calorie constraints

It is a pure deterministic function.

## Core Function

```
visible(recipe, profile) :=
    recipe.contains_flags ∩ profile.avoid_flags = ∅
    AND profile.avoid_ingredients ∩ recipe.ingredient_ids = ∅
    AND profile.required_attributes ⊆ recipe.attributes
    AND recipe.time_minutes ≤ profile.max_time_minutes
    AND abs(recipe.calories - profile.calorie_target) ≤ tolerance
```

## Filtering Stages

### Stage 1: Hard Filters (exclusion)
- allergy / avoid_flags
- ingredient exclusion
- required attributes
- time limit
- calorie limit

If any fails → recipe excluded

### Stage 2: Candidate Set
Remaining recipes form candidate pool per Dish

### Stage 3: Variant Resolution
If multiple recipes exist for same dish:

```
score(recipe) =
    match_attributes +
    effort_alignment +
    time_closeness +
    calorie_closeness +
    preference_alignment
```

## Scoring Details

### Attribute Match
- +10 per matching required attribute

### Effort Alignment
preferred_effort match:
- exact match → +20
- adjacent level → +10
- mismatch → +0

### Time Closeness
`score = max(0, 20 - abs(recipe_time - preferred_time)/5)`

### Calorie Closeness
`score = max(0, 20 - abs(recipe_calories - target)/100)`

## Dish-Level Selection

```
for each dish:
    candidates = visible_recipes[dish]
    best = max(candidates, score)
```

## Edge Cases

- **No valid recipe** → dish is hidden OR shown as "no compatible variant"
- **Partial match (future extension)** → soft suggestions (disabled in v1)

## Determinism Rule

> Same profile + same dataset always produces identical output.

No randomness allowed.

## Performance Constraints
- O(n) per dish group max
- pre-filtered index reduces global search space
- no cross-dish comparisons required

## Integration Points
- Search engine uses same filter
- Meal planning reuses visibility function
- Shopping list ignores matching engine (only selected recipes)

## Design Philosophy
- strict over flexible
- predictable over adaptive
- explicit over inferred
- offline deterministic evaluation only
