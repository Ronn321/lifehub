# Layout Specification

**Status:** Draft v1

---

# Overview

The desktop application uses a persistent multi-region layout.

The layout should remain familiar across every page.

---

# Primary Regions

The application consists of

1. Navigation
2. Main Content
3. Overlay Layer
4. Video Player
5. Modal Layer
6. Notification Layer

---

# Persistent Navigation

Navigation remains visible while browsing.

Responsibilities include

- page switching
- search
- collections
- user access

---

# Main Content Area

Displays

- Home
- Movies
- Series
- Collections
- Search
- Detail Pages

Only one page is active at a time.

---

# Content Flow

Most pages scroll vertically.

Inside pages, media rows scroll horizontally.

This creates a browsing experience similar to streaming platforms.

---

# Hero Area

Many pages begin with a large featured section.

Possible contents

- featured movie
- featured series
- continue watching
- editorial recommendation

---

# Content Rows

Rows display

- posters
- landscape cards
- collections
- recommendations

Each row has

- title
- optional description
- horizontal scrolling

---

# Detail Pages

Selecting media opens a dedicated detail page.

Contains

- artwork
- metadata
- actions
- recommendations
- cast
- related content

---

# Overlay System

Temporary overlays include

- context menus
- search suggestions
- dialogs
- notifications
- playback controls

---

# Fullscreen Player

Playback replaces the browsing layout.

Player overlays appear only when required.

---

# Empty States

Every page defines an empty state.

Examples

- no results
- empty collection
- unavailable server
- loading

---

# Loading States

Pages support

- skeleton loading
- progressive loading
- placeholder artwork

---

# Error States

Dedicated layouts exist for

- offline server
- missing media
- playback errors
- permission issues

---

# Window Resizing

The layout adapts continuously.

Content never overlaps.

Scrolling remains predictable.

**✅ Implemented:** Full-width toggle via `JellyfinPageWrapper` + Zustand store (`jellyfin-layout-store.ts`). Button: fixed top-right, toggles between max-w-7xl centered and full main width. Persists across sessions. Adapts when sidebar collapses/expands.

---

# Future Expansion

Later revisions will specify

- measurements
- spacing
- grid system
- responsive rules
- animation timing
- z-index hierarchy
- overlay behavior
- rendering priorities
