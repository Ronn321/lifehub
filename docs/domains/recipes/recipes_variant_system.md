# Recipes Variant System

## Overview

The Variant System is the core differentiator of MorphCook-style recipe handling. It ensures that every dietary, effort, and calorie variation is a real, explicit recipe entity, not a computed substitution.

## Core Concept

> Variants are not transformations. Variants are siblings.

Each variant is:
- fully authored recipe
- independently valid
- linked via DishEntity

## Structure

```
Dish
 ├── Recipe: Classic
 ├── Recipe: Vegan
 ├── Recipe: Keto
 ├── Recipe: Halal
```

No inheritance. No overlays.

## Variant Dimensions

**Supported axes**
- diet (vegan, vegetarian, halal, etc.)
- effort (easy, medium, hard)
- calories (low, medium, high)
- time (quick, standard, long)
- technique (bake, fry, grill, etc.)

## Variant Selection Logic

### Default selection

Based on profile:

```
preferred_variant =
    match(profile.diet)
    + match(profile.effort)
    + match(profile.calorie_target)
```

### Availability Rules

A variant is shown only if:
- it exists explicitly
- it passes matching engine filters
- it belongs to the dish group

### Unavailable Variants

If a combination does not exist:
- UI shows disabled chip
- explanation tooltip: *no matching recipe exists*
- no fallback generation at runtime

## Variant Linking Model

`RecipeEntity.dish_id → DishEntity.id`

No cross-variant dependency exists.

## Morph Behavior (UI)

When switching variants:
- ingredient list morphs (fade swap)
- step list re-renders
- macro panel updates instantly
- no loading state required

## Variant Creation Rules

A new variant must:
- fully redefine ingredients
- fully redefine steps
- match ontology flags correctly
- pass validation pipeline

## Variant Explosion Control

To avoid combinatorial explosion:
- only meaningful variants are generated
- no automatic cross-product generation
- pipeline enforces variant limits per dish

## Extensibility

New variant dimensions can be added by:
- adding ontology dimension
- extending DishEntity schema
- updating UI row renderer

No migration required for existing recipes.
