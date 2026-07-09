# Recipes UI System

## Overview

Defines the entire visual and interaction system for Recipes. The UI is designed as a design-led, aesthetic-first, variant-aware cookbook interface inspired by Mealie/Tandoor but with MorphCook's editorial style.

## Design Principles
- editorial cookbook aesthetic
- variant-first interaction model
- minimal cognitive load
- tactile interactions
- offline responsiveness
- deterministic rendering

## Visual Language

### Typography
- **Playfair Display** (headings)
- **Caveat** (handwritten accents)
- **JetBrains Mono** (metadata)

### Layout Style
- card-based cookbook grid
- polaroid-style recipe cards
- soft rotation (subtle imperfection)
- paper grain texture background
- striped placeholder images

## Core Screens

### 1. Home (Cookbook Feed)
- featured dish banner
- seasonal suggestions
- saved recipes grid
- quick search bar

### 2. Dish Detail View

```
Dish
 ├── Variant Row: Diet
 ├── Variant Row: Effort
 ├── Variant Row: Calories
 ├── Ingredients Tab
 ├── Steps Tab
 └── Macros Tab
```

Each row:
- collapsed by default
- expands into selectable chips
- reflects user profile defaults

### 3. Recipe Detail View
- full ingredient list
- step-by-step instructions
- cook mode entry
- variant switch shortcut
- save button (saves recipe ID)

### 4. Cook Mode

Full-screen immersive mode:
- step-by-step progression
- timers embedded in steps
- swipe / tap navigation
- progress persistence
- visual flash alerts for timers

### 5. Search View
- unified search bar
- tag filters
- ingredient filters
- live local results

### 6. Meal Planner
- weekly grid
- drag & drop recipes
- tap-to-assign
- export to shopping list

### 7. Shopping List
- grouped by category
- unit aggregation
- editable quantities
- checkbox completion

## Interaction Model

### Primary Interaction Types
- tap → select/open
- long press → context actions
- swipe → navigation in cook mode
- drag → meal planner assignment

### Variant UI System

Variants are first-class UI elements:
- displayed per dimension row
- selection triggers in-place morph animation
- unavailable variants disabled (not hidden)

### Animation Rules
- no heavy motion
- subtle fade + highlight flash
- ingredient morph transitions
- respect reduceMotion setting

### State Binding
- UI binds directly to:
  - RecipeEntity
  - DishEntity
  - Profile state
- no intermediate UI models

### Accessibility
- high contrast mode support
- reduced motion mode
- large tap targets
- step narration compatibility (future)

## Performance Constraints
- max 50 rendered items per list
- lazy list rendering
- prefetch next page threshold = 10 items
