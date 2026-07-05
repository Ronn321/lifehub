# Component Inventory

Version 0.2

---

# Ziel

Dieses Dokument listet alle UI-Komponenten der Music Domain auf.

Es dient als Referenz für die Implementierung und als Überblick über den Komponentenbaum.

---

# Gruppierung

1. Sidebar
2. Top Bar
3. Player Bar
4. Main Content
5. Search
6. Library
7. Playlist
8. Now Playing
9. Global / Shared
10. Strukturell

---

# State-Management-Empfehlung

| State-Typ | Technologie |
|-----------|-------------|
| Server-State (Bibliothek, Playlists, Suche) | TanStack Query |
| Player-State (currentTrack, queue, isPlaying) | Zustand |
| UI-State (Sidebar collapsed, active tab) | Zustand |
| Form-State (Edit-Dialoge) | React Hook Form + Zod |

---

# Sidebar

| Komponente | Pfad | Props | States |
|------------|------|-------|--------|
| `Sidebar` | src/components/sidebar/Sidebar.tsx | `collapsed: boolean` | Expanded, Collapsed |
| `SidebarNavButton` | src/components/sidebar/SidebarNavButton.tsx | `icon, label, href, active` | Default, Active, Hover |
| `SidebarPlaylistItem` | src/components/sidebar/SidebarPlaylistItem.tsx | `playlist, onContextMenu` | Default, Active, Dragging |
| `SidebarCreateButton` | src/components/sidebar/SidebarCreateButton.tsx | `onClick` | Default, Hover |
| `SidebarFilterTabs` | src/components/sidebar/SidebarFilterTabs.tsx | `tabs[], activeTab, onChange` | Default, Active |
| `SidebarSortMenu` | src/components/sidebar/SidebarSortMenu.tsx | `value, onChange` | Open, Closed |
| `SidebarSearchField` | src/components/sidebar/SidebarSearchField.tsx | `value, onChange, placeholder` | Empty, Filled |
| `SidebarFolder` | src/components/sidebar/SidebarFolder.tsx | `folder, onToggle` | Open, Closed |

---

# Top Bar

| Komponente | Pfad | Props | States |
|------------|------|-------|--------|
| `TopBar` | src/components/topbar/TopBar.tsx | – | – |
| `NavBackButton` | src/components/topbar/NavBackButton.tsx | `disabled` | Default, Disabled |
| `NavForwardButton` | src/components/topbar/NavForwardButton.tsx | `disabled` | Default, Disabled |
| `HomeButton` | src/components/topbar/HomeButton.tsx | `href` | Default, Active |
| `SearchBar` | src/components/topbar/SearchBar.tsx | `value, onChange, onFocus` | Focused, Unfocused, Filled |
| `UserAvatar` | src/components/topbar/UserAvatar.tsx | `user, onClick` | Default |
| `UserMenu` | src/components/topbar/UserMenu.tsx | `user` | Open, Closed |
| `WindowControls` | src/components/topbar/WindowControls.tsx | – | Default |

---

# Player Bar

| Komponente | Pfad | Props | States |
|------------|------|-------|--------|
| `PlayerBar` | src/components/player/PlayerBar.tsx | – | Default, Compact, Minimal |
| `PlayerCover` | src/components/player/PlayerCover.tsx | `coverUrl, onClick` | Default, Loading |
| `PlayerTrackInfo` | src/components/player/PlayerTrackInfo.tsx | `track` | Default, Overflow (Ellipsis) |
| `LikeButton` | src/components/player/LikeButton.tsx | `isLiked, onToggle` | Liked (grün), Unliked (grau) |
| `PlaybackControls` | src/components/player/PlaybackControls.tsx | `shuffle, repeatMode, isPlaying` | Default, Active |
| `PlayButton` | src/components/player/PlayButton.tsx | `isPlaying, onClick, loading` | Play, Pause, Loading |
| `ProgressBar` | src/components/player/ProgressBar.tsx | `position, duration, onSeek` | Default, Hover (Tooltip), Scrubbing |
| `PlayerTimestamp` | src/components/player/PlayerTimestamp.tsx | `position, duration` | – |
| `VolumeControl` | src/components/player/VolumeControl.tsx | `volume, muted, onChange` | Default, Muted, Hover |
| `QueueButton` | src/components/player/QueueButton.tsx | `count, onClick` | Default, Active (Badge) |
| `LyricsButton` | src/components/player/LyricsButton.tsx | `onClick, active` | Default, Active |
| `DevicePicker` | src/components/player/DevicePicker.tsx | `devices[], onSelect` | Open, Closed |
| `FullscreenButton` | src/components/player/FullscreenButton.tsx | `isFullscreen, onToggle` | Default, Active |
| `MiniPlayerButton` | src/components/player/MiniPlayerButton.tsx | `onClick` | Default |

**Accessibility:** role="region", aria-label="Musikplayer". Play-Button: aria-label dynamisch.

---

# Main Content

| Komponente | Pfad | Props | States |
|------------|------|-------|--------|
| `PageContainer` | src/components/layout/PageContainer.tsx | `children` | – |
| `PageHeader` | src/components/layout/PageHeader.tsx | `title, description, coverUrl, actions` | Default, Scrolled (Sticky+Blur) |
| `PageCover` | src/components/layout/PageCover.tsx | `coverUrl, size` | Default |
| `PageActions` | src/components/layout/PageActions.tsx | `onPlay, onShuffle, onDownload` | – |
| `SongRow` | src/components/content/SongRow.tsx | `song, index, isPlaying, isSelected, onPlay, onContextMenu` | Default, Hover, Playing (grün), Selected |
| `SongTitle` | src/components/content/SongTitle.tsx | `title, artist, coverUrl` | – |
| `SongFavorite` | src/components/content/SongFavorite.tsx | `isFavorite, onToggle` | Favorit, Not-Favorit |
| `Tracklist` | src/components/content/Tracklist.tsx | `songs[], sortBy, sortOrder, onSort` | Normal, Sorting, Empty |
| `TracklistHeader` | src/components/content/TracklistHeader.tsx | `columns[], sortBy, sortOrder, onSort` | Default, Sort-Active |
| `Card` | src/components/content/Card.tsx | `variant, title, subtitle, coverUrl, href, onPlay` | Default, Hover (Scale+Play), Selected |
| `CardGrid` | src/components/content/CardGrid.tsx | `items[]` | Column-Anzahl je Breite |
| `Section` | src/components/content/Section.tsx | `title, items, href` | Default, Overflow |
| `SectionHeader` | src/components/content/SectionHeader.tsx | `title, showAllHref` | – |
| `ScrollRow` | src/components/content/ScrollRow.tsx | `children` | Default, Scroll-Left, Scroll-Right |
| `ScrollArrowButton` | src/components/content/ScrollArrowButton.tsx | `direction, onClick` | Default, Hidden (bei Rand) |
| `FilterChips` | src/components/content/FilterChips.tsx | `chips[], activeChips, onToggle` | Default, Active |
| `FilterChip` | src/components/content/FilterChip.tsx | `label, active, onToggle` | Default, Active |

**Test-IDs:** `data-testid="song-row-{id}"`, `data-testid="card-{id}"`, `data-testid="play-button"`.

---

# Search

| Komponente | Pfad | Props | States |
|------------|------|-------|--------|
| `SearchPage` | src/components/search/SearchPage.tsx | – | – |
| `SearchInputField` | src/components/search/SearchInputField.tsx | `value, onChange, onFocus` | Focused, Filled |
| `SearchClearButton` | src/components/search/SearchClearButton.tsx | `onClick` | Visible, Hidden |
| `SearchCategorySection` | src/components/search/SearchCategorySection.tsx | `title, items, showAllHref` | Expanded, Collapsed |
| `SearchTopResult` | src/components/search/SearchTopResult.tsx | `result, onPlay` | Default, Hover |
| `SearchEmptyState` | src/components/search/SearchEmptyState.tsx | `query` | – |
| `SearchHistoryList` | src/components/search/SearchHistoryList.tsx | `history, onSelect, onClear` | Empty, Has-Items |
| `BrowseGrid` | src/components/search/BrowseGrid.tsx | `genres[]` | – |
| `GenreCard` | src/components/search/GenreCard.tsx | `genre, imageUrl, href` | Default, Hover |

---

# Library

| Komponente | Pfad | Props | States |
|------------|------|-------|--------|
| `LibraryPage` | src/components/library/LibraryPage.tsx | – | – |
| `LibraryHeader` | src/components/library/LibraryHeader.tsx | `tabs, activeTab, sortOptions` | Default |
| `LibraryFilter` | src/components/library/LibraryFilter.tsx | `filters, activeFilters` | Default, Active |
| `LibraryList` | src/components/library/LibraryList.tsx | `items, sortBy` | Normal, Empty |
| `LibraryGrid` | src/components/library/LibraryGrid.tsx | `items` | Grid-Mode |
| `LibraryItem` | src/components/library/LibraryItem.tsx | `item, onClick` | Default, Hover, Dragging |
| `EmptyState` | src/components/shared/EmptyState.tsx | `title, description, action` | – |

---

# Playlist

| Komponente | Pfad | Props | States |
|------------|------|-------|--------|
| `PlaylistPage` | src/components/playlist/PlaylistPage.tsx | `playlist` | – |
| `PlaylistHeader` | src/components/playlist/PlaylistHeader.tsx | `playlist` | Default, Scrolled |
| `PlaylistCover` | src/components/playlist/PlaylistCover.tsx | `coverUrl, size, editable` | Default, Edit-Hover |
| `PlaylistActions` | src/components/playlist/PlaylistActions.tsx | `onPlay, onShuffle, onDownload` | – |
| `PlaylistEditDialog` | src/components/playlist/PlaylistEditDialog.tsx | `playlist, onSave` | Open, Closed |
| `SmartPlaylistEditor` | src/components/playlist/SmartPlaylistEditor.tsx | `rules, onChange` | – |

---

# Now Playing

| Komponente | Pfad | Props | States |
|------------|------|-------|--------|
| `NowPlayingView` | src/components/nowplaying/NowPlayingView.tsx | `mode` | Sidebar, Fullscreen, Mini |
| `NowPlayingCover` | src/components/nowplaying/NowPlayingCover.tsx | `coverUrl, size` | Default, Transition (Cross-Fade) |
| `NowPlayingTrackInfo` | src/components/nowplaying/NowPlayingTrackInfo.tsx | `track` | – |
| `NowPlayingControls` | src/components/nowplaying/NowPlayingControls.tsx | `isPlaying, onPlay, onNext, onPrev` | – |
| `NowPlayingLyrics` | src/components/nowplaying/NowPlayingLyrics.tsx | `lyrics, currentTime` | Available, Unavailable, Sync |
| `NowPlayingQueue` | src/components/nowplaying/NowPlayingQueue.tsx | `queue, currentIndex` | Open, Empty |
| `QueueItem` | src/components/nowplaying/QueueItem.tsx | `song, status, onPlay, onRemove` | NowPlaying, Upcoming, History |
| `NowPlayingBackground` | src/components/nowplaying/NowPlayingBackground.tsx | `coverUrl, dominantColor` | – |
| `SimilarVideos` | src/components/nowplaying/SimilarVideos.tsx | `videos[]` | Default, Empty |

---

# Global / Shared

| Komponente | Pfad | Props | States |
|------------|------|-------|--------|
| `ContextMenu` | src/components/shared/ContextMenu.tsx | `x, y, items, onClose` | Open, Closed |
| `ContextMenuItem` | src/components/shared/ContextMenuItem.tsx | `label, icon, onClick, disabled` | Default, Hover, Disabled |
| `Modal` | src/components/shared/Modal.tsx | `open, onClose, title, children` | Open, Closing, Closed |
| `Toast` | src/components/shared/Toast.tsx | `message, type, duration` | Enter, Visible, Exit |
| `Tooltip` | src/components/shared/Tooltip.tsx | `content, children` | Visible, Hidden |
| `Dropdown` | src/components/shared/Dropdown.tsx | `trigger, items` | Open, Closed |
| `Button` | src/components/shared/Button.tsx | `variant, size, onClick` | Default, Hover, Disabled, Loading |
| `IconButton` | src/components/shared/IconButton.tsx | `icon, onClick, ariaLabel` | Default, Hover, Active |
| `ToggleButton` | src/components/shared/ToggleButton.tsx | `active, onClick, icon` | Active, Inactive |
| `Slider` | src/components/shared/Slider.tsx | `value, min, max, onChange` | Default, Dragging |
| `ProgressBar` | src/components/shared/ProgressBar.tsx | `value, max` | – |
| `Avatar` | src/components/shared/Avatar.tsx | `src, name, size` | Default, Fallback |
| `Badge` | src/components/shared/Badge.tsx | `label, variant` | – |
| `Skeleton` | src/components/shared/Skeleton.tsx | `width, height` | Loading |
| `LoadingSpinner` | src/components/shared/LoadingSpinner.tsx | `size` | – |
| `ErrorState` | src/components/shared/ErrorState.tsx | `message, onRetry` | – |
| `EmptyState` | src/components/shared/EmptyState.tsx | `title, description, action` | – |
| `Divider` | src/components/shared/Divider.tsx | `orientation` | – |

---

# Strukturelle Komponenten

| Komponente | Pfad | Props | States |
|------------|------|-------|--------|
| `AppShell` | src/components/layout/AppShell.tsx | `children` | – |
| `AppLayout` | src/components/layout/AppLayout.tsx | `sidebar, topbar, content, rightSidebar, player` | – |
| `RouteOutlet` | src/components/layout/RouteOutlet.tsx | – | – |
| `ThemeProvider` | src/components/layout/ThemeProvider.tsx | `children` | – |

---

# Card-Varianten

Die `Card`-Komponente besitzt drei Varianten:

| Variante | Pfad | Verwendung |
|----------|------|------------|
| `CardAlbum` | src/components/content/CardAlbum.tsx | Album-Cover + Titel + Künstler |
| `CardPlaylist` | src/components/content/CardPlaylist.tsx | Playlist-Cover + Titel + Besitzer |
| `CardArtist` | src/components/content/CardArtist.tsx | Künstlerbild + Name |

Alle nutzen die Basis `Card` mit unterschiedlicher Datenanbindung.

---

# Zustands-Tabelle

Jede Komponente besitzt mehrere Zustände.

| Zustand | Beschreibung |
|--------|--------------|
| Default | Normaler Ruhezustand |
| Hover | Maus darüber |
| Active | Wird gerade geklickt |
| Selected | Ist ausgewählt |
| Disabled | Deaktiviert |
| Loading | Lädt Daten |
| Error | Fehler aufgetreten |
| Empty | Keine Daten |
| Focus | Keyboard-Focus |

---

# Design-Token-Bindungen

Alle Komponenten nutzen CSS Custom Properties.

```css
.song-row {
  background: var(--bg-base);
  color: var(--text-primary);
  padding: var(--space-md);
  border-radius: 8px;
  transition: background 150ms var(--ease-out);
}

.song-row:hover {
  background: var(--bg-hover);
}
```

Keine hardcoded Werte in Komponenten.

---

# Accessibility

Alle interaktiven Komponenten erhalten:

| Attribut | Verwendung |
|----------|------------|
| role | ARIA-Rolle (button, slider, tab, etc.) |
| aria-label | Beschreibung für Screen-Reader |
| aria-pressed | Bei Toggle-Buttons |
| aria-selected | Bei ausgewählten Elementen |
| aria-expanded | Bei Dropdowns/Accordions |
| tabindex | Keyboard-Focus-Reihenfolge |
| :focus-visible | Sichtbarer Focus-Indikator |

---

# Komponenten-Baum

```
AppShell
└── AppLayout
    ├── Sidebar
    │   ├── SidebarNavButton (Home)
    │   ├── SidebarNavButton (Suche)
    │   ├── SidebarFilterTabs
    │   ├── SidebarPlaylistItem[]
    │   └── SidebarCreateButton
    ├── TopBar
    │   ├── NavBackButton
    │   ├── NavForwardButton
    │   ├── SearchBar
    │   └── UserMenu
    ├── RouteOutlet (Main Content)
    │   └── PageContainer
    │       ├── PageHeader
    │       └── PageContent (variiert je nach Route)
    ├── NowPlayingView (optional, Right Sidebar)
    └── PlayerBar
        ├── PlayerCover
        ├── PlayerTrackInfo
        ├── PlaybackControls
        │   └── PlayButton
        ├── ProgressBar
        ├── VolumeControl
        └── QueueButton
```

---

# Jellyfin Integration

Komponenten sind backend-agnostisch.

Sie empfangen Daten über Props oder TanStack Query.

Daten werden über Jellyfin-API-Gateways geladen.

Keine direkten API-Calls in Komponenten — nur über Custom Hooks.

---

# Zukünftige Erweiterungen

Dieses Dokument wird später detailliert beschreiben

- Storybook-Setup mit allen Stories
- E2E-Test-IDs Vollständigkeits-Check
- Komponenten-Performance-Benchmarks
- Plugin-API für Drittanbieter-Komponenten
