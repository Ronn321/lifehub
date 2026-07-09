# Recipes Testing Strategy

## Overview

Defines the testing approach for ensuring correctness, determinism, and offline reliability across the Recipes domain.

## Core Principle

> Everything critical must be testable without UI.

## Testing Layers

### 1. Unit Tests (Core Logic)

Focus:
- matching engine
- ontology evaluation
- shopping aggregation
- ingredient normalization

### 2. Domain Tests

Focus:
- RecipeEntity validity
- Dish grouping correctness
- variant selection logic
- import pipeline transformations

### 3. Integration Tests

Focus:
- search + filtering pipeline
- meal plan → shopping list flow
- import → validation → storage chain

### 4. UI Tests (Minimal but essential)

Focus:
- cook mode flow
- variant switching UI
- meal planner interactions

## Determinism Requirement

> Given same input: profile + dataset → always identical output

All tests enforce deterministic results.

## Matching Engine Tests
- allergy exclusion correctness
- calorie boundary validation
- time constraint enforcement
- variant selection stability

## Import Pipeline Tests
- Chefkoch parsing correctness
- malformed HTML handling
- ontology mapping validity
- partial import behavior

## Search Tests
- index lookup correctness
- multilingual query handling
- pagination stability

## Shopping List Tests
- unit aggregation accuracy
- ingredient deduplication
- category grouping consistency

## Performance Tests
- search < threshold time
- cook mode no UI lag
- large dataset handling (10k+ recipes)

## Offline Mode Tests
- full app functionality without network
- no hidden network dependencies
- import/export without connectivity

## Regression Strategy
- snapshot tests for RecipeEntity output
- golden files for import pipeline results
- deterministic seed dataset

## Edge Case Coverage
- missing ingredients
- broken ontology references
- partial recipe imports
- invalid unit conversions

## Test Data Strategy
- synthetic recipe corpus
- Chefkoch sample fixtures
- edge-case ingredient datasets

## CI Strategy (future-ready)
- run full domain test suite
- validate ontology consistency
- verify import adapters
- enforce schema version compatibility

## Design Constraint

> If it cannot be tested offline, it does not exist in v1.
