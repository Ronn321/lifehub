# Recipes Design Language

## Overview

Defines the complete visual, interaction, and emotional design system for the Recipes domain. It ensures consistency across UI, variant system, and cook experience.

## Core Principle

> The app should feel like a curated cookbook, not a tool.

## Visual Identity

### Typography
- **Playfair Display** → headlines, dish names
- **Caveat** → handwritten annotations
- **JetBrains Mono** → metadata, measurements

### Material Style
- paper grain textures
- soft shadows
- polaroid-style cards
- slight rotation for imperfection

### Color Philosophy
- muted base palette
- accent colors per dish (not per UI state)
- no semantic color reliance (accessibility-safe)

## Layout System

### Grid Rules
- card-based layout
- modular vertical rhythm
- generous spacing

## Component Aesthetic Rules

### Recipe Card
- image placeholder (striped)
- title overlay
- subtle tilt
- metadata footer

### Buttons
- minimal border
- soft hover states
- tactile press animation

### Chips (Variants)
- pill-shaped
- soft border
- selected state subtle highlight (not color heavy)

## Interaction Philosophy

> Interactions should feel physical, not digital.

## Motion Language
- fade transitions
- gentle morph between variants
- step transitions in cook mode
- no aggressive animations

## Microinteractions
- ingredient selection highlight flash
- save animation subtle pulse
- cook step completion tick fade

## Cook Mode Aesthetic
- full-bleed dark mode
- reduced UI clutter
- typography-focused layout
- timer as central element

## Iconography
- minimal line icons
- consistent stroke width
- no decorative icons

## Density Rules
- low information density in cook mode
- medium density in browsing
- high density only in search results

## Emotional Design Goal
- calm
- structured
- editorial
- non-technical feeling

## Design Constraint

> No UI element should feel like a database view.
