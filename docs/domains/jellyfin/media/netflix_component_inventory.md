# Component Inventory

**Status:** Draft v1

---

# Overview

This document provides a complete inventory of reusable interface components within the Media Domain.

Each component should exist only once as a reusable implementation.

---

# Layout Components

- Application Shell → **✅ Dashboard Layout**
- Navigation Bar → **✅ Sidebar**
- Sidebar → **✅ Collapsible (desktopCollapsed state)**
- Header → **✅ Page-specific headers**
- Footer → N/A
- Content Area → **✅ `<main>` in Dashboard Layout**
- Scroll Container → **✅ overflow-y-auto on main**
- Overlay Layer → **✅ SearchOverlay**
- Modal Layer → ❌ Not implemented

---

# Navigation Components

- Navigation Item
- Breadcrumb
- Search Entry
- User Menu
- Profile Menu
- Back Button
- Forward Button

---

# Home Components

- Hero Banner → **✅ `HeroBanner.tsx`**
- Content Row → **✅ `ContentRow.tsx`**
- Continue Watching Row → **✅ ContentRow with Continue Watching data**
- Recommendation Row → **✅ "Zuletzt hinzugefügt" (Latest as proxy)**
- Trending Row → ❌ Not implemented
- Genre Row → **✅ `GenreContentRow.tsx` (lazy-loaded)**

---

# Media Components

- Movie Card → **✅ `MediaCard.tsx`**
- Series Card → **✅ `MediaCard.tsx` (Type badge: Serie)**
- Episode Card → **✅ `MediaCard.tsx` (S/E badge) + `EpisodeList.tsx`**
- Collection Card → **✅ `MediaCard.tsx` + Collections page**
- Actor Card → **✅ `CastSection.tsx`**
- Studio Card → ❌ Not implemented
- Genre Card → ❌ Not implemented (Genre chips instead)

---

# Detail Components

- Detail Header → **✅ `DetailHeader.tsx`**
- Metadata Panel → **✅ Inside DetailHeader + technical info section**
- Description Panel → **✅ Overview text on detail pages**
- Cast List → **✅ `CastSection.tsx`**
- Recommendation Grid → **✅ `SimilarSection.tsx`**
- Technical Information Panel → **✅ Toggle on Movie Detail**

---

# Player Components

- Video Surface → **✅ `<video>` element in `VideoPlayer.tsx`**
- Timeline → **✅ `PlayerControls.tsx`**
- Playback Controls → **✅ `PlayerControls.tsx`**
- Volume Control → **✅ `PlayerControls.tsx`**
- Subtitle Selector → **✅ `SubtitleSelector.tsx`**
- Audio Selector → **✅ `AudioTrackSelector.tsx`**
- Chapter Selector → ❌ Not implemented
- Fullscreen Button → **✅ `PlayerControls.tsx`**
- PiP Button → **✅ `PlayerControls.tsx`**

---

# Search Components

- Search Field → **✅ In SearchOverlay + Browse/Movies/Series pages**
- Search Suggestions → **✅ Empty state in SearchOverlay**
- Search Results → **✅ Categorized (Movies/Series/Episodes/Collections)**
- Filter Panel → ❌ Not in search
- Sort Selector → ❌ Not in search

---

# Collection Components

- Collection Header
- Collection Grid
- Collection Actions

---

# Dialog Components

- Confirmation Dialog
- Error Dialog
- Settings Dialog
- Information Dialog

---

# Feedback Components

- Toast Notification → ❌ Not implemented
- Progress Indicator → **✅ Loading spinners (Loader2)**
- Loading Spinner → **✅ `Loader2` from lucide-react**
- Skeleton Loader → **✅ In MediaGrid + ContentRow loading states**
- Status Badge → **✅ Watched/Film/Serie badges on MediaCard**

---

# Utility Components

- Button
- Icon Button
- Toggle
- Checkbox
- Radio Button
- Slider
- Dropdown
- Tooltip
- Context Menu
- Divider

---

# Empty States

- Empty Library
- Empty Search
- Empty Collection
- No Continue Watching
- Offline Server

---

# Error Components

- Network Error
- Playback Error
- Missing Media
- Permission Error

---

# Future Components

Future versions may introduce

- AI Recommendation Card
- Watch Party Components
- Live TV Components
- Download Manager
- Statistics Dashboard
- Media Comparison View
- Multi-Selection Toolbar
- Smart Collection Builder

---

# Future Expansion

Future revisions define for every component

- responsibilities
- properties
- states
- interactions
- accessibility
- styling
- responsive behavior
- animation
- implementation guidelines
