# Recipes External Import Adapters

## Overview

Defines a unified adapter system for importing recipes from multiple external sources into the internal RecipeEntity model.

## Core Principle

> Every external source is just a transformation adapter.

No source is treated natively.

## Adapter Architecture

```
External Source
   ↓
Source Adapter
   ↓
Raw DTO
   ↓
Normalization Pipeline
   ↓
RecipeEntity
```

## Supported Adapters (v1)

### 1. Chefkoch Adapter
- HTML-based scraping
- DOM extraction
- strongest priority source

### 2. Generic HTML Recipe Adapter
- fallback parser
- heuristic extraction
- supports structured recipe pages

### 3. Manual JSON Adapter
- direct import of structured RecipeEntity-like data
- used for debugging and migration

### 4. Mealie/Tandoor Adapter (planned)
- structured API mapping
- future NAS sync compatibility layer

## Adapter Interface

```
interface RecipeImportAdapter {
  canHandle(input): boolean
  parse(input): RawRecipeDTO
  normalize(dto): NormalizedRecipe
}
```

## Processing Pipeline

```
Input → Adapter Selection → Parse → Normalize → Ontology Mapping → Validation → RecipeEntity
```

## Adapter Selection Logic

Priority order:
1. Known domain match (Chefkoch, Mealie)
2. Structured JSON detection
3. Generic HTML fallback

## Error Handling
- adapter failure → fallback to generic adapter
- parsing failure → partial extraction allowed
- validation failure → reject or draft mode

## Extensibility

New adapters added by:
- implementing interface
- registering in adapter registry
- adding detection rule

No core pipeline modification required.

## Design Constraint

> Adapters are plug-ins, not core logic.
