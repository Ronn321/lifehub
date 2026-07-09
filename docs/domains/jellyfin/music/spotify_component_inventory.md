1|# Component Inventory
2|
3|Version 0.2 — Aktualisiert (Stand: Implementiert)
4|
5|---
6|
7|# Ziel
8|
9|Dieses Dokument listet alle UI-Komponenten der Music Domain auf.
10|Es dient als Referenz für die Implementierung und als Überblick über den Komponentenbaum.
11|**Alle Pfade und Props entsprechen dem aktuell deployed Code v0.2.**
12|
13|---
14|
15|# Gruppierung
16|
17|1. Pages (12 Routen)
18|2. Sidebar
19|3. Player
20|4. Top Bar
21|5. Main Content
22|6. Search
23|7. Library
24|8. Playlist
25|9. Now Playing
26|10. Shared
27|11. State Management
28|
29|---
30|
31|# State-Management
32|
33|| State-Typ | Technologie | Datei |
34||-----------|-------------|-------|
35|| Server-State (Bibliothek, Genres, Suche) | TanStack Query (useQuery) | `@/lib/music-api.ts` (15 Hooks) |
36|| Player-State (currentTrack, queue, isPlaying, volume) | Zustand + persist (localStorage) | `@/lib/music-player-store.ts` |
37|| UI-State (Sidebar collapsed, active tab) | React useState (lokal in Komponenten) | MusicAppShell, MusicSidebar |
38|
39|---
40|
41|# Pages (12 Routen)
42|
43|| Route | Datei | Typ | Features |
44||-------|-------|-----|----------|
45|| `/jellyfin/music` | `music/page.tsx` | Home | Greeting, Quick Access 6 Cards, 3 ScrollRows |
46|| `/jellyfin/music/search` | `music/search/page.tsx` | Search | Debounced Search, Top Result, Genre Grid |
47|| `/jellyfin/music/library` | `music/library/page.tsx` | Library | Tabs (Songs/Alben/Künstler/Genres), virtualisierte Tabelle |
48|| `/jellyfin/music/tracks` | `music/tracks/page.tsx` | Songs | Virtualisierte Song-Tabelle, Sortierung, Pagination (100er-Seiten) |
49|| `/jellyfin/music/albums` | `music/albums/page.tsx` | Albums | CardGrid mit Album-Covern, klickbar → Detail |
50|| `/jellyfin/music/artists` | `music/artists/page.tsx` | Artists | CardGrid mit runden Covern, klickbar → Detail |
51|| `/jellyfin/music/genres` | `music/genres/page.tsx` | Genres | CardGrid mit Genre-Namen, klickbar → Detail |
52|| `/jellyfin/music/playlists` | `music/playlists/page.tsx` | Playlists | Liste (Stub — „Keine Playlists") |
53|| `/jellyfin/music/album/[id]` | `music/album/[id]/page.tsx` | Album Detail | Cover 232px, Tracklist, „Alle abspielen" |
54|| `/jellyfin/music/artist/[id]` | `music/artist/[id]/page.tsx` | Artist Detail | Rundes Cover, Top Songs, Discography |
55|| `/jellyfin/music/genre/[id]` | `music/genre/[id]/page.tsx` | Genre Detail | Farbverlauf-Header, Songs via `useGenreSongs` |
56|| `/jellyfin/music/playlist/[id]` | `music/playlist/[id]/page.tsx` | Playlist Detail | Stub („Playlist-Funktion kommt bald") |
57|
58|Jede Seite verwendet einheitliches Layout:
59|```tsx
60|<div className=\"flex flex-col -m-6 lg:-m-8\" style={{ height: 'calc(100% + 48px)' }}>
61|  <div className=\"flex-1 overflow-y-auto music-scroll\">
62|    <MusicAppShell sidebarProps={{}}> {/* ohne playerBar/showPlayerBar Props */}
63|      ... content ...
64|    </MusicAppShell>
65|  </div>
66|  <div className=\"flex-shrink-0\" style={{ height: 'var(--music-player-bar-height)' }}>
67|    <MusicPlayerWrapper />
68|  </div>
69|</div>
70|```
71|
72|---
73|
74|# Sidebar
75|
76|| Komponente | Pfad | Props | States |
77||------------|------|-------|--------|
78|| `MusicSidebar` | `components/music/sidebar/MusicSidebar.tsx` | `collapsed: boolean, onToggleCollapse: () => void, onTabChange?, onCreatePlaylist?, playlists?, activePlaylistId?, onPlaylistClick?` | Expanded (240px), Collapsed (64px Icons-only) |
79|| `SidebarNavButton` | `components/music/sidebar/SidebarNavButton.tsx` | `icon, label, href, collapsed: boolean, active: boolean` | Default, Active |
80|| `SidebarPlaylistItem` | `components/music/sidebar/SidebarPlaylistItem.tsx` | `playlist, collapsed: boolean, onClick` | Default, Collapsed (nur Cover) |
81|| `SidebarCreateButton` | `components/music/sidebar/SidebarCreateButton.tsx` | `onClick, collapsed: boolean` | Default, Collapsed (nur Icon) |
82|
83|**Tabs in der Sidebar:** Playlists/Künstler/Alben sind klickbare Filter-Tabs. Bei Klick werden Items aus music-api-Hooks geladen und als Mini-Card-Liste (32×32 Cover) unter den Tabs angezeigt. Im collapsed-Modus: nur Cover-Bilder.
84|
85|---
86|
87|# Player
88|
89|| Komponente | Pfad | Props | Features |
90||------------|------|-------|----------|
91|| `MusicPlayerBar` | `components/music/player/MusicPlayerBar.tsx` | `audioRef, onExpandToggle, isExpanded, onLikeToggle, isLiked, onQueueToggle, queueCount` | 90px Höhe, Left (Cover 56px + Info + Like + Expand), Center (Shuffle/Prev/Play 32px/Next/Repeat + ProgressBar), Right (Volume 100px/Queue/Fullscreen/Mini) |
92|| `MusicPlayerWrapper` | `components/music/player/MusicPlayerWrapper.tsx` | — (Singleton, kein Prop) | `<audio>`-Element (lazy, browser-only), Store-Sync (currentTrack, isPlaying), Track-Ende → Auto-Next, Error-Handling, Volume/Mute-Sync |
93|
94|**Wichtig:** MusicPlayerWrapper ist ein Singleton — `audioRef` überlebt Next.js Page-Transitions. Er wird NACH MusicAppShell gerendert, nicht als dessen Prop.
95|
96|---
97|
98|# Shared Components
99|
100|| Komponente | Pfad | Props |
101||------------|------|-------|
102|| `MusicCard` | `components/music/shared/MusicCard.tsx` | `title, subtitle?, coverUrl?, onClick?, onPlay?, rounded?: boolean` |
103|| `MusicCardGrid` | `components/music/shared/MusicCard.tsx` | `children` |
104|| `MusicScrollRow` | `components/music/shared/MusicCard.tsx` | `children` |
105|| `MusicSection` | `components/music/shared/MusicCard.tsx` | `title, showAllHref, children` |
106|| `MusicSkeleton` | `components/music/shared/MusicCard.tsx` | `count: number` |
107|| `MusicImage` | `components/music/shared/MusicCard.tsx` | `src, alt, className` |
108|| `SongRow` | `components/music/shared/SongRow.tsx` | `track, index, serverId, accessToken, isPlaying, showAlbum?, onClick?, onPlay?` |
109|| `TracklistHeader` | `components/music/shared/SongRow.tsx` | `showAlbum?: boolean` |
110|| `MusicEmptyState` | `components/music/shared/SongRow.tsx` | `title, description` |
111|| `ContextMenu` | `components/music/shared/ContextMenu.tsx` | Portal-basiert, `useSongContextMenu()` Hook |
112|
113|---
114|
115|# AppShell
116|
117|| Komponente | Pfad | Props | Hinweis |
118||------------|------|-------|---------|
119|| `MusicAppShell` | `components/music/layout/MusicAppShell.tsx` | `children, topBar?, rightSidebar?, sidebarProps?: Partial<MusicSidebarProps>, className?` | **KEINE** `playerBar`/`showPlayerBar` Props mehr. Player wird separat gerendert. |
120|
121|Layout: Flex (sidebar | content | rightSidebar). Sidebar `sticky top-0.` Content `overflow-y-auto`. Player `flex-shrink-0` NACH MusicAppShell.
122|
123|---
124|
125|# Styles
126|
127|| Datei | Inhalt |
128||-------|--------|
129|| `jellyfin/music/music-theme.css` | Spotify CSS Custom Properties (`--bg-base: #121212`, `--accent: #1DB954`, `--sidebar-width: 240px`, `--sidebar-collapsed-width: 64px`, `--player-bar-height: 90px`) |
130|
131|---
132|
133|# Backend API Endpoints (Jellyfin-Domain)
134|
135|| Endpoint | Service-Methode | Beschreibung |
136||----------|----------------|--------------|
137|| `GET /jellyfin/servers/:id/genres` | `getGenres()` | Nutzt `/Artists/AlbumArtists?Fields=Genres` (nur Musik-Genres!) |
138|| `GET /jellyfin/servers/:id/search?q=` | `searchMusic()` | Jellyfin Search kategorisiert |
139|| `GET /jellyfin/servers/:id/recent` | `getRecentlyPlayed()` | Jellyfin DatePlayed desc |
140|| `GET /jellyfin/servers/:id/favorites` | `getFavoriteSongs()` | Jellyfin IsFavorite |
141|| `GET /jellyfin/servers/:id/songs` | `getAllSongs()` | Jellyfin Audio, paginiert, sortierbar |
142|| `GET /jellyfin/servers/:id/albums/recent` | `getRecentAlbums()` | Neue Alben |
143|| `GET /jellyfin/servers/:id/albums/:aid/songs` | `getAlbumSongs()` | Songs eines Albums |
144|| `GET /jellyfin/servers/:id/top` | `getTopSongs()` | Top-Songs |
145|| `GET /jellyfin/servers/:id/artists` | `getArtists()` | Jellyfin AlbumArtists |
146|| `GET /jellyfin/servers/:id/genres/:gid/songs` | `getSongsByGenre()` | Jellyfin Audio + GenreIds (NEU) |
147|| `GET /jellyfin/items/:id/image` | `proxyImage()` | **width/height** + UserId (NICHT fillWidth/fillHeight) |
148|| `GET /jellyfin/items/:id/stream` | `getExternalItemStream()` | Audio-Stream-Range-Request Proxy |
149|| `SidebarSearchField` | src/components/sidebar/SidebarSearchField.tsx | `value, onChange, placeholder` | Empty, Filled |
150|| `SidebarFolder` | src/components/sidebar/SidebarFolder.tsx | `folder, onToggle` | Open, Closed |
151|
152|---
153|
154|# Top Bar
155|
156|| Komponente | Pfad | Props | States |
157||------------|------|-------|--------|
158|| `TopBar` | src/components/topbar/TopBar.tsx | – | – |
159|| `NavBackButton` | src/components/topbar/NavBackButton.tsx | `disabled` | Default, Disabled |
160|| `NavForwardButton` | src/components/topbar/NavForwardButton.tsx | `disabled` | Default, Disabled |
161|| `HomeButton` | src/components/topbar/HomeButton.tsx | `href` | Default, Active |
162|| `SearchBar` | src/components/topbar/SearchBar.tsx | `value, onChange, onFocus` | Focused, Unfocused, Filled |
163|| `UserAvatar` | src/components/topbar/UserAvatar.tsx | `user, onClick` | Default |
164|| `UserMenu` | src/components/topbar/UserMenu.tsx | `user` | Open, Closed |
165|| `WindowControls` | src/components/topbar/WindowControls.tsx | – | Default |
166|
167|---
168|
169|# Player Bar
170|
171|| Komponente | Pfad | Props | States |
172||------------|------|-------|--------|
173|| `PlayerBar` | src/components/player/PlayerBar.tsx | – | Default, Compact, Minimal |
174|| `PlayerCover` | src/components/player/PlayerCover.tsx | `coverUrl, onClick` | Default, Loading |
175|| `PlayerTrackInfo` | src/components/player/PlayerTrackInfo.tsx | `track` | Default, Overflow (Ellipsis) |
176|| `LikeButton` | src/components/player/LikeButton.tsx | `isLiked, onToggle` | Liked (grün), Unliked (grau) |
177|| `PlaybackControls` | src/components/player/PlaybackControls.tsx | `shuffle, repeatMode, isPlaying` | Default, Active |
178|| `PlayButton` | src/components/player/PlayButton.tsx | `isPlaying, onClick, loading` | Play, Pause, Loading |
179|| `ProgressBar` | src/components/player/ProgressBar.tsx | `position, duration, onSeek` | Default, Hover (Tooltip), Scrubbing |
180|| `PlayerTimestamp` | src/components/player/PlayerTimestamp.tsx | `position, duration` | – |
181|| `VolumeControl` | src/components/player/VolumeControl.tsx | `volume, muted, onChange` | Default, Muted, Hover |
182|| `QueueButton` | src/components/player/QueueButton.tsx | `count, onClick` | Default, Active (Badge) |
183|| `LyricsButton` | src/components/player/LyricsButton.tsx | `onClick, active` | Default, Active |
184|| `DevicePicker` | src/components/player/DevicePicker.tsx | `devices[], onSelect` | Open, Closed |
185|| `FullscreenButton` | src/components/player/FullscreenButton.tsx | `isFullscreen, onToggle` | Default, Active |
186|| `MiniPlayerButton` | src/components/player/MiniPlayerButton.tsx | `onClick` | Default |
187|
188|**Accessibility:** role="region", aria-label="Musikplayer". Play-Button: aria-label dynamisch.
189|
190|---
191|
192|# Main Content
193|
194|| Komponente | Pfad | Props | States |
195||------------|------|-------|--------|
196|| `PageContainer` | src/components/layout/PageContainer.tsx | `children` | – |
197|| `PageHeader` | src/components/layout/PageHeader.tsx | `title, description, coverUrl, actions` | Default, Scrolled (Sticky+Blur) |
198|| `PageCover` | src/components/layout/PageCover.tsx | `coverUrl, size` | Default |
199|| `PageActions` | src/components/layout/PageActions.tsx | `onPlay, onShuffle, onDownload` | – |
200|| `SongRow` | src/components/content/SongRow.tsx | `song, index, isPlaying, isSelected, onPlay, onContextMenu` | Default, Hover, Playing (grün), Selected |
201|| `SongTitle` | src/components/content/SongTitle.tsx | `title, artist, coverUrl` | – |
202|| `SongFavorite` | src/components/content/SongFavorite.tsx | `isFavorite, onToggle` | Favorit, Not-Favorit |
203|| `Tracklist` | src/components/content/Tracklist.tsx | `songs[], sortBy, sortOrder, onSort` | Normal, Sorting, Empty |
204|| `TracklistHeader` | src/components/content/TracklistHeader.tsx | `columns[], sortBy, sortOrder, onSort` | Default, Sort-Active |
205|| `Card` | src/components/content/Card.tsx | `variant, title, subtitle, coverUrl, href, onPlay` | Default, Hover (Scale+Play), Selected |
206|| `CardGrid` | src/components/content/CardGrid.tsx | `items[]` | Column-Anzahl je Breite |
207|| `Section` | src/components/content/Section.tsx | `title, items, href` | Default, Overflow |
208|| `SectionHeader` | src/components/content/SectionHeader.tsx | `title, showAllHref` | – |
209|| `ScrollRow` | src/components/content/ScrollRow.tsx | `children` | Default, Scroll-Left, Scroll-Right |
210|| `ScrollArrowButton` | src/components/content/ScrollArrowButton.tsx | `direction, onClick` | Default, Hidden (bei Rand) |
211|| `FilterChips` | src/components/content/FilterChips.tsx | `chips[], activeChips, onToggle` | Default, Active |
212|| `FilterChip` | src/components/content/FilterChip.tsx | `label, active, onToggle` | Default, Active |
213|
214|**Test-IDs:** `data-testid="song-row-{id}"`, `data-testid="card-{id}"`, `data-testid="play-button"`.
215|
216|---
217|
218|# Search
219|
220|| Komponente | Pfad | Props | States |
221||------------|------|-------|--------|
222|| `SearchPage` | src/components/search/SearchPage.tsx | – | – |
223|| `SearchInputField` | src/components/search/SearchInputField.tsx | `value, onChange, onFocus` | Focused, Filled |
224|| `SearchClearButton` | src/components/search/SearchClearButton.tsx | `onClick` | Visible, Hidden |
225|| `SearchCategorySection` | src/components/search/SearchCategorySection.tsx | `title, items, showAllHref` | Expanded, Collapsed |
226|| `SearchTopResult` | src/components/search/SearchTopResult.tsx | `result, onPlay` | Default, Hover |
227|| `SearchEmptyState` | src/components/search/SearchEmptyState.tsx | `query` | – |
228|| `SearchHistoryList` | src/components/search/SearchHistoryList.tsx | `history, onSelect, onClear` | Empty, Has-Items |
229|| `BrowseGrid` | src/components/search/BrowseGrid.tsx | `genres[]` | – |
230|| `GenreCard` | src/components/search/GenreCard.tsx | `genre, imageUrl, href` | Default, Hover |
231|
232|---
233|
234|# Library
235|
236|| Komponente | Pfad | Props | States |
237||------------|------|-------|--------|
238|| `LibraryPage` | src/components/library/LibraryPage.tsx | – | – |
239|| `LibraryHeader` | src/components/library/LibraryHeader.tsx | `tabs, activeTab, sortOptions` | Default |
240|| `LibraryFilter` | src/components/library/LibraryFilter.tsx | `filters, activeFilters` | Default, Active |
241|| `LibraryList` | src/components/library/LibraryList.tsx | `items, sortBy` | Normal, Empty |
242|| `LibraryGrid` | src/components/library/LibraryGrid.tsx | `items` | Grid-Mode |
243|| `LibraryItem` | src/components/library/LibraryItem.tsx | `item, onClick` | Default, Hover, Dragging |
244|| `EmptyState` | src/components/shared/EmptyState.tsx | `title, description, action` | – |
245|
246|---
247|
248|# Playlist
249|
250|| Komponente | Pfad | Props | States |
251||------------|------|-------|--------|
252|| `PlaylistPage` | src/components/playlist/PlaylistPage.tsx | `playlist` | – |
253|| `PlaylistHeader` | src/components/playlist/PlaylistHeader.tsx | `playlist` | Default, Scrolled |
254|| `PlaylistCover` | src/components/playlist/PlaylistCover.tsx | `coverUrl, size, editable` | Default, Edit-Hover |
255|| `PlaylistActions` | src/components/playlist/PlaylistActions.tsx | `onPlay, onShuffle, onDownload` | – |
256|| `PlaylistEditDialog` | src/components/playlist/PlaylistEditDialog.tsx | `playlist, onSave` | Open, Closed |
257|| `SmartPlaylistEditor` | src/components/playlist/SmartPlaylistEditor.tsx | `rules, onChange` | – |
258|
259|---
260|
261|# Now Playing
262|
263|| Komponente | Pfad | Props | States |
264||------------|------|-------|--------|
265|| `NowPlayingView` | src/components/nowplaying/NowPlayingView.tsx | `mode` | Sidebar, Fullscreen, Mini |
266|| `NowPlayingCover` | src/components/nowplaying/NowPlayingCover.tsx | `coverUrl, size` | Default, Transition (Cross-Fade) |
267|| `NowPlayingTrackInfo` | src/components/nowplaying/NowPlayingTrackInfo.tsx | `track` | – |
268|| `NowPlayingControls` | src/components/nowplaying/NowPlayingControls.tsx | `isPlaying, onPlay, onNext, onPrev` | – |
269|| `NowPlayingLyrics` | src/components/nowplaying/NowPlayingLyrics.tsx | `lyrics, currentTime` | Available, Unavailable, Sync |
270|| `NowPlayingQueue` | src/components/nowplaying/NowPlayingQueue.tsx | `queue, currentIndex` | Open, Empty |
271|| `QueueItem` | src/components/nowplaying/QueueItem.tsx | `song, status, onPlay, onRemove` | NowPlaying, Upcoming, History |
272|| `NowPlayingBackground` | src/components/nowplaying/NowPlayingBackground.tsx | `coverUrl, dominantColor` | – |
273|| `SimilarVideos` | src/components/nowplaying/SimilarVideos.tsx | `videos[]` | Default, Empty |
274|
275|---
276|
277|# Global / Shared
278|
279|| Komponente | Pfad | Props | States |
280||------------|------|-------|--------|
281|| `ContextMenu` | src/components/shared/ContextMenu.tsx | `x, y, items, onClose` | Open, Closed |
282|| `ContextMenuItem` | src/components/shared/ContextMenuItem.tsx | `label, icon, onClick, disabled` | Default, Hover, Disabled |
283|| `Modal` | src/components/shared/Modal.tsx | `open, onClose, title, children` | Open, Closing, Closed |
284|| `Toast` | src/components/shared/Toast.tsx | `message, type, duration` | Enter, Visible, Exit |
285|| `Tooltip` | src/components/shared/Tooltip.tsx | `content, children` | Visible, Hidden |
286|| `Dropdown` | src/components/shared/Dropdown.tsx | `trigger, items` | Open, Closed |
287|| `Button` | src/components/shared/Button.tsx | `variant, size, onClick` | Default, Hover, Disabled, Loading |
288|| `IconButton` | src/components/shared/IconButton.tsx | `icon, onClick, ariaLabel` | Default, Hover, Active |
289|| `ToggleButton` | src/components/shared/ToggleButton.tsx | `active, onClick, icon` | Active, Inactive |
290|| `Slider` | src/components/shared/Slider.tsx | `value, min, max, onChange` | Default, Dragging |
291|| `ProgressBar` | src/components/shared/ProgressBar.tsx | `value, max` | – |
292|| `Avatar` | src/components/shared/Avatar.tsx | `src, name, size` | Default, Fallback |
293|| `Badge` | src/components/shared/Badge.tsx | `label, variant` | – |
294|| `Skeleton` | src/components/shared/Skeleton.tsx | `width, height` | Loading |
295|| `LoadingSpinner` | src/components/shared/LoadingSpinner.tsx | `size` | – |
296|| `ErrorState` | src/components/shared/ErrorState.tsx | `message, onRetry` | – |
297|| `EmptyState` | src/components/shared/EmptyState.tsx | `title, description, action` | – |
298|| `Divider` | src/components/shared/Divider.tsx | `orientation` | – |
299|
300|---
301|
302|# Strukturelle Komponenten
303|
304|| Komponente | Pfad | Props | States |
305||------------|------|-------|--------|
306|| `AppShell` | src/components/layout/AppShell.tsx | `children` | – |
307|| `AppLayout` | src/components/layout/AppLayout.tsx | `sidebar, topbar, content, rightSidebar, player` | – |
308|| `RouteOutlet` | src/components/layout/RouteOutlet.tsx | – | – |
309|| `ThemeProvider` | src/components/layout/ThemeProvider.tsx | `children` | – |
310|
311|---
312|
313|# Card-Varianten
314|
315|Die `Card`-Komponente besitzt drei Varianten:
316|
317|| Variante | Pfad | Verwendung |
318||----------|------|------------|
319|| `CardAlbum` | src/components/content/CardAlbum.tsx | Album-Cover + Titel + Künstler |
320|| `CardPlaylist` | src/components/content/CardPlaylist.tsx | Playlist-Cover + Titel + Besitzer |
321|| `CardArtist` | src/components/content/CardArtist.tsx | Künstlerbild + Name |
322|
323|Alle nutzen die Basis `Card` mit unterschiedlicher Datenanbindung.
324|
325|---
326|
327|# Zustands-Tabelle
328|
329|Jede Komponente besitzt mehrere Zustände.
330|
331|| Zustand | Beschreibung |
332||--------|--------------|
333|| Default | Normaler Ruhezustand |
334|| Hover | Maus darüber |
335|| Active | Wird gerade geklickt |
336|| Selected | Ist ausgewählt |
337|| Disabled | Deaktiviert |
338|| Loading | Lädt Daten |
339|| Error | Fehler aufgetreten |
340|| Empty | Keine Daten |
341|| Focus | Keyboard-Focus |
342|
343|---
344|
345|# Design-Token-Bindungen
346|
347|Alle Komponenten nutzen CSS Custom Properties.
348|
349|```css
350|.song-row {
351|  background: var(--bg-base);
352|  color: var(--text-primary);
353|  padding: var(--space-md);
354|  border-radius: 8px;
355|  transition: background 150ms var(--ease-out);
356|}
357|
358|.song-row:hover {
359|  background: var(--bg-hover);
360|}
361|```
362|
363|Keine hardcoded Werte in Komponenten.
364|
365|---
366|
367|# Accessibility
368|
369|Alle interaktiven Komponenten erhalten:
370|
371|| Attribut | Verwendung |
372||----------|------------|
373|| role | ARIA-Rolle (button, slider, tab, etc.) |
374|| aria-label | Beschreibung für Screen-Reader |
375|| aria-pressed | Bei Toggle-Buttons |
376|| aria-selected | Bei ausgewählten Elementen |
377|| aria-expanded | Bei Dropdowns/Accordions |
378|| tabindex | Keyboard-Focus-Reihenfolge |
379|| :focus-visible | Sichtbarer Focus-Indikator |
380|
381|---
382|
383|# Komponenten-Baum
384|
385|```
386|AppShell
387|└── AppLayout
388|    ├── Sidebar
389|    │   ├── SidebarNavButton (Home)
390|    │   ├── SidebarNavButton (Suche)
391|    │   ├── SidebarFilterTabs
392|    │   ├── SidebarPlaylistItem[]
393|    │   └── SidebarCreateButton
394|    ├── TopBar
395|    │   ├── NavBackButton
396|    │   ├── NavForwardButton
397|    │   ├── SearchBar
398|    │   └── UserMenu
399|    ├── RouteOutlet (Main Content)
400|    │   └── PageContainer
401|    │       ├── PageHeader
402|    │       └── PageContent (variiert je nach Route)
403|    ├── NowPlayingView (optional, Right Sidebar)
404|    └── PlayerBar
405|        ├── PlayerCover
406|        ├── PlayerTrackInfo
407|        ├── PlaybackControls
408|        │   └── PlayButton
409|        ├── ProgressBar
410|        ├── VolumeControl
411|        └── QueueButton
412|```
413|
414|---
415|
416|# Jellyfin Integration
417|
418|Komponenten sind backend-agnostisch.
419|
420|Sie empfangen Daten über Props oder TanStack Query.
421|
422|Daten werden über Jellyfin-API-Gateways geladen.
423|
424|Keine direkten API-Calls in Komponenten — nur über Custom Hooks.
425|
426|---
427|
428|# Zukünftige Erweiterungen
429|
430|Dieses Dokument wird später detailliert beschreiben
431|
432|- Storybook-Setup mit allen Stories
433|- E2E-Test-IDs Vollständigkeits-Check
434|- Komponenten-Performance-Benchmarks
435|- Plugin-API für Drittanbieter-Komponenten
436|
---

# Layout Components
Application Window, Top Bar, Sidebar, Main Content, Right Sidebar, Playback Bar

# Navigation Components
Navigation Item/Group, Breadcrumb, Search Bar, History Buttons, Profile Menu

# Library Components
Song Row, Album/Artist/Playlist/Genre/Collection Card, Folder Row

# Playback Components
Play/Pause/Next/Previous/Shuffle/Repeat Button, Timeline, Volume Slider, Queue/Device/Lyrics/Now Playing Button

# List Components
Virtual List, Table Header/Row, Column Header, Selection Overlay

# Input Components
Search Field, Text Field, Checkbox, Toggle, Dropdown, Slider

# Overlay Components
Context Menu, Dialog, Modal, Tooltip, Notification, Toast

# Information Components
Badge, Tag, Metadata Row, Statistics Panel, Information Card

# States
Default, Hover, Focused, Pressed, Selected, Active, Disabled, Loading, Empty, Error

# Component Hierarchie
Window > Layout > Sidebar/Header/Main Content/Right Sidebar/Playback

# Wiederverwendbarkeit
Alle Komponenten domänenübergreifend. Music Domain nutzt ausschließlich wiederverwendbare UI-Komponenten.

# Komponentenregeln
Keine komponentenspezifischen Farben. Keine festen Abstände. Größen aus Design Tokens. States zentral definiert.

# Erweiterung später
Props, Component API, React Struktur, Accessibility, Zustandsdiagramme, Renderinglogik, Virtualisierung, Performance
