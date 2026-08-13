# Media Domain — Implementation Status

**Version:** v1.2 (Netflix Home Update)
**Last Updated:** 2026-07-23
**Status:** Phase 1 + 2 complete

---

# Implementation Overview

This document tracks what has been implemented from the 16 Netflix-style spec documents and what remains as "Future Expansion".

---

# Frontend Architecture

## Pages (Routes)

| Route | File | Purpose | Status |
|-------|------|---------|--------|
| `/jellyfin` | `jellyfin/page.tsx` | Hub: Media cards, Continue Watching, Search Overlay, Quick Links | ✅ Done |
| `/jellyfin/browse` | `jellyfin/browse/page.tsx` | Netflix Home: Hero Banner, Content Rows, Genre Rows, Grid View | ✅ Done |
| `/jellyfin/movies` | `jellyfin/movies/page.tsx` | Movie library with Genre Filter + Search | ✅ Done |
| `/jellyfin/movies/[id]` | `jellyfin/movies/[id]/page.tsx` | Movie Detail: Backdrop, Cast, Similar, Watch-State | ✅ Done |
| `/jellyfin/series` | `jellyfin/series/page.tsx` | Series library with Genre Filter + Search | ✅ Done |
| `/jellyfin/series/[id]` | `jellyfin/series/[id]/page.tsx` | Series Detail: Seasons, Episodes, Cast, Similar | ✅ Done |
| `/jellyfin/watch/[id]` | `jellyfin/watch/[id]/page.tsx` | Player: VideoPlayer, Episode Navigation, Prev/Next | ✅ Done |
| `/jellyfin/search` | `jellyfin/search/page.tsx` | Full-page Search with Categories | ✅ Done |
| `/jellyfin/collections` | `jellyfin/collections/page.tsx` | Collections Overview | ✅ Done |
| `/jellyfin/collections/[id]` | `jellyfin/collections/[id]/page.tsx` | Collection Detail with Items | ✅ Done |
| `/jellyfin/favorites` | `jellyfin/favorites/page.tsx` | Favorite Movies & Series Grid | ✅ Done |
| `/jellyfin/photos` | `jellyfin/photos/page.tsx` | Photos Library | ✅ Done (legacy) |
| `/jellyfin/music/*` | 12 pages | Spotify-style Music Player (v0.2) | ✅ Done (separate) |

## Components (`components/jellyfin/media/`)

| Component | File | Purpose |
|-----------|------|---------|
| `MediaCard` | `MediaCard.tsx` | Netflix-style poster card with hover preview, badges, progress |
| `MediaGrid` | `MediaCard.tsx` (exported) | Responsive grid for MediaCards |
| `ContentRow` | `ContentRow.tsx` | Horizontal scrolling row with arrows + snap |
| `HeroBanner` | `HeroBanner.tsx` | Cinematic hero with rotating backdrops, Play/Details |
| `GenreContentRow` | `GenreContentRow.tsx` | Lazy-loaded ContentRow per genre (IntersectionObserver) |
| `DetailHeader` | `DetailHeader.tsx` | Movie/Series detail header with backdrop, poster, actions |
| `CastSection` | `CastSection.tsx` | Cast & Crew display with actor cards |
| `SimilarSection` | `SimilarSection.tsx` | "Similar Content" grid via Jellyfin API |
| `EpisodeList` | `EpisodeList.tsx` | Episode cards with thumbnails, progress, watched state |
| `SeasonPicker` | `SeasonPicker.tsx` | Season dropdown selector |
| `SearchOverlay` | `SearchOverlay.tsx` | Global search overlay (Ctrl+K / `/` shortcut) |
| `JellyfinPageWrapper` | `JellyfinPageWrapper.tsx` | Full-width toggle wrapper with Zustand persist |

## Legacy Components (`components/jellyfin/`)

| Component | File | Purpose |
|-----------|------|---------|
| `VideoPlayer` | `VideoPlayer.tsx` | HLS Video Player with subtitles, audio tracks, gestures |
| `PlayerControls` | `PlayerControls.tsx` | Play/Pause, Timeline, Volume, Fullscreen, PiP |
| `SubtitleSelector` | `SubtitleSelector.tsx` | Subtitle language picker |
| `AudioTrackSelector` | `AudioTrackSelector.tsx` | Audio track picker |
| `GestureHandler` | `GestureHandler.tsx` | Touch gestures for mobile playback |

## Lib

| Module | File | Purpose |
|--------|------|---------|
| API Client | `jellyfin-media-api.ts` | All Jellyfin API functions, types, URL helpers |
| Layout Store | `jellyfin-layout-store.ts` | Zustand store for full-width mode (persisted) |

---

# Backend Architecture

## Service Methods (`domains/jellyfin/src/services/jellyfin.service.ts`)

### Server Management
| Method | API Endpoint | Status |
|--------|-------------|--------|
| `getDefaultServer` | `GET /default` | ✅ |
| `listServers` | `GET /servers` | ✅ |
| `connectServer` | `POST /servers` | ✅ |
| `deleteServer` | `DELETE /servers/:id` | ✅ |
| `syncServer` | `POST /servers/:id/sync` | ✅ |

### Items & Libraries
| Method | API Endpoint | Status |
|--------|-------------|--------|
| `listLibraries` | `GET /libraries` | ✅ |
| `listItems` | `GET /items` (+ `?refresh=true`) | ✅ |
| `toggleWatched` | `POST /items/:id/toggle-watched` | ✅ |
| `getChildren` | `GET /items/:id/children` | ✅ |
| `getExternalChildren` | `GET /servers/:sid/items/:eid/children` | ✅ |

### Netflix Home (v1.2)
| Method | API Endpoint | Status |
|--------|-------------|--------|
| `getItemDetail` | `GET /servers/:sid/items/:eid/detail` | ✅ |
| `getContinueWatching` | `GET /servers/:sid/continue-watching` | ✅ |
| `getSimilarItems` | `GET /servers/:sid/items/:eid/similar` | ✅ |
| `getItemPeople` | `GET /servers/:sid/items/:eid/people` | ✅ |
| `searchMedia` | `GET /servers/:sid/search-media` | ✅ |
| `toggleFavorite` | `POST /servers/:sid/items/:eid/favorite` | ✅ |
| `getLatestMedia` | `GET /servers/:sid/latest` | ✅ |
| `getMediaGenres` | `GET /servers/:sid/genres/media` | ✅ |
| `getMediaByGenre` | `GET /servers/:sid/genre/:name` | ✅ |
| `getFavoriteMedia` | `GET /servers/:sid/favorites/media` | ✅ |

### Streaming & Images
| Method | API Endpoint | Status |
|--------|-------------|--------|
| `getExternalItemStream` | `GET /servers/:sid/items/:eid/stream` | ✅ HLS proxy |
| `getItemStream` | `GET /items/:id/stream` | ✅ Direct stream |
| `getHlsPlaylist` | (internal) | ✅ HLS with segment rewriting |
| `proxyImage` | `GET /servers/:sid/items/:eid/image` | ✅ `?type=Primary\|Backdrop` |
| `proxyHlsSegment` | `GET /servers/:sid/items/:eid/hls/*` | ✅ |
| `getMediaInfo` | `GET /servers/:sid/items/:eid/media-info` | ✅ |
| `getSubtitle` | `GET /servers/:sid/items/:eid/subtitles/:idx` | ✅ FFmpeg → WebVTT |

### Playback Reporting
| Method | API Endpoint | Status |
|--------|-------------|--------|
| `reportPlaybackStart` | `POST /servers/:sid/sessions/playing` | ✅ |
| `reportPlaybackProgress` | `POST /servers/:sid/sessions/progress` | ✅ |
| `reportPlaybackStop` | `POST /servers/:sid/sessions/stopped` | ✅ |

### Music (v0.2 — separate from Media UI)
13 methods for Artists, Albums, Songs, Genres, Playlists, Lyrics.

---

# Spec Coverage Matrix

| Spec Document | Sections Implemented | Gaps |
|---------------|---------------------|------|
| `netflix_desktop_overview.md` | Purpose, Design Goals, Core Principles, Domain Structure (all 10 pages), Jellyfin Integration, Visual Style, Navigation Model, Personalization, Performance | Settings page, Watchlist |
| `netflix_layout_specification.md` | Primary Regions, Navigation, Content Flow, Hero Area, Content Rows, Detail Pages, Overlay System, Fullscreen Player, Empty/Loading/Error States, Window Resizing | Exact measurements, z-index hierarchy |
| `netflix_navigation.md` | Primary Navigation, Secondary Navigation, History (back), Search Access, Keyboard Nav, Quick Actions, User Menu | Forward navigation, Breadcrumbs, Controller |
| `netflix_home.md` | Hero Section (rotating), Continue Watching, Recently Added, Genres (lazy rows), Continue Browsing, Loading Priority, Empty Home | Recommended For You (personalized), Trending, Collections row on home |
| `netflix_library.md` | Grid Layout, Sorting (alphabetical via API), Filtering (Genre), Media Cards, Empty States | Sorting (Date/Rating/Runtime), Filter (Year/Studio/Director/Actor), Multi-Selection |
| `netflix_movie_page.md` | Header (Backdrop+Poster), Primary Actions, Metadata, Description, Cast, Technical Info, Related Content, Playback Integration | Context Menu (Refresh Metadata, Download, Share), Trailer |
| `netflix_series_page.md` | Header, Season Navigation, Episode List, Resume Logic, Recommendations, Metadata | Season switching animations |
| `netflix_episode_view.md` | Header, Playback Actions, Description, Navigation (Prev/Next), Progress, Error States | Autoplay behavior |
| `netflix_player.md` | Play/Pause, Timeline, Volume, Subtitles, Audio Tracks, Playback Speed, Fullscreen, PiP, Episode Playback, Playback Resume, Error Handling | Intro/Credits Skip, Mini Player, Chromecast/AirPlay |
| `netflix_search.md` | Live Search, Search Categories, Search Suggestions (empty state), Keyboard Navigation, Empty Results | Search History, Filters in search, Sorting |
| `netflix_collections.md` | Collection Types (Jellyfin BoxSet), Collection Page, Collection Members, Open action | Play All, Shuffle, Edit, Delete, User Collections, Smart Collections |
| `netflix_continue_watching.md` | Resume Info, Resume Action, Synchronization, Automatic Updates, Ordering, Empty State, Integration | Remove item, Mark as finished, Cross-device resume |
| `netflix_interactions.md` | Hover, Focus, Loading Feedback, Notifications (toast), Keyboard Navigation | Context Menus, Drag & Drop, Multi-Selection, Confirmation Dialogs |
| `netflix_visual_language.md` | Dark surfaces, Large artwork, Gradients, Shadows, Rounded Corners, Blur, Animations, Cards, Icons | Design Tokens (formal), Typography scale, Color palette |
| `netflix_responsive_behavior.md` | Adaptive Layout, Grid Adaptation, Content Rows, Full-Width Toggle | Exact breakpoints, Typography scaling |
| `netflix_component_inventory.md` | 17 of 60+ components implemented | Watch Party, Live TV, Download Manager, Statistics |

---

# Known Implementation Gaps (Phase 2+)

## High Priority
1. **Watchlist** — No watchlist page or backend. Jellyfin supports "Watchlist" via user data.
2. **Sort Options** — Library pages only sort alphabetically. Need Date/Rating/Runtime/Year.
3. **Remove from Continue Watching** — No "X" button on Continue Watching cards.
4. **Settings Page** — `/jellyfin/settings` not implemented (playback prefs, subtitle defaults).

## Medium Priority
5. **Trailer** — Movie detail page has no trailer button (YouTube embed).
6. **Recommended For You** — Currently uses "Latest" as proxy. True personalization needs watch-history analysis.
7. **Context Menu** — Right-click on cards for quick actions (Play, Favorite, Add to Collection).
8. **Trending** — No trending row. Jellyfin doesn't expose this natively.

## Low Priority (Future Expansion per docs)
9. Controller Support (Gamepad API)
10. Intro/Recap Skip detection
11. Offline mode / Download Manager
12. Voice Search
13. Watch Party (synchronized playback)
14. Live TV integration
15. Multi-Selection + bulk actions
16. Smart Collections (auto-categorized)
17. Drag & Drop for collections
18. Accessibility audit (ARIA, screen reader, reduced motion)
19. Performance: Virtual scrolling for large grids
20. Design Tokens: Formal Tailwind token system

---

# Architecture Decisions

## Full-Width Mode
- Implemented via Zustand store (`jellyfin-layout-store.ts`) with `persist` middleware
- `JellyfinPageWrapper` reads store and applies `-mx-6 lg:-mx-8` to negate `<main>` padding
- Toggle button is `fixed top-4 right-4 z-30` — always visible on Jellyfin pages
- Works on both Browse and Hub pages
- Adapts automatically when sidebar collapses/expands (sidebar has its own state)

## Hero Banner Auto-Rotation
- Rotates through top 5 "Latest" items every 8 seconds
- Manual navigation via dot indicators
- Fallback: uses first movies if Latest API fails
- Backdrop image via `getBackdropUrl()` with `&type=Backdrop&token=`

## Genre Content Rows (Lazy Loading)
- `GenreContentRow` uses `IntersectionObserver` with `rootMargin: '200px'`
- Fetches via `fetchMediaByGenre()` only when row scrolls into view
- `staleTime: 300_000` (5 min cache)
- Empty rows are hidden (return `null`)
- Top 6 genres shown on Browse page

## Image Proxy Authentication
- All image URLs include `&token=` query parameter (JWT access token)
- Token extracted from Zustand auth store via `localStorage`
- Without token → 401 → images don't load
- Backdrop type: `&type=Backdrop` in addition to token

## Continue Watching Filter
- Backend filters with `&IncludeItemTypes=Movie,Series,Episode` (excludes music)
- Without this filter, Jellyfin returns all resume items including audio tracks

## Browse Page Dual Mode
- **Home View** (default): Hero + Content Rows + Genre Rows — pure Netflix experience
- **Grid View** (toggle via "Alle Titel ansehen"): Full MediaGrid with Tabs + Filters
- Both views wrapped in `JellyfinPageWrapper` for full-width support
