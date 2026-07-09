# Recipes Offline-First Architecture

## Overview

The Recipes domain is fully offline-first by design. No runtime backend, no network dependency, and no external API calls exist within the application runtime. All data is locally available and deterministically processed.

## Core Principle

> The device is the system of record.

All operations must succeed without connectivity:
- recipe browsing
- search
- meal planning
- shopping list generation
- cook mode execution

## Architecture Layers

```
UI Layer (Flutter)
    ↓
Domain Logic Layer (pure Dart)
    ↓
Local Data Layer (Hive / SQLite)
    ↓
Asset Layer (bundled JSON)
```

### 1. Asset Layer

**Purpose**

Immutable base dataset shipped with the app.

**Contents**
- recipes.json
- dishes.json
- ontology.json
- ingredients.json
- index.json (precomputed search index)

**Characteristics**
- read-only at runtime
- versioned per app release
- never modified by user

### 2. Local Data Layer

**Purpose**

User-generated and runtime-modifiable data.

**Storage**
- Hive (preferred) or SQLite fallback

**Stores**
- saved recipes
- meal plans
- history
- user profile
- import queue

### 3. Domain Logic Layer

**Responsibility**

All business logic runs here:
- matching engine
- shopping aggregation
- variant selection
- ontology evaluation

**Constraint**
- Must be pure functions where possible
- No UI dependencies allowed.

### 4. UI Layer

**Responsibility**
- rendering recipes
- handling interactions
- state binding

**Constraint**
- no business logic
- no data transformation logic
- only presentation logic

## Offline Guarantees

**Guaranteed Features Without Network**
- full recipe browsing
- search (local index)
- cook mode
- meal planning
- shopping list
- import from file
- export backups

## Data Flow Model

```
User Action
   ↓
UI Event
   ↓
Domain Function
   ↓
Local Store Update
   ↓
UI Re-render
```

## Import/Export Strategy

**Export**
- JSON snapshot of local state
- optional compression
- optional encryption

**Import**
- merge or replace mode
- schema validation
- deduplication by ID

## Future NAS Integration (pre-designed)

Architecture is already compatible with:

> Mobile App ↔ File Sync ↔ NAS Store ↔ LifeHub

No code change required, only adapter layer.

## Performance Strategy
- precomputed indices
- lazy loading of extended assets
- minimal runtime computation
- deterministic caching

## Failure Model
- No network failure handling required (no network)
- local corruption handled via:
  - backup restore
  - schema validation fallback
