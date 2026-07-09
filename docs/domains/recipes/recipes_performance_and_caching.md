# Recipes Performance and Caching

## Overview

Defines performance strategies for offline-first operation, focusing on low-latency UI rendering, deterministic computation, and minimal memory overhead.

## Core Principle

> Precompute everything that is not user-specific.

## Caching Layers

### 1. Memory Cache
- active recipes
- ingredient tree
- dish map
- search index snapshot

### 2. Disk Cache
- last search results
- recent meal plans
- cook mode state snapshots

### 3. Asset Cache
- bundled JSON files loaded once
- parsed into in-memory structures

## Search Performance Model

```
Query → Tokenization → Index Lookup → Filter → Rank → Cache
```

## Index Strategy
- precomputed at build time
- inverted index for:
  - ingredients
  - titles
  - dish names
  - tags

## Lazy Loading Strategy
- extended recipe sets loaded on demand
- cuisine partitions loaded per scroll region
- no full dataset load required

## Rendering Optimization

**Rules**
- max 50 items rendered per list
- ListView.builder required
- off-screen widgets disposed

## Pagination Performance
- cursor-based search pagination
- offset-based cookbook pagination
- weekly grouping for meal plans

## Cache Invalidation Rules

**Trigger events**
- recipe update
- import completion
- ontology change
- meal plan modification

## Cook Mode Optimization
- full recipe preloaded into memory
- no disk access during cooking
- step transitions precomputed

## Memory Strategy
- avoid duplicate ingredient objects
- shared immutable IngredientEntity instances
- deduplicated string maps per language

## Cold Start Optimization

**Preload:**
- core recipes
- dish index
- ingredient tree

**Defer:**
- extended recipes
- search partitions

## Performance Constraints
- no runtime full scan of recipes
- no dynamic indexing
- no recursive computation in UI layer

## Design Philosophy

> Performance is achieved by structure, not computation.
