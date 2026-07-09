# Recipes Domain Overview

## Purpose

The /recipes domain defines the complete system for managing, creating, importing, storing, and consuming recipes in the LifeHub ecosystem. It is designed as an offline-first, NAS-ready, mobile-native recipe system inspired by Mealie and Tandoor, but structurally aligned with MorphCook principles.

## Core Objectives

### 1. Offline-First Operation
- No runtime backend required in v1
- All recipe data is stored locally on device
- Synchronization is handled via file export/import only

### 2. NAS-Centric Future Architecture
- Recipes are designed to be centrally stored on a NAS (LifeHub core)
- Mobile apps act as clients + editors
- Future sync layer is additive, not structural

### 3. MorphCook Compatibility
- Each variant is a standalone recipe entity
- Recipes are grouped under dish concepts
- Full flag-based ontology system is required

### 4. High-Quality Import System
- External recipes (e.g. Chefkoch) can be converted into native format
- Import pipeline is deterministic, not AI runtime dependent

## System Boundaries

### In Scope (v1)
- Recipe storage (local)
- Recipe creation (mobile)
- Recipe import (external sources via pipeline)
- Recipe search (local index)
- Meal planning (local)
- Shopping list generation (local aggregation)
- File-based export/import

### Out of Scope (v1)
- Cloud backend
- Real-time sync
- Social features
- AI runtime inference
- Multi-user collaboration

## Domain Entities (High-Level)
- **Recipe** — atomic cooking instruction set
- **Dish** — conceptual grouping of recipes
- **Ingredient** — normalized ontology entity
- **Variant** — explicit recipe variant, not virtual
- **MealPlan** — calendar assignment of recipes
- **ShoppingList** — aggregated ingredient output
- **ImportSource** — external recipe origin, e.g. Chefkoch

## Key Design Principle

> A recipe is never modified implicitly. Every variation becomes a new explicit entity.

This ensures:
- reproducibility
- offline determinism
- clean sync semantics
- MorphCook compatibility

## External Integration Strategy

All external sources are transformed via import adapters:
- **Chefkoch Adapter** (primary v1 target)
- **Generic HTML Recipe Adapter**
- **Future:** structured APIs (Mealie/Tandoor export)

All imports result in:
- normalized RecipeEntity
- ontology mapping
- optional variant expansion

## Relationship to LifeHub
- Recipes domain is a subsystem of LifeHub
- LifeHub provides:
  - NAS storage layer (future)
  - cross-domain linking (shopping, calendar, health)
- v1 operates independently but is structurally LifeHub-compatible

## Design Philosophy
- deterministic over dynamic
- structured over flexible
- explicit over inferred
- offline over connected
- extensible over optimized prematurely
