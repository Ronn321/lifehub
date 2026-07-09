# Recipes Ontology Extension Model

## Overview

Defines how the system extends ontology safely without migrations, ensuring long-term stability of the Recipes domain.

## Core Principle

> Ontology evolves additively only.

No breaking changes, no deletions of existing concepts.

## Ontology Structure

**Categories**
- contains_flags (negative constraints)
- avoid_flags (user-facing abstraction)
- attributes (positive descriptors)
- technique_tags (cooking methods)

## Extension Model

### Rule 1: Add-only schema evolution
ontology.json is never rewritten, only appended

### Rule 2: Backward compatibility guaranteed
- old recipes remain valid
- new flags do not affect existing validation

## Extension Types

### 1. New Ingredient Flag
Example:
- gluten_free_oats

### 2. New Dietary Mode
Expands into multiple flags:
- vegan-lite
- keto-strict

### 3. New Attribute Dimension
Example:
- spicy_level
- prep_complexity

## Mapping Rules

### Avoid Flag Expansion
`vegan` → excludes:
- meat, dairy, eggs, honey

## Validation Rules
- every flag must be registered in ontology
- no duplicate semantic meanings
- no ambiguous overlapping definitions

## Extension Pipeline

1. Add ontology entry
2. Run validator
3. Regenerate affected recipes
4. Update index

## Safe Deployment Model
- ontology changes shipped via app update
- no runtime remote updates in v1
- deterministic version binding

## Versioning Strategy

```
ontology_version: int
```

**Rules:**
- recipe references fixed to ontology version
- mismatch triggers fallback validation mode

## Conflict Prevention
- no renaming of existing flags
- no deletion allowed
- deprecation is logical only (UI hides, data stays)

## Future Expansion (LifeHub-ready)
- cross-domain ontology sharing (health, groceries)
- NAS-level ontology registry
- multi-app shared ingredient graph

## Design Philosophy
- additive evolution
- deterministic interpretation
- strict backward compatibility
- no runtime mutation of schema
