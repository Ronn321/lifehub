# Recipes Ingredient System

## Overview

Defines the ingredient ontology system, responsible for normalization, hierarchy management, allergy detection, and shopping aggregation.

## Core Principle

> Ingredients are not strings. They are structured ontology nodes.

## Data Structure

```
IngredientEntity {
  id: String
  name: Map<Lang, String>

  parent_id: String?
  children_ids: List<String>

  ontology_tags: Set<String>
}
```

## Hierarchical Model

```
food
 ├── dairy
 │    ├── milk
 │    ├── cheese
 ├── meat
 │    ├── beef
 │    ├── chicken
```

## Key Features

### 1. Hierarchical Inheritance
- parent selection includes all children
- avoids manual duplication

### 2. Typeahead System
- search across full tree
- supports partial matches
- multilingual support

### 3. Normalization Layer
- maps synonyms → canonical ingredient
- example: `tomatoe` → `tomato`

## Allergy System Integration

Ingredient system drives:
- avoid_flags expansion
- allergen detection
- recipe exclusion logic

## Unit Association

Ingredients may define:
- default unit
- compatible unit families

Example:
- flour → g
- milk → ml

## Composite Ingredients

Some ingredients expand into sub-components:
- spice blends
- sauces
- pre-mixes

## Category Mapping

Ingredients mapped to:
- produce
- dairy
- meat
- pantry
- frozen
- spices

Used by shopping engine.

## Search Integration

Ingredient system powers:
- search filtering
- recipe discovery
- import normalization

## Data Integrity Rules
- no orphan children
- no circular references
- every ingredient has stable ID
- names are multilingual map

## Performance Strategy
- preloaded tree structure
- indexed lookup table
- O(1) ID resolution
