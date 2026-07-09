# Recipes Accessibility

## Overview

Defines accessibility standards for the Recipes domain, ensuring usability across:
- reduced mobility
- visual impairments
- cognitive load constraints
- motion sensitivity

## Core Principle

> Accessibility is structural, not decorative.

## Visual Accessibility

### Contrast
- high contrast mode support
- paper texture disabled in accessibility mode

### Typography
- scalable font system
- minimum tap-readable size enforced
- fallback fonts for readability

## Motion Accessibility

### reduceMotion flag

When enabled:
- disable morph animations
- remove ingredient transitions
- replace fades with instant swaps

## Interaction Accessibility

### Tap Targets
- minimum 48dp touch areas
- expanded hitboxes for small icons

### Navigation
- full support for linear navigation
- no gesture-only interactions

## Cook Mode Accessibility

**Features**
- step narration support (future-ready)
- visual timer alerts (non-audio fallback)
- haptic feedback optional toggle

## Cognitive Accessibility

**Design Rules**
- one primary action per screen
- no deep nested modals
- clear progression flow in creation & cooking

## Color Accessibility
- no color-only information encoding
- redundant labels for all states
- variant differences not color-dependent

## Input Accessibility
- full keyboard support (tablet mode)
- voice input hooks prepared (future extension)
- autocomplete for ingredients reduces typing load

## Error Handling
- explicit error messages
- no silent failures
- actionable recovery instructions

## Screen Reader Support
- semantic labeling for:
  - recipe steps
  - ingredient lists
  - variant selection rows

## Performance Consideration

Accessibility mode reduces:
- animation cost
- visual rendering complexity
- unnecessary UI layers

## Design Philosophy

> Accessibility is not a mode. It is a baseline.
