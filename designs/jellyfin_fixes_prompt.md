# Jellyfin Page Fixes — Design Prompt

## Probleme (IST-Zustand)

### P1: Filme/Heimvideos/Fotos — keine Ordner-Navigation
- `LibraryBrowser` dispatched nur `tvshows` und `music` zu speziellen Browsern
- Alle anderen Library-Typen (movies, homevideos, photos, books) → `ItemsTab` = flache Liste
- User kann NICHT in Ordner/Unterstrukturen navigieren
- Jellyfin liefert Items hierarchisch: Library → Folder → Items

### P2: Musik-Interpreten zeigen falsche Inhalte
- User meldet: "AC/DC zeigt Filme"
- Artists werden über `/Artists/AlbumArtists` geladen — korrekt
- Alben über `/Users/{id}/Items?ParentId={artistId}&IncludeItemTypes=MusicAlbum` — korrekt
- Bug vermutlich: `ItemsTab` zeigt ALLE Items einer Library unspezifisch, oder Sync speichert falsche Types

### P3: Videos können nicht abgespielt werden
- `MediaPlayer` Komponente existiert (Zeile 796-802) 
- Stream URL: `/jellyfin/items/:id/stream?token=`
- Vidstack ist importiert — aber Player könnte Bugs haben

### P4: Bilder können nicht normal angeguckt werden
- Keine Bild-Vollansicht/Lightbox für Photo-Libraries
- `ItemsTab` zeigt nur Karten mit Icon — kein Bild-Preview

### P5: Kein Diashow-Modus
- Keine Slideshow-Funktionalität für Bilder

### P6: Musik-Alben können nicht geöffnet werden
- `MusicBrowser` hat Artists→Albums→Songs (3-Level State)
- Aber Alben-Ebene könnte falsche Daten zeigen

### P7: Songs/Alben können nicht abgespielt werden
- `MusicPlayer` Komponente existiert (Zeile 1486-1493)
- Könnte Bugs haben

## Technischer Kontext

### Backend
- `domains/jellyfin/src/api/jellyfin.controller.ts` — 104 Zeilen, 10 Endpoints
- `domains/jellyfin/src/services/jellyfin.service.ts` — 326 Zeilen
- Wichtige Endpoints: `GET /items?libraryId=`, `GET /artists`, `GET /albums?artistId=`, `GET /items/:id/children`, `GET /servers/:serverId/items/:externalId/children`
- Sync: `fetchItemsFromJellyfin` nutzt `/Users/{id}/Items?ParentId={libraryId}` — speichert ALLE Items flach

### Frontend (1768 Zeilen page.tsx)
- `LibraryBrowser` (Zeile 1104): Dispatcher nach library.type
- `SeriesBrowser` (Zeile 1122): Series→Seasons→Episodes (3-Level, funktioniert)
- `MusicBrowser` (Zeile 1298): Artists→Albums→Songs (3-Level)
- `ItemsTab` (Zeile 686): Flache Grid für movies/homevideos/photos
- `MediaPlayer` (Zeile ~940): Video-Player Overlay
- `MusicPlayer` (Zeile ~1550): Audio-Player Overlay

### Library Types (Jellyfin CollectionType)
- `movies`, `tvshows`, `music`, `homevideos`, `photos`, `books`, `mixed`

## Anforderungen

### A1: Ordner-Browser für ALLE Library-Typen
- Neuer `FolderBrowser` für movies, homevideos, photos — ersetzt flaches `ItemsTab`
- Jellyfin API: `/Users/{id}/Items?ParentId={folderId}` für Unter-Items
- Breadcrumb-Navigation (Library > Ordner > Unterordner)
- Grid-Ansicht: Ordner + Dateien (wie im Media-Browser)
- Funktioniert auch für `mixed` libraries

### A2: Musik-Fix — korrekte Alben-Anzeige
- Debug: Warum zeigt Artist "Filme" statt Alben?
- Sicherstellen dass `/albums?artistId=` korrekt filtert
- Album-Artwork von Jellyfin (`/Items/{id}/Images/Primary`)

### A3: Video-Player voll funktionsfähig
- Vidstack mit Community-Skin
- Range-Request-Streaming (Backend unterstützt bereits)
- Fullscreen, Lautstärke, Timeline

### A4: Bild-Vollansicht (Lightbox)
- Klick auf Foto-Item → Vollbild mit Stream-URL
- Navigation (← → Tasten, Swipe)
- Zoom (Mausrad, Pinch)

### A5: Diashow-Modus
- Diashow-Button in Photo-Libraries
- Konfigurierbares Intervall
- Pause/Play, Vor/Zurück

### A6: Musik-Album-Ansicht funktionsfähig
- Album-Ansicht: Cover, Tracklist, "Alle abspielen"
- Klick auf Track → Wiedergabe

### A7: Audio-Player funktionsfähig
- Mini-Player oder Vollbild-Player
- Playlist-Support (nächster Track automatisch)
- Repeat, Shuffle

## Constraints
- KEINE neuen npm-Pakete (Vidstack ist installiert)
- Tailwind CSS + shadcn/ui
- TypeScript strict
- Deutsche UI-Texte
- Backend: Keine neuen DB-Tabellen
- Jellyfin API als Proxy — keine direkten Client-Calls

## Ausgabe
Schreibe nach `C:\Users\Robert_D_AZ_1\Documents\LifeHub\designs\jellyfin_fixes_{MODEL}_v1.md`
