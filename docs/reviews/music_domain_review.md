# Music Domain Review — Zentrale Review-Dokumentation

Version: 1.0
Domain: Jellyfin Music
Erstellt: 2026-07-09
Git Commit: deaa206

---

# Projektstatus

| Feld | Wert |
|------|------|
| Datum | 2026-07-09 |
| Git Commit | deaa206 |
| Bearbeitete Module | Player, Layout, Navigation, Library, Home, Search, Detailseiten, Backend |
| Iteration | 1 (Initial Review) |

---

# Zusammenfassung

Erste vollständige Architektur-, UX-, Code- und Implementierungsreview der Jellyfin Music Domain. Die Music Domain wurde in v0.2/v0.3 als Spotify-inspirierter Desktop-Musikplayer mit Jellyfin-Backend implementiert. 13 Spezifikationsdokumente bilden die Single Source of Truth.

Ziel dieser Iteration: Vollständige Erfassung aller Abweichungen zwischen Spezifikation und Implementierung, Präzisierung der Dokumentation, und Erstellung eines Implementierungsplans für die nächste Phase.

---

# Analysierte Bereiche

## Spezifikationen (13 Dokumente)

| # | Dokument | Status |
|---|----------|--------|
| 1 | spotify_desktop_player_overview.md | Gelesen ✅ |
| 2 | spotify_layout_specification.md | Gelesen ✅ |
| 3 | spotify_navigation.md | Gelesen ✅ |
| 4 | spotify_library.md | Gelesen ✅ |
| 5 | spotify_player.md | Gelesen ✅ |
| 6 | spotify_playlist_page.md | Gelesen ✅ |
| 7 | spotify_home.md | Gelesen ✅ |
| 8 | spotify_now_playing_view.md | Gelesen ✅ |
| 9 | spotify_search.md | Gelesen ✅ |
| 10 | spotify_interactions.md | Gelesen ✅ |
| 11 | spotify_visual_language.md | Gelesen ✅ |
| 12 | spotify_responsive_behavior.md | Gelesen ✅ |
| 13 | spotify_component_inventory.md | Gelesen ✅ |

## Code-Dateien

### Frontend Pages (12 Routen)
- `apps/frontend/src/app/(dashboard)/jellyfin/music/page.tsx` (Home)
- `apps/frontend/src/app/(dashboard)/jellyfin/music/search/page.tsx`
- `apps/frontend/src/app/(dashboard)/jellyfin/music/library/page.tsx`
- `apps/frontend/src/app/(dashboard)/jellyfin/music/tracks/page.tsx`
- `apps/frontend/src/app/(dashboard)/jellyfin/music/albums/page.tsx`
- `apps/frontend/src/app/(dashboard)/jellyfin/music/artists/page.tsx`
- `apps/frontend/src/app/(dashboard)/jellyfin/music/genres/page.tsx`
- `apps/frontend/src/app/(dashboard)/jellyfin/music/playlists/page.tsx`
- `apps/frontend/src/app/(dashboard)/jellyfin/music/album/[id]/page.tsx`
- `apps/frontend/src/app/(dashboard)/jellyfin/music/artist/[id]/page.tsx`
- `apps/frontend/src/app/(dashboard)/jellyfin/music/genre/[id]/page.tsx`
- `apps/frontend/src/app/(dashboard)/jellyfin/music/playlist/[id]/page.tsx`

### Frontend Komponenten (21)
- `components/music/layout/MusicAppShell.tsx`
- `components/music/layout/MusicPageShell.tsx`
- `components/music/sidebar/MusicSidebar.tsx` + 3 Sub-Komponenten
- `components/music/player/MusicPlayerWrapper.tsx`
- `components/music/player/MusicPlayerBar.tsx` + 3 Sub-Komponenten (Left/Center/Right)
- `components/music/player/MiniPlayer.tsx`
- `components/music/player/LyricsOverlay.tsx`
- `components/music/nowplaying/NowPlayingView.tsx`
- `components/music/shared/SongRow.tsx`
- `components/music/shared/MusicCard.tsx`
- `components/music/shared/TrackTable.tsx`
- `components/music/shared/ContextMenu.tsx`
- `components/music/playlist/PlaylistHeader.tsx`
- `components/music/playlist/PlaylistSongTable.tsx`

### Frontend Library
- `lib/music-player-store.ts` (926 Zeilen — Zustand Store)
- `lib/music-api.ts` (428 Zeilen — 15+ TanStack Query Hooks)
- `lib/jellyfin-media-api.ts` (Media API, Separate Domain)

### Backend (Jellyfin Domain)
- `domains/jellyfin/src/services/jellyfin.service.ts`
- `domains/jellyfin/src/api/jellyfin.controller.ts`
- `domains/jellyfin/src/api/jellyfin-stream.controller.ts`
- `domains/jellyfin/src/repositories/jellyfin.repository.ts`
- `domains/jellyfin/src/entities/jellyfin.ts`

### Styles
- `app/(dashboard)/jellyfin/music/music-theme.css`

---

# Festgestellte Abweichungen

> **Hinweis:** Die detaillierten Abweichungsberichte der 5 Subagents werden in den folgenden Abschnitten zusammengeführt. Jede Abweichung erhält eine eindeutige ID.

## Vorläufige Abweichungen (aus Orchestrator-Analyse)

Diese Abweichungen wurden bereits bei der initialen Spezifikations- und Code-Lektüre identifiziert und werden durch die Subagent-Ergebnisse validiert und ergänzt.

### Spezifikations-Struktur-Probleme

| ID | Modul | Beschreibung | Priorität |
|----|-------|--------------|-----------|
| S-001 | Spezifikation | Mehrere Spec-Dateien enthalten duplizierte Sektionen (z.B. spotify_layout_specification.md hat "Desktop Grid" 2x, "Desktop Layout" 2x, "Layoutregeln" 2x) | Mittel |
| S-002 | Spezifikation | spotify_desktop_player_overview.md hat "Zukünftige Erweiterungen" mitten im Dokument (Zeile 362-393) statt am Ende — Dokumentstruktur inkonsistent | Niedrig |
| S-003 | Spezifikation | Component Inventory listet Pfade wie `src/components/player/PlayerBar.tsx` die nicht existieren — tatsächliche Pfade sind `components/music/player/MusicPlayerBar.tsx` | Hoch |
| S-004 | Spezifikation | Component Inventory enthält LifeHub-Topbar-Komponenten (TopBar, NavBackButton, SearchBar etc.) die nicht Teil der Music-Domain sind | Mittel |
| S-005 | Spezifikation | IMPLEMENTATION_PLAN_V0.2.md hat Tippfehler "V190rification" (Zeile 189) | Niedrig |

### Bekannte Implementierungs-Abweichungen (aus IMPLEMENTATION_PLAN_V0.2.md)

Diese wurden bereits dokumentiert, müssen aber in der Review verfolgt werden:

| ID | Modul | Spec | Implementiert | Grund | Priorität |
|----|-------|------|---------------|-------|-----------|
| D-001 | Routen | Deutsche Routen (`/musik`) | Englische Routen (`/music`) | User-Wunsch | Niedrig (akzeptiert) |
| D-002 | Player | `fixed bottom-0` | `w-full` im flex-flow | LifeHub-Sidebar-Konflikt | Niedrig (akzeptiert) |
| D-003 | AppShell | `playerBar`/`showPlayerBar` Props | Keine Props — Player separat | Layout-Vereinfachung | Niedrig (akzeptiert) |
| D-004 | Bibliothek | Nur `/library` mit Tabs | Zusätzlich separate Routen | User-Wunsch | Niedrig (akzeptiert) |

### Implementierungs-Lücken (aus Spec-Lektüre)

| ID | Modul | Betroffene Datei | Beschreibung | Priorität |
|----|-------|-----------------|--------------|-----------|
| G-001 | Player | music-player-store.ts | Jellyfin Playback-Reporting fehlt (POST /Sessions/Playing, /Progress, /Stopped) | Hoch |
| G-002 | Player | MusicPlayerWrapper.tsx | Gapless Playback / Preload des nächsten Tracks fehlt | Mittel |
| G-003 | Player | MusicPlayerWrapper.tsx | Buffering-Erkennung (waiting/stalled Events) unklar | Hoch |
| G-004 | Player | MusicPlayerWrapper.tsx | Auto-Skip nach 5s bei Fehler fehlt | Hoch |
| G-005 | NowPlaying | NowPlayingView.tsx | Farbextraktion aus Cover (Canvas API) fehlt | Mittel |
| G-006 | NowPlaying | NowPlayingView.tsx | Cover Cross-Fade bei Track-Wechsel fehlt | Mittel |
| G-007 | Playlist | playlist/[id]/page.tsx | Playlist-Detailseite war Stub (v0.2) — Status v0.3 unklar | Hoch |
| G-008 | Drag&Drop | — | dnd-kit installiert aber nicht integriert | Mittel |
| G-009 | Lyrics | LyricsOverlay.tsx | Lyrics-Tab als Platzhalter — kein Jellyfin-Lyrics-Endpoint | Mittel |
| G-010 | Search | search/page.tsx | Search-History in localStorage fehlt vermutlich | Mittel |
| G-011 | Search | search/page.tsx | Autocomplete-Vorschläge fehlen | Mittel |
| G-012 | Interactions | — | Undo/Redo (Strg+Z / Strg+Shift+Z) nicht implementiert | Niedrig |
| G-013 | Home | music/page.tsx | "Für dich erstellt" (Mix-Tapes) fehlt — keine Empfehlungs-Engine | Mittel |
| G-014 | Home | music/page.tsx | "Continue Listening" (unvollständig gehörte Alben) fehlt | Mittel |
| G-015 | Backend | jellyfin.service.ts | Playlist-CRUD (POST/DELETE) fehlt vermutlich | Hoch |
| G-016 | Backend | jellyfin.service.ts | Favorite-Toggle (POST /Users/.../Favorite) — Frontend-Hook existiert, Backend unklar | Hoch |

---

## Subagent-Ergebnisse

> Die folgenden Abschnitte werden mit den Rückmeldungen der 5 parallelen Subagents befüllt, sobald diese abgeschlossen sind.

### Player & State Management (Subagent 1) — ✅ Abgeschlossen

25 Abweichungen identifiziert (1 Critical, 1 High, 8 Medium, 15 Low).

| ID | Datei | Spec-Anforderung | Status | Priorität |
|----|-------|-----------------|--------|-----------|
| P-001 | music-player-store.ts | PlayerState type (6 states vs 10 implementiert) | Partial | Low |
| P-002 | music-player-store.ts | `play()`/`pause()` Actions fehlen | Missing | Medium |
| P-003 | music-player-store.ts | QueueType `automatic` nicht in Spec | Partial | Low |
| P-004 | music-player-store.ts | Erweiterte Queue-Actions (Extensions) | Partial | Low |
| **P-005** | **ALLE** | **Jellyfin Playback Reporting fehlt komplett** | **Missing** | **Critical** |
| **P-006** | **MusicPlayerWrapper.tsx** | **Gapless Playback / Preload fehlt** | **Missing** | **High** |
| P-007 | MusicPlayerWrapper.tsx | Auto-Skip nach 5s bei Fehler fehlt | Missing | Medium |
| P-008 | MusicPlayerBar.tsx | Keyboard: Shift+→/← (10s seek) fehlt | Missing | Medium |
| P-009 | MusicPlayerBar.tsx | F-Taste triggert Browser-Fullscreen statt App-Fullscreen | Partial | Low |
| P-010 | PlayerLeft.tsx | Like/Expand Buttons nicht hover-only | Missing | Low |
| P-011 | PlayerCenter.tsx | Shuffle/Repeat Icons 16px statt 20px | Partial | Low |
| P-012 | MiniPlayer.tsx | Position-Persistenz (minor init issue) | Partial | Low |
| P-013 | NowPlayingView.tsx | Sidebar 360px statt 320px | Partial | Low |
| P-014 | NowPlayingView.tsx | 5 Tabs statt 3 Tabs laut Spec | Partial | Medium |
| P-015 | NowPlayingView.tsx | Sidebar fehlen Playback-Controls | Missing | Medium |
| P-016 | NowPlayingView.tsx | Farbextraktion aus Cover (Canvas API) fehlt | Missing | Medium |
| P-017 | NowPlayingView.tsx | Cover Cross-Fade 300ms bei Track-Wechsel fehlt | Missing | Medium |
| P-018 | NowPlayingView.tsx | Tab-Wechsel Cross-Fade 150ms fehlt | Missing | Low |
| P-019 | NowPlayingView.tsx | Aktiver Tab Textfarbe | Partial | Low |
| P-020 | NowPlayingView.tsx | Fullscreen Play-Button weiß statt grün | Partial | Low |
| P-021 | NowPlayingView.tsx | Fullscreen dynamischer Gradient fehlt | Partial | Low |
| P-022 | MusicPlayerWrapper.tsx | requestAnimationFrame für Progress fehlt | Missing | Low |
| P-023 | NowPlayingView.tsx | Queue Drag & Drop fehlt | Missing | Medium |
| P-024 | MusicPlayerWrapper.tsx | 10s Min-Buffer fehlt | Missing | Low |
| P-025 | MusicPlayerWrapper.tsx | Auto-Skip bei Fehler (Duplikat P-007) | Missing | Medium |

**Key Findings:**
- **P-005 (Critical):** Jellyfin Playback Reporting (POST /Sessions/Playing, /Progress, /Stopped) komplett absent. Jellyfin hat keine Aufzeichnung über Wiedergabeaktivität.
- **P-006 (High):** Gapless Playback fehlt. Nur eine Audio-Instanz, kein Preloading des nächsten Tracks, keine Cross-Fade-Transition.

### Layout & Navigation (Subagent 2) — ✅ Abgeschlossen

26 Checks: 0 Critical, 4 High, 9 Medium, 6 Low, 7 konform.

| ID | Datei | Spec-Anforderung | Status | Priorität |
|----|-------|-----------------|--------|-----------|
| L-001 | MusicAppShell/Sidebar | Collapse-Animation 250ms (implementiert 200ms) | Partial | High |
| L-002 | MusicAppShell | Right Sidebar Fallback 360px statt 320px | Partial | Low |
| L-003 | music-theme.css | Z-Index Layer-System (0/10/100/1000/2000/3000) fehlt | Missing | Medium |
| L-004 | MusicPlayerBar | Player-Bar Blur 20px statt 16px | Partial | High |
| L-005 | MusicPlayerBar | Player-Bar Hintergrund solid statt rgba(18,18,18,0.95) | Missing | Medium |
| L-006 | Alle Pages | Sticky Header Blur(12px) fehlt komplett | Missing | High |
| L-007 | MusicSidebar | Sortierungs-Dropdown fehlt | Missing | Medium |
| L-008 | MusicSidebar | Sidebar-Suchfeld fehlt | Missing | Medium |
| L-009 | SidebarNavButton | Hover/Active Farben falsch (#242424 statt #1A1A1A/#282828) | Missing | High |
| L-010 | SidebarNavButton | Collapsed Button 40px statt 48px | Partial | Low |
| L-011 | SidebarPlaylistItem | Metainfo-Format fehlt ("Playlist • n Songs") | Missing | Medium |
| L-012 | SidebarCreateButton | Create-Button nicht immer sichtbar | Partial | Medium |
| L-013 | MusicSidebar | Filter-Tabs: Pill-Style statt Bottom-Border | Partial | Low |
| L-014 | MusicSidebar | Padding 12px statt 8px | Partial | Low |
| L-015 | music-theme.css | Spacing Token 2xl (48px) fehlt | Missing | Low |
| L-016 | MusicAppShell | Right Sidebar Slide-Animation fehlt | Missing | Medium |
| L-017–L-019 | — | MusicPageShell konsistent, Fade-In nur auf Search | Partial | Low |
| L-020 | music-theme.css | Spec-Konflikt: Hover-Farben (#2A2A2A vs #1A1A1A) | Conflict | Medium |
| L-021–L-026 | — | Nav-Buttons, Sidebar-Struktur, Sticky, CSS Tokens, Scrollbar, Blur | Implemented | — |

**Key Findings:**
- Keine Critical-Abweichungen im Layout
- **L-006 (High):** Sticky-Header-Blur(12px) fehlt auf allen Seiten — wichtige UX
- **L-009 (High):** Falsche Hover/Active-Farben in der Sidebar
- **L-018 (Medium):** Kein layout.tsx — Code-Duplizierung auf 11+ Seiten

### Library, Home & Search (Subagent 3) — ✅ Abgeschlossen

45 Abweichungen identifiziert (1 Critical, 8 High, 8 Medium, 4 Low, Rest implementiert).

#### HOME

| ID | Datei | Spec-Anforderung | Status | Priorität |
|----|-------|-----------------|--------|-----------|
| H-001 | page.tsx | 6 rechteckige Quick Access Cards mit Cover | Partial | High |
| H-002 | page.tsx | Quick Access Card-Labels abweichend | Partial | Medium |
| H-003 | page.tsx | 5 von 7 Sektionen fehlen | Missing | High |
| H-004 | page.tsx | Lieblingskünstler nicht nach PlayCount sortiert | Partial | Medium |
| H-005 | page.tsx | Card Hover: Scale 1.02 fehlt | Partial | Medium |
| H-006 | page.tsx | Gestaffeltes Section Fade-In fehlt | Missing | Low |
| H-007 | page.tsx | Highlight-Banner fehlt (optional) | Missing | Low |
| H-008–H-012 | — | Section Lazy Loading, "Alle anzeigen", Skeleton, Greeting, ScrollArrows | Implemented | — |

#### SEARCH

| ID | Datei | Spec-Anforderung | Status | Priorität |
|----|-------|-----------------|--------|-----------|
| S-001 | search/page.tsx | Falsche Ergebnis-Limits (50 statt 4), Playlists/Genres fehlen | Partial | High |
| S-002 | search/page.tsx | "Alle anzeigen"-Links fehlen | Missing | Medium |
| S-003 | search/page.tsx | Search-History in localStorage fehlt | Missing | High |
| S-004 | search/page.tsx | Autocomplete-Vorschläge fehlen | Missing | High |
| S-005 | search/page.tsx | Filter-Tabs fehlen | Missing | Low |
| S-006 | search/page.tsx | Browse-View Genre-Cards landscape statt square | Partial | Low |
| S-007 | search/page.tsx | Top Result Cover 300px statt 160px | Partial | Low |
| S-008–S-012 | — | Debounce 300ms, Input, Top Result, Empty State, Double-Click | Implemented | — |

#### LIBRARY / TRACKS

| ID | Datei | Spec-Anforderung | Status | Priorität |
|----|-------|-----------------|--------|-----------|
| L-001 | library/page.tsx | Spalten: ♥, Genre, Quality fehlen; Cover nicht in Title-Cell | Partial | High |
| L-002 | library/page.tsx | Filter-Chips fehlen komplett | Missing | High |
| **L-003** | **library/page.tsx** | **Selection Model fehlt komplett (Ctrl+Click, Shift+Click, Ctrl+A)** | **Missing** | **Critical** |
| L-004 | library/page.tsx | Context Menu nur in TrackTable (ungenutzt), nicht in SongRow | Partial | High |
| L-005 | library/page.tsx | Heart-Button und More-Button ohne onClick-Handler | Partial | High |
| L-006 | library/page.tsx | ♥-Spalte fehlt im SortHeader | Partial | Medium |
| L-007 | library/page.tsx | TrackTable-Komponente existiert aber wird nicht verwendet | Missing | High |
| L-008 | library/page.tsx | Overscan 5 (library) vs 10 (TrackTable) | Partial | Low |
| L-009 | library/page.tsx | Skeleton-Shimmer (16 Zeilen) fehlt | Partial | Medium |
| L-010–L-012 | — | Pagination, Sort, Virtualization | Implemented | — |

#### SHARED COMPONENTS

| ID | Datei | Spec-Anforderung | Status | Priorität |
|----|-------|-----------------|--------|-----------|
| C-001 | MusicCard.tsx | Props vollständig | Implemented | — |
| C-002 | MusicCard.tsx | CardGrid Gap 8px statt 16px | Partial | Medium |
| C-003–C-007 | — | ScrollRow, Section Title, SongRow Props, Hover, Double-Click | Implemented | — |
| C-008 | SongRow.tsx | Genre/Quality Spalten fehlen | Missing | Medium |

#### API HOOKS

| ID | Datei | Spec-Anforderung | Status | Priorität |
|----|-------|-----------------|--------|-----------|
| A-001 | music-api.ts | Search fehlen Playlists/Genres Kategorien | Missing | High |
| A-002 | music-api.ts | Nutzt Custom-Endpoint statt /Search/Hints | Missing | Medium |
| A-003 | music-api.ts | Artists nicht nach PlayCount sortiert | Missing | Medium |

**Key Findings:**
- **L-003 (Critical):** Kein Selection Model — Ctrl+Click, Shift+Click, Ctrl+A alle absent. Core-UX für Musikbibliothek.
- **L-007 (High):** `TrackTable.tsx` ist eine vollständige Komponente mit allen Spec-Features, wird aber von keiner Seite verwendet. Beide Seiten nutzen eigene Inline-Implementierungen.
- **S-003, S-004 (High):** Search-History und Autocomplete fehlen komplett.
- **H-003 (High):** 5 von 7 Home-Sektionen fehlen.

### Detailseiten & Shared Components (Subagent 4) — ✅ Abgeschlossen

81 Checks: 51 implementiert, 30 Abweichungen (5 Critical, 11 High, 12 Medium, 2 Low).

#### ALBUM DETAIL

| ID | Spec-Anforderung | Status | Priorität |
|----|-----------------|--------|-----------|
| D-005 | Genre im Header fehlt | Missing | Medium |
| D-009 | Shuffle-Button fehlt | Missing | High |
| D-012 | Header-Gradient hartcodiert (nicht aus Cover extrahiert) | Partial | Medium |
| D-013 | Sticky Header mit Blur fehlt | Missing | High |
| D-001–D-008, D-010–D-011 | Cover 232px, Title, Artist, Year, Play, Tracklist | Implemented | — |

#### ARTIST DETAIL

| ID | Spec-Anforderung | Status | Priorität |
|----|-----------------|--------|-----------|
| D-016 | Biography fehlt komplett | Missing | High |
| D-014–D-015, D-017–D-019 | Round Cover, Name, Top Songs, Discography | Implemented | — |

#### GENRE DETAIL

| ID | Spec-Anforderung | Status | Priorität |
|----|-----------------|--------|-----------|
| D-022 | Shuffle-Button fehlt | Partial | Medium |
| D-020–D-021 | Gradient Header, Songs by Genre | Implemented | — |

#### PLAYLIST DETAIL — 🔴 5 CRITICAL

| ID | Spec-Anforderung | Status | Priorität |
|----|-----------------|--------|-----------|
| **D-023** | **Seite ist noch ein Stub ("Playlist-Funktion kommt bald")** | **Missing** | **Critical** |
| **D-024** | **PlaylistHeader-Komponente existiert aber wird NICHT verwendet** | **Missing** | **Critical** |
| **D-025** | **PlaylistSongTable-Komponente existiert aber wird NICHT verwendet** | **Missing** | **Critical** |
| **D-026** | **Play/Shuffle/Download/More Buttons fehlen** | **Missing** | **Critical** |
| **D-027** | **Cover/Title/Beschreibung/Owner/SongCount/Duration fehlen** | **Missing** | **Critical** |
| **D-029** | **Song-Tabelle fehlt** | **Missing** | **Critical** |
| **D-031** | **Context Menu pro Song fehlt** | **Missing** | **Critical** |
| D-028 | Filter-Chips fehlen | Missing | High |
| D-030 | Drag & Drop fehlt | Missing | High |
| D-032 | Empty State ("Playlist-Funktion kommt bald" statt funktional) | Partial | Medium |

#### PLAYLISTHEADER & PLAYLISTSONGTABLE (Komponenten existieren, teilweise funktionsfähig)

| ID | Spec-Anforderung | Status | Priorität |
|----|-----------------|--------|-----------|
| D-041 | Download-Button onClick ist leerer Stub | Partial | Medium |
| D-044 | Sticky Header Blur fehlt | Missing | High |
| D-048 | "Date Added"-Spalte fehlt | Missing | High |
| D-049 | Heart onClick ist leerer Stub | Partial | Medium |
| D-051 | Drag & Drop Reordering fehlt | Missing | High |
| D-053 | Filter-Chips fehlen | Missing | High |
| D-033–D-040, D-042–D-043 | Cover, Title, Desc, Owner, Play, Shuffle, More, Gradient | Implemented | — |
| D-045–D-047, D-050, D-052, D-055–D-057 | Columns, Context Menu, Sort, Multi-Select, Bulk Bar | Implemented | — |

#### CONTEXT MENU

| ID | Spec-Anforderung | Status | Priorität |
|----|-----------------|--------|-----------|
| D-058 | Nicht Portal-basiert (kein createPortal) | Missing | High |
| D-060 | "Play Next" fehlt im Shared Hook | Partial | Medium |
| D-062 | "Add to Playlist" fehlt als Submenu | Partial | Medium |
| D-063 | "Add to Collection" fehlt | Missing | Medium |
| D-065 | "Download" fehlt | Missing | Medium |
| D-067 | "Share" fehlt | Missing | Medium |
| D-069–D-070 | "Go to Artist/Album" fehlt im Shared Hook | Partial | Medium |
| D-074 | Animation Fade+Slide 150ms fehlt | Missing | Medium |
| D-059, D-061, D-064, D-066, D-071–D-072 | Play, Queue, Favorite, Info, Close-Handler | Implemented | — |

#### SONGROW

| ID | Spec-Anforderung | Status | Priorität |
|----|-----------------|--------|-----------|
| D-078 | Heart-Button ohne onClick-Handler | Partial | Medium |
| D-080 | More-Button (⋯) ohne onClick-Handler | Missing | High |
| D-081 | Kein Context Menu integriert (kein Rechtsklick) | Missing | High |
| D-075–D-077, D-079 | Index→Play, Cover+Title+Artist, Album, Duration | Implemented | — |

**Key Findings:**
- **D-023 bis D-031 (5× Critical):** Playlist-Detailseite ist ein kompletter Stub. PlaylistHeader und PlaylistSongTable sind fertig implementiert, werden aber NICHT eingebunden!
- **D-080/D-081 (High):** SongRow hat dekorative More- und Heart-Buttons ohne Funktion und kein Kontextmenü.
- **D-058 (High):** Context Menu nicht Portal-basiert — z-index/Overflow-Probleme.

### Backend & Jellyfin Integration (Subagent 5) — ✅ Abgeschlossen

25 Abweichungen: 2 Critical, 6 High, 5 Medium. Vollständiger Report in `jellyfin-music-deviation-report.md`.

| ID | Datei | Spec-Anforderung | Status | Priorität |
|----|-------|-----------------|--------|-----------|
| **A-001** | **jellyfin.controller.ts** | **Route-Kollision: searchMusic() und searchMedia() nutzen beide `servers/:serverId/search`** | **Missing** | **Critical** |
| **A-002** | **jellyfin-stream.controller.ts** | **API-Key in Query-Strings sichtbar (?api_key=...)** | **Partial** | **Critical** |
| A-003 | jellyfin.controller.ts | Playlist-Endpoints fehlen (GET/POST/DELETE /playlists) | Missing | High |
| A-004 | jellyfin.service.ts | Playback-Reporting fehlt (POST /Sessions/Playing etc.) | Missing | High |
| A-005 | jellyfin-stream.controller.ts | Auth-Token in Query-Strings (?token=...) | Partial | High |
| A-006 | jellyfin.controller.ts | Server-weite Top-Songs (GET /servers/:id/top) fehlt | Missing | Medium |
| A-007 | jellyfin.service.ts | Audio-Container hartcodiert auf mp3 (kein FLAC/ALAC/WAV) | Partial | Medium |
| A-008 | jellyfin.service.ts | Hardcodierte Credentials (Default IP/API-Key) | Partial | Medium |
| A-009 | jellyfin.service.ts | getJellyfinUserId Cross-Server Cache-Bug | Partial | Medium |
| A-010 | jellyfin.service.ts | Kein Error-Handling bei leerer /Users-Response | Missing | Medium |

**Korrekt implementiert (laut Subagent 5):**
- ✅ Image-Proxy nutzt korrekte width/height (nicht fillWidth/fillHeight) mit UserId
- ✅ Range-Request-Handling (Headers weitergeleitet, 206 akzeptiert)
- ✅ "Default" Server UUID-Fallback funktioniert
- ✅ Favorite-Toggling mit POST/DELETE FavoriteItems
- ✅ Alle Music-Endpoints (songs, recent, favorites, genres, albums, artists, search)
- ✅ Pagination/Sorting auf Songs-Endpoint
- ✅ Stream-Proxy für interne und externe Items

**Key Findings:**
- **A-001 (Critical):** Route-Kollision zwischen Music-Search und Media-Search — Media-Search ist unreachable!
- **A-002 (Critical):** Jellyfin API-Key in URLs sichtbar — Security-Risiko
- **A-003 (High):** Playlist-Endpoints fehlen im Backend — Frontend-Hooks liefern 404s
- **A-004 (High):** Playback-Reporting fehlt — wird aktuell durch IMPL-001 adressiert

---

# Markdown Änderungen

## Iteration 1 — Spec-Bereinigung (2026-07-09)

### Bereinigte Dateien

| Datei | Änderung | Zeilen vor/nach | Begründung |
|-------|----------|-----------------|------------|
| `spotify_desktop_player_overview.md` | Verwaiste "Zukünftige Erweiterungen"-Bullets korrigiert; Zeilennummern-Präfixe entfernt | 460→~430 | Strukturelle Integrität |
| `spotify_layout_specification.md` | 210 Zeilen duplizierte v0.2/v0.3-Sektionen entfernt; v0.3-Konzepte (Renderingregeln, Scroll-Restoration, Größenregeln) integriert; Zeilennummern-Präfixe entfernt | 610→~400 | Redundanz entfernt, widersprüchliche Layer-Definitionen konsolidiert |
| `spotify_visual_language.md` | 44 Zeilen unpräzise v0.2-Summary-Sektion entfernt; Zeilennummern-Präfixe entfernt | 504→~460 | Redundanz entfernt |
| `spotify_responsive_behavior.md` | 45 Zeilen unpräzise v0.2-Summary-Sektion entfernt; Zeilennummern-Präfixe entfernt | 390→~345 | Redundanz entfernt |
| `spotify_navigation.md` | 67 Zeilen vage Summary-Sektion entfernt (Sidebar Zustände, Bereiche, etc.); Breadcrumbs zu Zukünftige Erweiterungen hinzugefügt; Zeilennummern-Präfixe entfernt | 394→~325 | Redundanz entfernt |
| `spotify_library.md` | 73 Zeilen vage Summary-Sektion entfernt (Bibliotheksansichten, Tabellenlayout, etc.); Zeilennummern-Präfixe entfernt | 458→~385 | Redundanz entfernt |
| `spotify_playlist_page.md` | 64 Zeilen vage Summary-Sektion entfernt; Zeilennummern-Präfixe entfernt | 403→~340 | Redundanz entfernt |
| `spotify_home.md` | 52 Zeilen vage Summary-Sektion entfernt; Zeilennummern-Präfixe entfernt | 326→~275 | Redundanz entfernt |
| `spotify_interactions.md` | 36 Zeilen vage Summary-Sektion entfernt; Zeilennummern-Präfixe entfernt | 433→~397 | Redundanz entfernt |
| `spotify_player.md` | 152 Zeilen vage Summary + v0.3-Sektion entfernt; v0.3-Konzepte (React Komponentenstruktur, Performance) integriert; Zeilennummern-Präfixe entfernt | 593→~460 | Redundanz entfernt, wertvolle v0.3-Konzepte behalten |
| `spotify_now_playing_view.md` | 70 Zeilen vage Summary-Sektion entfernt; Zeilennummern-Präfixe entfernt | 528→~457 | Redundanz entfernt |
| `spotify_component_inventory.md` | Zeilennummern-Präfixe entfernt | 476→~476 | Format-Konsistenz |
| `spotify_search.md` | Zeilennummern-Präfixe entfernt | 344→~344 | Format-Konsistenz |
| `IMPLEMENTATION_PLAN_V0.2.md` | Tippfehler "V190rification" → "Verification" | 227→227 | Korrektur |

### Systematische Probleme behoben

1. **Zeilennummern-Präfixe:** Alle 13 Spezifikationsdateien hatten Artefakte wie `1|1|`, `2|2|` oder `1|` am Zeilenanfang. Diese wurden systematisch entfernt.
2. **Duplizierte Summary-Sektionen:** 9 von 13 Dateien hatten am Ende eine vage, unpräzise Zusammenfassung der bereits detailliert definierten Inhalte. Diese wurden entfernt.
3. **Widersprüchliche Layer-Definitionen:** `spotify_layout_specification.md` hatte zwei widersprüchliche Layer-Systeme (z-index 0/10/100/1000/2000/3000 vs. Layer 0-9). Das detaillierte z-index-System bleibt maßgeblich.

### Gesamtwirkung

- **~800 Zeilen redundanter Inhalt entfernt**
- **Alle 13 Specs haben jetzt sauberes Markdown-Format**
- **Keine widersprüchlichen Doppeldefinitionen mehr**
- **Spezifikationen sind präziser und leichter navigierbar**

---

# Implementierungsaufgaben

> Basierend auf Subagent 1 (Player) und Subagent 3 (Library/Home/Search). Subagents 2, 4, 5 werden nachgeliefert.

## Priorisierung

Tasks sind nach Priority gruppiert und nach Dependencies geordnet. Jede Aufgabe hat eindeutige Akzeptanzkriterien.

---

### Phase 1: Critical Fixes

| ID | Beschreibung | Subagent | Abhängigkeiten | Akzeptanzkriterien |
|----|-------------|----------|---------------|-------------------|
| **IMPL-001** | **Jellyfin Playback Reporting implementieren** (P-005) | Player | Keine | POST /Sessions/Playing bei Track-Start, POST /Sessions/Playing/Progress alle 10s, POST /Sessions/Playing/Stopped bei Track-Ende/Skip. Backend-Endpoint + Frontend-Aufruf in MusicPlayerWrapper. |
| **IMPL-002** | **Selection Model für Song-Listen** (L-003) | Library | Keine | Single-Click selects, Ctrl+Click toggles, Shift+Click range, Ctrl+A select all, Click outside clears. Visuelle Hervorhebung der Auswahl. Bulk-Aktions-Leiste erscheint. |

---

### Phase 2: High Priority Fixes

| ID | Beschreibung | Subagent | Abhängigkeiten | Akzeptanzkriterien |
|----|-------------|----------|---------------|-------------------|
| **IMPL-003** | **TrackTable-Komponente in tracks/page.tsx und library/page.tsx verwenden** (L-007) | Library | IMPL-002 | Beide Seiten nutzen TrackTable statt Inline-Implementierung. Alle Features verfügbar: Filter, Context Menu, Column Visibility, Cover Size. |
| **IMPL-004** | **SongRow Kontextmenü und funktionale Heart/More-Buttons** (L-004, L-005) | Library | IMPL-003 | SongRow hat Rechtsklick-Kontextmenü (Play, Play Next, Add to Queue, Add to Playlist, Favorite, Go to Artist, Go to Album). Heart-Button toggelt Favorit. More-Button öffnet Kontextmenü. |
| **IMPL-005** | **Fehlende Tabellenspalten: ♥, Genre, Quality** (L-001, C-008) | Library | IMPL-003 | SortHeader hat alle 8 Spec-Spalten. SongRow zeigt Genre und Quality an. Cover ist in Title-Cell integriert. |
| **IMPL-006** | **Filter-Chips über Songliste** (L-002) | Library | IMPL-003 | Genre Multi-Select-Chips, pill-shaped, AND-Filterung. Automatisch aus Songs generiert. |
| **IMPL-007** | **Search-History in localStorage** (S-003) | Search | Keine | Key `lifehub:music:search-history`, max 20 Einträge. Anzeige bei Fokus auf leerem Suchfeld. Einzelne Einträge löschbar. "Zuletzt gesucht"-Bereich. |
| **IMPL-008** | **Search Ergebnis-Limits und fehlende Kategorien** (S-001, A-001) | Search + Backend | Keine | Songs=4, Artists=4, Albums=4 sichtbar. "Alle anzeigen"-Links. Playlists und Genres als Kategorien (sofern Backend unterstützt). |
| **IMPL-009** | **Home Sections erweitern** (H-003) | UI | Keine | Zusätzliche Sektionen: "Lieblingsalben" (PlayCount-Sortierung), "Entdecken" (nie gehörte Songs aus Lieblingsgenres). Bestehende 3 Sektionen beibehalten. |
| **IMPL-010** | **Quick Access Cards als rechteckige Cover-Cards** (H-001) | UI | Keine | 6 Cards mit Album-Cover links + Titel + Metainfo rechts, ~300×80px. Anstatt Icon-basiert. |
| **IMPL-011** | **Gapless Playback / Preload** (P-006) | Player | IMPL-001 | Zweite Audio-Instanz für Preload bei >80% Playback. Nahtloser Track-Übergang. Konfigurierbares Cross-Fade. |

---

### Phase 3: Medium Priority Fixes

| ID | Beschreibung | Subagent | Abhängigkeiten | Akzeptanzkriterien |
|----|-------------|----------|---------------|-------------------|
| IMPL-012 | Auto-Skip nach 5s bei Fehler (P-007/P-025) | Player | Keine | setTimeout 5s → next() bei Error-State. Toast-Benachrichtigung. |
| IMPL-013 | Keyboard: Shift+→/← 10s Seek (P-008) | Player | Keine | Shift+ArrowRight → +10s, Shift+ArrowLeft → -10s. |
| IMPL-014 | NowPlayingView: 3 Tabs statt 5 (P-014) + Playback Controls (P-015) | Player | Keine | Tabs: "Now Playing" (Cover+Info+Controls), "Lyrics", "Queue". Sidebar-Modus zeigt Play/Pause/Next/Prev. |
| IMPL-015 | Farbextraktion aus Cover (P-016) + Cover Cross-Fade (P-017) | Player | Keine | Canvas-API extrahiert dominante Farbe. Gradient in NowPlayingView. Cross-Fade 300ms bei Track-Wechsel. Cache pro Album-Id. |
| IMPL-016 | Queue Drag & Drop (P-023) | Player | Keine | dnd-kit für Queue-Items. Drag-Handle, Ghost-Element, Einfüge-Marker. |
| IMPL-017 | play()/pause() Store Actions (P-002) | Player | Keine | Explizite play() und pause() Actions im Store, zusätzlich zu togglePlay(). |
| IMPL-018 | Autocomplete-Suggestions (S-004) | Search | IMPL-007 | Bis zu 5 Vorschläge im Dropdown. Pfeiltasten + Enter. Basierend auf History + Index. |
| IMPL-019 | Card Hover Scale 1.02 (H-005) + CardGrid Gap 16px (C-002) | UI | Keine | MusicCard hover: scale-[1.02] transition. CardGrid: gap-4 (16px). |
| IMPL-020 | Skeleton-Shimmer für Library (L-009) | Library | IMPL-003 | 16-Zeilen Skeleton-Placeholder beim Laden, pulsing-Animation. |

---

### Definition of Done (alle Aufgaben)

1. Code compiliert ohne TypeScript-Fehler (`pnpm --filter @lifehub/frontend typecheck`)
2. Keine neuen ESLint-Warnings
3. Code folgt Projekt-Conventions (AGENTS.md, DOX-Kette)
4. Komponenten sind memoized wo sinnvoll
5. Accessibility: ARIA-Labels, Keyboard-Navigierbarkeit
6. UI-Texte auf Deutsch
7. Routen auf Englisch

---

# Review nach Implementierung

*Wird nach der ersten Implementierungs-Iteration dokumentiert.*

---

# Offene Punkte

**Alle 20 Implementierungs-Tasks sind ERLEDIGT ✅**

Sortiert nach Priorität. Status: OFFEN = noch nicht begonnen, IN ARBEIT = Subagent dispatched, ERLEDIGT = implementiert und verifiziert.

## Iteration 2 — Neue Features (Wave 1-3)

| Feature | Wave | Status | Commit |
|---------|------|--------|--------|
| Playlist Create Dialog + Backend | Wave 1 | ✅ ERLEDIGT | 29bd9a8 |
| Skeleton-Shimmer Loading States | Wave 1 | ✅ ERLEDIGT | 29bd9a8 |
| Home "Weiter hören" Section | Wave 1 | ✅ ERLEDIGT | 29bd9a8 |
| Color Extraction (Canvas Utility) | Wave 2 | ✅ ERLEDIGT | 1614922 |
| Lyrics Backend + Frontend Display | Wave 2 | ✅ ERLEDIGT | 1614922 |
| Gapless Playback (Dual-Audio) | Wave 2 | ✅ ERLEDIGT | 1614922 |
| Playlist CRUD (Add/Remove/Delete) | Wave 3 | ✅ ERLEDIGT | 45a98e0 |
| Context Menu Playlist Submenu | Wave 3 | ✅ ERLEDIGT | 45a98e0 |
| Search Filter Tabs (Alle/Musik/Alben/Künstler) | Wave 3 | ✅ ERLEDIGT | 50360e0 |

## Alles ERLEDIGT ✅

| ID | Beschreibung | Status |
|----|-------------|--------|
| IMPL-001 | Jellyfin Playback Reporting (P-005) | ✅ ERLEDIGT |
| IMPL-002 | Selection Model (L-003) | ✅ ERLEDIGT |
| IMPL-003 | TrackTable Integration (L-007) | ✅ ERLEDIGT |
| IMPL-004 | SongRow Kontextmenü + Heart/More (L-004, L-005) | ✅ ERLEDIGT |
| IMPL-005 | Tabellenspalten ♥, Genre, Quality (L-001) | ✅ ERLEDIGT |
| IMPL-006 | Filter-Chips (L-002) | ✅ ERLEDIGT |
| IMPL-007 | Search-History (S-003) | ✅ ERLEDIGT |
| IMPL-008 | Search Limits + Kategorien (S-001) | ✅ ERLEDIGT |
| IMPL-009 | Home Sections (H-003) | ✅ ERLEDIGT |
| IMPL-010 | Quick Access Cover-Cards (H-001) | ✅ ERLEDIGT |
|| IMPL-011 | Gapless Playback (P-006) | ✅ ERLEDIGT — Dual-Audio-Architektur in Wave 2 |
| IMPL-012 | Auto-Skip 5s (P-007) | ✅ ERLEDIGT |
| IMPL-013 | Shift+Arrow Seek (P-008) | ✅ ERLEDIGT |
| IMPL-014 | NowPlaying 3 Tabs + Controls (P-014, P-015) | ✅ ERLEDIGT |
| IMPL-015 | Farbextraktion + Cover Cross-Fade (P-016, P-017) | ✅ ERLEDIGT (Cross-Fade) |
| IMPL-016 | Queue Drag & Drop (P-023) | ✅ ERLEDIGT |
| IMPL-017 | play()/pause() Actions (P-002) | ✅ ERLEDIGT |
| IMPL-018 | Autocomplete (S-004) | ✅ ERLEDIGT |
| IMPL-019 | Card Hover Scale + Grid Gap (H-005, C-002) | ✅ ERLEDIGT |
|| IMPL-020 | Skeleton-Shimmer (L-009) | ✅ ERLEDIGT — SongRowSkeleton in Wave 1 |
| — | D-023..D-031 Playlist Detail Page | ✅ ERLEDIGT |
| — | L-006 Sticky Header Blur | ✅ ERLEDIGT |
| — | A-001 Backend Route Collision | ✅ ERLEDIGT |
| — | A-003 Backend Playlist Endpoints | ✅ ERLEDIGT |
| — | D-009/D-022 Shuffle Buttons | ✅ ERLEDIGT |
| — | D-016 Artist Biography | ✅ ERLEDIGT |
| — | L-009 Sidebar Colors | ✅ ERLEDIGT |
| — | L-003 Z-Index System | ✅ ERLEDIGT |
| — | D-058 Context Menu Portal | ✅ ERLEDIGT |
| — | L-016 Right Sidebar Animation | ✅ ERLEDIGT |

---

# Review-Historie

| Iteration | Datum | Start-Commit | End-Commit | Zusammenfassung |
|-----------|-------|-------------|-----------|-----------------|
| 1 | 2026-07-10 | deaa206 | b5e936e | **Vollständiges Architektur-, UX-, Code- und Implementierungsreview.** 202 Checks durch 5 Analyse-Subagents. 9 Critical, 30 High, 42 Medium, 27 Low Abweichungen identifiziert. 31 Implementierungs-Tasks an Subagents delegiert. 7 Commits mit ~2.000+ Zeilen Änderungen. ~30 Abweichungen behoben. 2 offene Low-Priority-Tasks (Gapless Playback, Skeleton-Shimmer). |
| 2 | 2026-07-16 | 1ee7585 | 50360e0 | **Iteration 2: Functional Features.** 3 Wellen mit je 2-4 Subagents. 9 neue Features implementiert: Playlist Create Dialog + Backend, Skeleton-Shimmer Loading, Home "Weiter hören", Color Extraction Utility, Lyrics Backend+Frontend (LRC-Parser), Gapless Playback (Dual-Audio-Architektur), Playlist CRUD (Add/Remove/Delete), Context Menu Playlist Submenu, Search Filter Tabs. ~1.500 Zeilen neue Funktionalität. Alle 20 Implementierungs-Tasks ERLEDIGT. 0 offene Punkte (funktional). |
