# Recipes Cook Mode

## Overview

Cook Mode is a full-screen, distraction-free execution environment for step-by-step recipe cooking.

## Core Principle

> One step at a time, nothing else matters.

## Entry Points
- Recipe Detail → "Start Cooking"
- Meal Plan slot → direct cook launch
- Cookbook quick action

## UI Structure

```
Cook Mode
 ├── Step Header
 ├── Step Content
 ├── Timer Area
 ├── Progress Indicator
 └── Navigation Controls
```

## Step System

Each step contains:
- instruction text
- optional timer
- optional image reference

## Navigation

**Methods**
- swipe left/right
- tap next/previous
- optional quick-tap advance (if enabled)

## Timer System

**Features**
- per-step timers
- pause/resume
- background persistence
- visual flash alert on completion

## Visual Alerts
- coral/teal flash overlay
- accessibility-safe
- respects reduceMotion

## State Persistence

```
CookState {
  recipe_id
  current_step
  elapsed_time
  active_timer
}
```

Restores automatically after app restart.

## Scaling
- servings adjustment available in cook mode
- recalculates ingredient display only

## Accessibility
- large tap zones
- high contrast mode support
- haptic feedback optional
- visual-only timer alerts option

## Constraints
- no multitasking UI
- no navigation away without confirmation
- no search inside cook mode

## Performance
- preloaded recipe only
- no dynamic fetches
- zero network dependency

## UX Philosophy

> Cook Mode is a state, not a screen.
