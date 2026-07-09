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

### Player & State Management (Subagent 1)

*Wird ergänzt sobald Subagent 1 abgeschlossen ist.*

### Layout & Navigation (Subagent 2)

*Wird ergänzt sobald Subagent 2 abgeschlossen ist.*

### Library, Home & Search (Subagent 3)

*Wird ergänzt sobald Subagent 3 abgeschlossen ist.*

### Detailseiten & Shared Components (Subagent 4)

*Wird ergänzt sobald Subagent 4 abgeschlossen ist.*

### Backend & Jellyfin Integration (Subagent 5)

*Wird ergänzt sobald Subagent 5 abgeschlossen ist.*

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

*Wird nach Abschluss der Analyse erstellt.*

---

# Review nach Implementierung

*Wird nach der ersten Implementierungs-Iteration dokumentiert.*

---

# Offene Punkte

*Wird nach Abschluss der Analyse sortiert nach Priorität erstellt.*

---

# Review-Historie

| Iteration | Datum | Commit | Zusammenfassung |
|-----------|-------|--------|-----------------|
| 1 | 2026-07-09 | deaa206 | Initial Review — 5 Subagents dispatched für tiefe Code-Analyse |
