# Recipes Mobile Creation Flow

## Overview

Defines the full offline-first recipe creation experience on mobile devices. The system is optimized for fast input, structured data capture, and MorphCook-compliant variant generation.

## Core Principle

> Recipe creation must feel faster than writing a note.

No backend required, no external validation, fully local until export.

## Entry Points
- Home → Create Recipe
- Dish View → Add Variant
- Import → Edit before save
- Cook Mode → Save modifications as new recipe

## Creation Modes

### 1. Manual Creation
- full structured editor
- ingredient + step builder
- ontology tagging

### 2. Clone Variant
- duplicates existing recipe
- pre-fills all fields
- modifies only selected dimensions

### 3. Import-based Creation
- from Chefkoch / external sources
- pre-normalized draft
- user review required

## Creation Flow Pipeline

```
Step 1: Basic Info
   ↓
Step 2: Ingredients
   ↓
Step 3: Steps
   ↓
Step 4: Ontology Tags
   ↓
Step 5: Variant Linking (Dish)
   ↓
Step 6: Validation
   ↓
Step 7: Save locally
```

## Ingredient Input System
- autocomplete from IngredientEntity
- hierarchical selection
- unit-aware entry
- optional flag per ingredient

## Step Builder
- reorderable list
- optional timers per step
- multiline editor per step
- quick-add template steps

## Variant Linking

User must assign:
- existing Dish OR create new Dish

If none selected:
- system prompts dish creation

## Validation Rules
- must contain ≥1 ingredient
- must contain ≥1 step
- ontology consistency check
- no invalid flags

## Local Persistence
- saved immediately in local DB
- no draft loss
- autosave per field change

## UX Constraints
- minimal modal depth
- single-screen progressive flow
- no external navigation required

## Performance
- instant local writes
- no debounce-heavy validation
- offline-first rendering
