# Recipes Search System

## Overview

The search system is a fully offline, pre-indexed, deterministic search engine for recipes. It operates entirely on local assets without runtime computation-heavy indexing.

## Core Principle

> Search is lookup, not computation.

All search results are derived from precomputed indexes.

## Index Structure

```
index.json
├── title_tokens
├── ingredient_tokens
├── tag_tokens
├── dish_tokens
└── language_tokens
```

## Search Flow

### Step 1: Tokenization

Input query is normalized:
- lowercase
- stemmed (light)
- language-aware split

### Step 2: Index Lookup

Direct lookup against:
- recipe titles
- ingredient names
- dish names
- tags

### Step 3: Candidate Merge

All matches merged into candidate set.

### Step 4: Profile Filtering

Candidates are filtered using:
- avoid_flags
- ingredient exclusions
- calorie constraints
- time constraints

### Step 5: Ranking

```
score =
    text_match +
    dish_relevance +
    ingredient_overlap +
    profile_alignment
```

## Ranking Signals

### Text Match
- exact match boost
- partial match scoring
- phrase match priority

### Dish Relevance
- recipes belonging to popular dishes boosted
- user saved dishes boosted

### Ingredient Overlap
- more matching ingredients → higher rank

### Profile Alignment
- diet compatibility
- calorie fit
- effort preference

## Pagination
- 20 items per page
- cursor-based navigation
- prefetch threshold: 10 items

## Performance Strategy
- no runtime full-text search engine
- index precomputed at build time
- constant-time lookup tables
- lazy result expansion

## Edge Cases

### No Results
- show fallback suggestions:
  - similar dish names
  - partial ingredient matches

### Multi-language Queries
- query resolved independently per language index
- merged results deduplicated by recipe ID

## Integration Points
- Matching Engine applies after search
- Meal Planner reuses search results
- Import pipeline feeds index builder

## Design Philosophy
- deterministic results
- no AI ranking
- no runtime heuristics beyond scoring formula
- fully reproducible output
