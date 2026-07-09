# Library Specification

**Status:** Draft v1

---

# Overview

The Library page provides structured access to all media available through Jellyfin.

Unlike the Home page, which is personalized, the Library focuses on complete browsing and discovery.

---

# Goals

The Library should allow users to

- browse all available media
- organize content logically
- quickly locate specific titles
- filter large collections
- sort media efficiently
- discover forgotten content

---

# Library Sections

The Media Library consists of

- Movies
- Series
- Collections
- Genres
- Actors
- Studios
- Directors
- Years
- Recently Added
- Favorites
- Watchlist

---

# Media Cards

Every media item is represented by a card.

Cards provide

- artwork
- title
- release year
- media type
- watched state
- progress indicator
- quality badges

Future versions define exact card layouts.

---

# Grid Layout

Media is displayed in a responsive grid.

The grid automatically adapts to

- window size
- zoom level
- display scaling

---

# Sorting

Supported sorting methods include

- Title
- Date Added
- Release Date
- Recently Watched
- Rating
- Runtime
- Alphabetical
- Random

---

# Filtering

Users can filter by

- Genre
- Year
- Studio
- Director
- Actor
- Language
- Resolution
- HDR
- Dolby Vision
- Dolby Atmos
- Watched
- Unwatched
- Favorite

---

# Grouping

Media can be grouped by

- Genre
- Collection
- Franchise
- Year
- Studio
- Director
- Actor

---

# Multi-Selection

Future versions support selecting multiple media items simultaneously.

Possible actions include

- Add to Collection
- Add to Watchlist
- Mark as Watched
- Remove from Favorites

---

# Library Navigation

Users can move between sections without leaving the Library.

Navigation always preserves the current browsing context.

---

# Empty States

Dedicated layouts exist for

- empty library
- empty filter results
- unavailable server
- permission restrictions

---

# Future Expansion

Future revisions will define

- grid measurements
- artwork ratios
- metadata presentation
- animations
- virtualization
- lazy loading
- accessibility
- performance requirements
