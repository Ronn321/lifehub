# Recipes Chefkoch Import Pipeline

## Overview

Defines the complete pipeline for importing recipes from Chefkoch into the internal MorphCook-compatible RecipeEntity format.

## Core Principle

> External recipes are transformed, never copied.

## Pipeline Overview

```
URL Input
   ↓
HTML Fetcher
   ↓
DOM Parser
   ↓
Structured Extractor
   ↓
Normalization Layer
   ↓
Ingredient Mapping
   ↓
Ontology Mapping
   ↓
Validation Engine
   ↓
RecipeEntity Draft
```

### 1. Input Stage

**Supported Input**
- Chefkoch recipe URL

Example:
`https://www.chefkoch.de/rezepte/197781083682428/Schneller-Nudelauflauf.html`

### 2. HTML Fetcher

**Characteristics**
- static HTML download
- no JS execution
- retry mechanism (max 3 attempts)

### 3. DOM Parsing

**Extraction Targets**
- title
- ingredients
- steps
- preparation time
- servings
- optional ratings (ignored v1)

### 4. Structured Extractor

Transforms raw HTML into:

```
RawRecipeDTO {
  title
  ingredients[]
  steps[]
  meta
}
```

### 5. Normalization Layer

**Tasks**
- unit standardization
- ingredient synonym mapping
- whitespace cleanup
- step segmentation

### 6. Ingredient Mapping

**Process**
- match extracted ingredients → IngredientEntity tree
- fallback to "unknown ingredient" node if no match

### 7. Ontology Mapping

**Output**
Assigns:
- contains_flags
- attributes
- technique_tags

Derived from ingredient composition + heuristics.

### 8. Validation Engine

Checks:
- schema completeness
- ingredient validity
- ontology consistency
- step completeness

**Reject if:**
- missing critical fields
- inconsistent ontology flags

### 9. RecipeEntity Draft Generation

**Final output:**
- structured RecipeEntity
- linked to pseudo DishEntity (if not existing)
- marked as source: chefkoch

## Import Modes

### RAW MODE
- minimal transformation
- preserves original structure

### NORMALIZED MODE
- cleaned and structured
- unit conversion applied

### ENHANCED MODE (future)
- variant suggestion generation
- ontology expansion suggestions

## Error Handling
- network failure → retry
- parse failure → fallback heuristics
- mapping failure → partial import allowed

## Performance Constraints
- single URL import < 2s target (excluding network)
- no batch scraping in UI thread
- async pipeline execution required

## Design Constraint

> Import is a pipeline, not a feature.
