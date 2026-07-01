# Media Fixes — Finaler Implementierungsplan

## Synthese-Entscheidungen

| Bereich | Gewinnt | Begründung |
|---------|---------|------------|
| Backend-Endpoints (Musik) | **DS** | 3 getrennte Endpoints (artists/albums/tracks) statt monolithisch |
| Auth-Guards | **DS** | JwtGuard + PermissionGuard an jedem Endpoint |
| parentPath im BrowseResult | **Mimo** | Breadcrumb-Logik einfacher |
| Frontend-Komponenten-Struktur | **Mimo** | Feature-Ordner: source-browser/, lightbox/, music/, player/ |
| State-Management (Player) | **DS** | Zustand-Store (player-store.ts) — Projekt-Konvention |
| currentTime im PlayerState | **Mimo** | Wichtig für Timeline/Progress |
| Touch-Gesten (Mobile) | **Mimo** | Pinch-to-Zoom + Swipe Next/Prev |
| Query-Key-Dokumentation | **DS** | Systematische Tabelle mit Invalidierung |
| Slideshow State-Maschine | **Mimo** | IDLE→START→PLAYING→PAUSE expliziter |
| Diashow-Übergänge | **DS** | CSS keyframes (fadeIn/fadeOut) |
| Cover-Suche Fallback | **DS** | `cover.jpg` → `folder.jpg` → `front.jpg` → `albumart.jpg` |
| Error States | **DS** | Dedizierte ErrorState-Komponente + Retry |

## Implementierungs-Reihenfolge (5 Phasen)

### Phase 1: Backend (4 neue Endpoints)
1. `GET /media/sources/:id/browse?path=` — Ordner-Browse mit `parentPath` im Response
2. `GET /media/music/artists` — Interpreten aus Audio-Dateien parsen
3. `GET /media/music/albums?artist=` — Alben pro Interpret
4. `GET /media/music/tracks?artist=&album=` — Tracks

### Phase 2: Lightbox + Player (4 Dateien)
5. `components/lightbox/MediaLightbox.tsx` — Stream-URL nutzen, Bild/Video/Audio erkennen
6. `components/lightbox/ImageSlide.tsx` — Bild mit Zoom (Mouse+Pinch)
7. `components/lightbox/VideoSlide.tsx` — Vidstack Video-Player
8. `components/lightbox/SlideshowControls.tsx` — Diashow-Controls + Timer

### Phase 3: Musik-UI (4 Dateien)
9. `components/music/MusicLibrary.tsx` — 3-Ebenen: Interpreten→Alben→Tracks
10. `components/music/AlbumView.tsx` — Cover + Tracklist + "Alle abspielen"
11. `lib/player-store.ts` — Zustand: queue, currentIndex, isPlaying, volume, repeat, shuffle, currentTime
12. `player/AudioPlayer.tsx` — Fixed Bottom Mini-Player

### Phase 4: Ordner-Navigation (3 Dateien)
13. `components/source-browser/SourceBrowser.tsx` — Tab "Durchsuchen"
14. `components/source-browser/FolderGrid.tsx` — Grid: Ordner + Dateien
15. `components/source-browser/Breadcrumb.tsx` — Pfad-Navigation

### Phase 5: Integration + Page Refactor
16. `page.tsx` — Neue Tabs (Durchsuchen, Musik), Lightbox + MiniPlayer einbinden
- Keine DB-Migration nötig
- Keine neuen npm-Pakete
