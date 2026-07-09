# Recipes Storage Layers

## Overview

Defines the complete storage hierarchy for the Recipes domain, spanning bundled assets, local runtime storage, and future NAS integration layers.

## Core Principle

> Storage is layered, not unified.

Each layer has a distinct responsibility and mutation rule.

## Storage Architecture

```
UI Layer
   ↓
Domain Layer
   ↓
Local Storage Layer
   ↓
Asset Storage Layer
   ↓
Future NAS Layer
```

### 1. Asset Storage Layer (Read-Only)

**Purpose**
Immutable application dataset shipped with the app.

**Contents**
- recipes.json
- dishes.json
- ontology.json
- ingredients.json
- index.json

**Properties**
- read-only at runtime
- versioned per release
- never modified by user

### 2. Local Storage Layer (Writable)

**Purpose**
Stores all user-generated and runtime data.

**Backend Options**
- Hive (preferred)
- SQLite (fallback for query-heavy future needs)

**Stores**
- saved recipes
- meal plans
- shopping lists
- history
- import drafts
- user profile

### 3. Domain Storage Abstraction

**Purpose**
Provides unified access interface.

Repository Pattern:
- RecipeRepository
- MealPlanRepository
- ShoppingRepository

**Rule**
> UI never accesses storage directly.

### 4. Cache Layer (Ephemeral)

**Purpose**
Performance optimization layer.

**Characteristics**
- in-memory only
- disposable
- rebuilt at startup

Used for:
- search results
- dish lookup maps
- ingredient tree

### 5. Future NAS Layer (LifeHub)

**Purpose**
Centralized external storage (not active in v1).

```
/recipes/
  recipes.bundle.json
  dishes.bundle.json
  deltas/
```

**Role**
- backup mirror
- cross-device sync source
- long-term persistence layer

## Data Flow

**Write:**
`UI → Domain → Local Storage`

**Read:**
`UI → Domain → Cache → Local Storage → Assets fallback`

## Consistency Model
- local storage = source of truth
- assets = baseline fallback
- NAS = optional external mirror

## Integrity Rules
- no partial writes without commit
- atomic updates for recipe entities
- ID immutability guaranteed

## Migration Strategy
- schema_version per storage layer
- upgrade applied at load time
- backward compatibility required

## Design Constraint

> Storage layers must never collapse into one abstraction.
