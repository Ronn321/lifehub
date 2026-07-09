# Recipes Information Architecture

## Overview

Defines how recipe-related information is structured, grouped, indexed, and accessed across the system. The architecture is optimized for offline-first performance, MorphCook variant logic, and future NAS synchronization.

## Top-Level Structure

```
Recipes Domain
├── Dish Layer (concept grouping)
├── Recipe Layer (atomic variants)
├── Ingredient Layer (ontology system)
├── Meal Planning Layer
├── Shopping Layer
├── Import Layer
└── Indexing Layer
```

## 1. Dish Layer

### Purpose
Represents a conceptual food entity, not a cooking instruction.

### Characteristics
- Does not contain ingredients
- Acts as grouping key for variants
- UI aggregation unit

### Example
- Döner
- Pasta Carbonara
- Chicken Curry

### Relationship
- 1 Dish → N Recipes

## 2. Recipe Layer

### Purpose
Atomic executable cooking instruction.

### Properties
- contains ingredients
- contains steps
- has ontology flags
- has calories/time/effort metadata

### Rule
> A recipe is immutable once created.

## 3. Ingredient Layer

### Structure
Hierarchical ontology tree:

```
dairy
  ├── milk
  ├── cheese
  └── yogurt
```

### Responsibilities
- normalization
- allergy detection
- avoidance matching
- shopping aggregation

## 4. Meal Planning Layer

### Structure
Weekly grid:

```
Week → Days → Meals → RecipeID
```

### Properties
- references Recipe (not Dish)
- supports drag & drop assignment
- offline persistence

## 5. Shopping Layer

### Function
Aggregates ingredients across selected recipes.

### Features
- unit conversion
- deduplication
- aisle grouping
- scaling per servings

## 6. Import Layer

### Purpose
Transform external recipes into internal schema.

### Pipeline Output
- RecipeEntity
- normalized ingredients
- inferred ontology flags

## 7. Indexing Layer

### Purpose
Enable fast offline search.

### Index Fields
- recipe title
- ingredient names
- tags
- dish name
- language variants

### Strategy
- precomputed index bundled in assets
- no runtime backend indexing

## Access Patterns

### Primary flows
- Dish → Recipes → Recipe Detail
- Search → Recipe results
- Meal Plan → Recipe lookup
- Cookbook → saved RecipeIDs

## Performance Principle

> All navigation is local lookup, never relational joins at runtime.
