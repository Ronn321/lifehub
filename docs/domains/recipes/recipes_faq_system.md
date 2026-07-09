# Recipes FAQ System

## Overview

Defines an integrated FAQ system embedded into the Recipes domain. It provides contextual help, searchable documentation, and UI-linked explanations.

## Core Principle

> Help is part of the product, not a separate layer.

## Structure

```
FAQCategory
 ├── Questions
 │     ├── Question
 │     ├── Answer (EN/DE)
 │     ├── Tags
```

## Data Model

```
FAQEntry {
  id: String
  question: Map<Lang, String>
  answer: Map<Lang, String>
  tags: List<String>
  related_recipe_topics: List<String>
}
```

## Categories
- onboarding
- recipes
- ingredients
- meal planning
- shopping list
- import/export
- cook mode
- troubleshooting

## Access Patterns

### 1. Search-Based Access
- full-text search over FAQ entries

### 2. Contextual Linking
- UI elements link directly to FAQ entries
- e.g. "Why is this recipe hidden?"

### 3. Settings Integration
- FAQ embedded in settings screens

## Matching System

FAQ entries are ranked by:
- keyword overlap
- current screen context
- user profile relevance

## Localization
- all entries bilingual (EN/DE)
- extensible to additional languages via Map<Lang, String>

## Performance
- pre-indexed FAQ search table
- cached in memory at startup
- O(1) lookup for tagged categories

## Update Strategy
- shipped with app updates
- no runtime remote FAQ updates in v1

## Design Constraint

> FAQ must feel like part of navigation, not documentation.
