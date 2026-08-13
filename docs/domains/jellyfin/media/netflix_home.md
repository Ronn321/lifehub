# Home Page Specification

**Status:** Draft v1 → Implemented v1.2
**Implementation:** `/jellyfin/browse` (Netflix Home), `/jellyfin` (Hub)

---

# Overview

The Home page is the primary landing page after login.

Its purpose is content discovery.

**Implementation Note:** The Netflix-style Home is at `/jellyfin/browse`. The Hub at `/jellyfin` serves as a media-type overview (Filme & Serien, Musik, Bilder) with Continue Watching and Quick Links.

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

**✅ Implemented:** `HeroBanner.tsx` — Rotating backdrops from top 5 latest items, 8s auto-rotation, gradient overlays, Play + Details buttons, slide indicators.

Future versions define

- ~~transitions~~
- automatic rotation (✅ implemented, 8s interval)
- personalization (uses Latest instead of personalized recommendations)

---

# Continue Watching

Displays unfinished media.

Each card contains

- poster
- progress
- remaining time
- resume action

**✅ Implemented:** `ContentRow` on Browse + Hub. Backend: `GET /servers/:sid/continue-watching` with `IncludeItemTypes=Movie,Series,Episode` filter.

---

# Recently Added

Displays recently imported media.

Supports

- movies
- series
- episodes

**✅ Implemented:** `ContentRow "Zuletzt hinzugefügt"` on Browse. Backend: `GET /servers/:sid/latest` via Jellyfin `/Items/Latest`.

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

**✅ Implemented:** `GenreContentRow` — Lazy-loaded rows per genre (IntersectionObserver, top 6 genres). Backend: `GET /servers/:sid/genres/media` + `GET /servers/:sid/genre/:name`. Also: Genre filter chips on Movies/Series pages.

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
