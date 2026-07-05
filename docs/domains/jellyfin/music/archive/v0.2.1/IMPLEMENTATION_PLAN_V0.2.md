# Music Player v0.2 — Implementierungsplan

**Orchestrator:** Hermes Agent (GLM 5.2)
**Implementierung:** Subagents (delegiert)
**Referenz:** `docs/domains/jellyfin/music/spotify_*.md` (13 Spec-Dateien)

---

## Ausgangslage (IST)

| Bereich | Status |
|---------|--------|
| Backend | Jellyfin-API: servers, libraries, items, artists, albums, children, stream, image-proxy, HLS, subtitles. ✅ |
| Frontend `/jellyfin` | Mediathek-Übersicht: Filme, Serien, Bibliotheken, Settings, Video-Player. ✅ |
| Frontend `/jellyfin/music` | Basic artist→album→songs View, lokaler Player-State in page.tsx, MusicPlayerBar 72px. ⚠️ rudimentär |
| Player Store | `player-store.ts` für Media-Domain. Music Player benutzt lokalen useState in page.tsx. ⚠️ geteilt |
| NPM Deps | zustand, @tanstack/react-query, lucide-react vorhanden. ❌ react-virtual, dnd-kit fehlen |

## Ziel (SOLL v0.2)

Spotify-Stil Music Player mit:
- 5-Bereich-Layout (Sidebar 240px, Top Bar 64px, Main Content, Right Sidebar 320px optional, Playback Bar 90px)
- Spotify-Farbpalette (#121212 / #1DB954) als eigene CSS Tokens
- Persistenter Player-Store (Zustand + localStorage)
- Virtualisierte Song-Listen (@tanstack/react-virtual)
- Seiten: Home, Search, Library, Playlist, Album, Artist, Genre, Queue, Now Playing
- Backend: Genres, Recently Played, Search/Hints, Favorites Endpoints
- Keyboard-Shortcuts, Drag & Drop, Context Menus

---

## Phasen & Abhängigkeiten

```
Phase 1 (Foundation — parallel)
├── 1A: Design Tokens + Tailwind Config
├── 1B: Zustand Player Store v2 (music-specific)
└── 1C: Backend API extensions
         │
         ▼
Phase 2 (Shell — nach Phase 1)
├── 2A: AppShell + AppLayout + Sidebar
└── 2B: Player Bar v2 (90px)
         │
         ▼
Phase 3 (Pages — nach Phase 2)
├── 3A: Home Page
├── 3B: Search Page
├── 3C: Library Page (virtualisiert)
└── 3D: Detailseiten (Playlist/Album/Artist/Genre)
         │
         ▼
Phase 4 (Now Playing)
└── Queue, Lyrics, Right Sidebar, Mini-Player
         │
         ▼
Phase 5 (Polish)
└── Context Menus, Drag & Drop, Keyboard Shortcuts
```

---

## Phase 1: Foundation (3 Subagents parallel)

### 1A — Design Tokens + Tailwind Config
**Ziel:** Spotify-Farbpalette als CSS Custom Properties, erweiterte Tailwind-Config für Music Domain.

**Dateien:**
- `apps/frontend/src/app/(dashboard)/jellyfin/music/globals.music.css` (oder in bestehende globals.css integrieren)
- Tailwind config erweitern um `music` color namespace

**Inhalt (aus spotify_visual_language.md):**
```css
:root {
  --bg-base: #121212;
  --bg-elevated: #181818;
  --bg-card: #242424;
  --bg-hover: #2A2A2A;
  --bg-modal: #282828;
  --text-primary: #FFFFFF;
  --text-secondary: #B3B3B3;
  --text-tertiary: #727272;
  --text-disabled: #535353;
  --accent: #1DB954;
  --accent-hover: #1ED760;
  --accent-pressed: #169C46;
  --error: #E91429;
  --warning: #FFA42B;
  --sidebar-width: 240px;
  --sidebar-collapsed-width: 64px;
  --topbar-height: 64px;
  --player-bar-height: 90px;
  --right-sidebar-width: 320px;
  --space-xs: 4px; --space-sm: 8px; --space-md: 16px; --space-lg: 24px; --space-xl: 32px;
  --ease-out: cubic-bezier(0, 0, 0.2, 1);
  --ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
}
```

### 1B — Zustand Player Store v2
**Ziel:** Music-spezifischer Player-Store mit Queue-Management, Persistierung.

**Datei:** `apps/frontend/src/lib/music-player-store.ts`

**Interface (aus spotify_player.md PlayerStore):**
- currentTrack, currentState, position, duration
- queue, queueType, currentIndex, history
- volume, isMuted, shuffle, repeatMode (persistiert via localStorage)
- Actions: play, pause, next, previous, seek, setVolume, toggleShuffle, cycleRepeat, addToQueue, removeFromQueue, playFromQueue, clearQueue

### 1C — Backend API Extensions
**Ziel:** Zusätzliche Jellyfin-API-Endpoints für Music v0.2.

**Dateien:**
- `domains/jellyfin/src/services/jellyfin.service.ts` (erweitern)
- `domains/jellyfin/src/api/jellyfin.controller.ts` (erweitern)

**Neue Endpoints:**
```
GET /jellyfin/servers/:serverId/genres         → Jellyfin /Genres
GET /jellyfin/servers/:serverId/search?q=...    → Jellyfin /Search/Hints (kategorisiert)
GET /jellyfin/servers/:serverId/recent          → Jellyfin /Users/:userId/Items?SortBy=DatePlayed
GET /jellyfin/servers/:serverId/favorites       → Jellyfin /Users/:userId/Items?Filters=IsFavorite
GET /jellyfin/servers/:serverId/songs           → Jellyfin /Users/:userId/Items?IncludeItemTypes=Audio&Recursive=true
GET /jellyfin/servers/:serverId/albums/recent   → Neue Alben (DateCreated desc)
```

---

## Phase 2: Shell (nach Phase 1)

### 2A — AppShell + AppLayout + Sidebar
**Komponenten:**
- `src/components/music/layout/MusicAppShell.tsx` — Layout-Wrapper mit 5 Bereichen
- `src/components/music/layout/MusicAppLayout.tsx` — Grid/Flex Layout
- `src/components/music/sidebar/MusicSidebar.tsx` — 240px Sidebar mit Navigation + Playlists
- `src/components/music/sidebar/SidebarNavButton.tsx`
- `src/components/music/sidebar/SidebarPlaylistItem.tsx`
- `src/components/music/sidebar/SidebarCreateButton.tsx`

**Layout (aus spotify_layout_specification.md):**
```
Top Bar (64px)
├── Sidebar (240px) | Main Content | Right Sidebar (320px optional)
Playback Bar (90px)
```

### 2B — Player Bar v2
**Komponente:** `src/components/music/player/PlayerBar.tsx`

**Spezifikation (aus spotify_player.md):**
- 90px hoch (statt aktuelle 72px)
- Left: Cover (56x56) + Title + Artist + Like + Expand
- Center: Shuffle/Prev/Play(32px circle)/Next/Repeat + Progress Bar (4px, hover 6px)
- Right: Lyrics/Queue/Volume(100px slider)/Fullscreen/Mini-Player
- Keyboard Shortcuts: Space=Play/Pause, ←/→=Prev/Next, +/-=Volume, M=Mute, F=Fullscreen

---

## Phase 3: Pages (nach Phase 2)

### 3A — Home Page
**Route:** `/jellyfin/music` (neu: Home statt artists-list)
**Sections (aus spotify_home.md):**
- Greeting (uhrzeit-basiert)
- Quick Access (6 Cards)
- Zuletzt gehört (ScrollRow)
- Neu in Bibliothek (ScrollRow)
- Lieblingskünstler (ScrollRow)

### 3B — Search Page
**Route:** `/jellyfin/music/search`
**Features (aus spotify_search.md):**
- Search Input (Top Bar + dedicated page)
- Top Result (große Card)
- Kategorisierte Ergebnisse (Songs, Artists, Albums, Playlists)
- Browse Grid (Genres)
- Search History

### 3C — Library Page
**Route:** `/jellyfin/music/library`
**Features (aus spotify_library.md):**
- Tabs: Songs | Alben | Künstler | Playlists | Genres
- Song-Tabelle mit virtualisierung (@tanstack/react-virtual)
- Sort (Spalten-Header klickbar)
- Filter Chips (Genre, Jahr, Favorit)
- 56px Zeilenhöhe

### 3D — Detailseiten
- `/jellyfin/music/album/[id]` — Album-Header (Gradient from cover) + Tracklist
- `/jellyfin/music/artist/[id]` — Artist-Header + Alben-Grid + Top Songs
- `/jellyfin/music/playlist/[id]` — Playlist-Header + Song-Tabelle
- `/jellyfin/music/genre/[id]` — Genre-Header + Card-Grid

---

## Phase 4: Now Playing View

**Komponenten (aus spotify_now_playing_view.md):**
- `NowPlayingView.tsx` — 3 Modi: Sidebar (320px), Fullscreen, Mini-Player
- `NowPlayingQueue.tsx` — Queue mit Drag & Drop reorder
- `NowPlayingLyrics.tsx` — Lyrics display
- `NowPlayingBackground.tsx` — Blurred cover background

---

## Phase 5: Polish

- Context Menus (Song, Album, Playlist right-click)
- Drag & Drop (Song → Playlist, Queue reorder)
- Keyboard Shortcuts (global + per-page)
- Mehrfachauswahl (Strg+Click, Shift+Click)
- Undo/Redo

---

## NPM Dependencies (zu installieren)

```bash
pnpm --filter @lifehub/frontend add @tanstack/react-virtual dnd-kit dnd-kit/core dnd-kit/sortable
```

## Verifikation

```bash
pnpm --filter @lifehub/frontend typecheck
pnpm --filter @lifehub/frontend lint
pnpm --filter @lifehub/frontend build
pnpm --filter @lifehub/backend typecheck
```

## Status-Tracking

| Phase | Status | Subagent | Notes |
|-------|--------|----------|-------|
| 1A Design | PENDING | — | |
| 1B Store | PENDING | — | |
| 1C Backend | PENDING | — | |
| 2A Shell | PENDING | — | |
| 2B Player | PENDING | — | |
| 3A Home | PENDING | — | |
| 3B Search | PENDING | — | |
| 3C Library | PENDING | — | |
| 3D Details | PENDING | — | |
| 4 NowPlaying | PENDING | — | |
| 5 Polish | PENDING | — | |
