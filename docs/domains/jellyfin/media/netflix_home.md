# Home Page Specification

**Status:** Draft v1

---

# Overview

The Home page is the primary landing page after login.

Its purpose is content discovery.

---

# Goals

The page should immediately present

- unfinished media
- personalized recommendations
- recently added content
- trending media
- favorite genres

---

# Hero Section

Large cinematic presentation of featured media.

Contains

- background artwork
- title
- description
- play action
- details action

Future versions define

- transitions
- automatic rotation
- personalization

---

# Continue Watching

Displays unfinished media.

Each card contains

- poster
- progress
- remaining time
- resume action

---

# Recently Added

Displays recently imported media.

Supports

- movies
- series
- episodes

---

# Recommended For You

Personal recommendations generated from

- watch history
- favorites
- genres
- collections

---

# Trending

Shows currently popular media.

---

# Collections

Displays curated groups such as

- Marvel
- Star Wars
- Pixar
- Studio Ghibli

or user-defined Jellyfin collections.

---

# Genres

Quick browsing by genre.

Examples

- Action
- Comedy
- Drama
- Science Fiction
- Documentary
- Horror

---

# Continue Browsing

Allows users to continue exploring the library without losing context.

---

# Interaction Model

Users can

- hover
- open details
- start playback
- resume playback
- add to watchlist
- favorite media
- open context menu

---

# Loading Behavior

The page loads progressively.

Priority

1. Continue Watching
2. Hero
3. Recommendations
4. Remaining rows

---

# Empty Home

If no media exists, the page displays

- welcome message
- library status
- import guidance

---

# Future Expansion

Future revisions will specify

- exact layout
- card sizes
- row behavior
- recommendation logic
- artwork ratios
- animations
- personalization algorithms
- scrolling behavior
- performance optimizations
