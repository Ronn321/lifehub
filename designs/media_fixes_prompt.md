# Media Domain: Folder Browsing, Playback & Slideshow — Design Prompt

## Ziel
Erarbeite ein detailliertes Konzept, um die Media-Domain in LifeHub zu reparieren und zu erweitern. Die folgenden 7 Probleme müssen gelöst werden.

## Probleme (IST-Zustand)

### P1: Ordner können nicht geöffnet werden
- Quellen (NAS/Windows-Pfade) werden gescannt → alle Dateien landen FLACH in `media_files`
- Es gibt KEINE Ordner-Navigation im Frontend
- User kann nicht in Unterordner einer Quelle hinein-navigieren
- Beispiel: Quelle "Fotos" hat Unterordner "2024/Urlaub" → User sieht nur flache Dateiliste, keine Ordnerstruktur

### P2: Bilder können nicht normal angeguckt werden
- Lightbox existiert (Zeile 856 `openLightbox`), aber nutzt `thumbnailPath` (200px JPEG, Qualität 70)
- Thumbnails sind in der Lightbox extrem verpixelt
- Stream-Endpoint existiert (`/media/files/:id/stream?token=...`) — sollte für Vollbild genutzt werden
- Galerie-Grid zeigt Thumbnails korrekt, aber Klick öffnet Lightbox mit unscharfem Bild

### P3: Videos können nicht abgespielt werden
- Kein Video-Player in der Lightbox
- Stream-Endpoint unterstützt Range-Requests — aber `<video>`-Element fehlt
- Vidstack (`@vidstack/react`) ist bereits im Projekt installiert (package.json)
- `isVideo(mimeType)` existiert als Helper, wird aber nicht für Playback genutzt

### P4: Kein Diashow-Modus
- Kein Slideshow-Modus für Bilder oder Ordner
- User will: Klick auf "Diashow starten" → automatisches Durchwechseln der Bilder mit konfigurierbarem Intervall
- Sollte pro Quelle/Ordner/Album funktionieren

### P5: Musik-Ordner zeigen keine Alben
- Audio-Dateien (MP3, FLAC, etc.) werden gescannt aber nicht speziell behandelt
- Keine Artist/Album-Erkennung aus Ordnerstruktur (z.B. "Musik/Interpret/Album/Song.mp3")
- Keine Musik-spezifische UI

### P6: Musik-Alben können nicht geöffnet werden
- Keine Album-Ansicht (Cover, Tracklist, Artist-Info)
- Die existierende "Alben"-Tab im Frontend ist für Foto-Alben, nicht Musik

### P7: Songs/Alben können nicht abgespielt werden
- Kein Audio-Player
- Vidstack unterstützt auch Audio-Wiedergabe
- Stream-Endpoint kann Audio-Dateien streamen, aber niemand ruft sie ab

## Technischer Kontext

### Backend (NestJS 10 + Drizzle ORM)
- `domains/media/src/services/media.service.ts` — `scanSource()` (Zeile 215), `listFiles()` (Zeile 74), `getFileStreamInfo()` (Zeile 108), `walkDirectory()` (Zeile 349)
- `domains/media/src/api/media.controller.ts` — CRUD für sources, files, albums, tags
- `domains/media/src/api/media-stream.controller.ts` — Range-Request-fähiger Stream-Endpoint, Auth via `?token=`
- `domains/media/src/repositories/media.repository.ts` — Drizzle-Queries
- `domains/media/src/entities/media.ts` — `MediaSource`, `MediaFile`, `Album`

### Frontend (Next.js 14 + Tailwind + TanStack Query)
- `apps/frontend/src/app/(dashboard)/media/page.tsx` — 1711 Zeilen, 4 Tabs (Quellen, Alben, Galerie, Karte)
- **Keine** Ordner-Navigation, **keine** Slideshow, **keine** Musik-UI
- Vidstack ist installiert (`@vidstack/react` v0.6.15)
- Lucide-Icons verfügbar

### Datenmodell (PostgreSQL)
- `media_sources` (id, name, type, path, ...)
- `media_files` (id, sourceId, filename, relativePath, mimeType, ...)
- `albums` (id, name, type, ...) — aktuell nur für Foto-Alben
- `album_items` (albumId, mediaId) — Verknüpfung

### MIME-Types (aus media.service.ts)
```typescript
const MEDIA_EXTENSIONS = new Set([
  'jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'tiff', 'tif',
  'raw', 'cr2', 'nef', 'arw', 'dng',
  'mp4', 'mov', 'avi', 'mkv', 'webm',
  'mp3', 'wav', 'flac', 'aac', 'ogg',
  'pdf',
]);

const IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'tiff', 'tif']);
```

### Vidstack Integration (bereits vorhanden)
```tsx
// Jellyfin-Seite nutzt bereits Vidstack:
import { MediaPlayer as VidMediaPlayer, MediaOutlet } from '@vidstack/react';
// CSS: vidstack/styles/base.css + vidstack/styles/community-skin/video.css
```

### Stream-URL Pattern
```typescript
function getMediaStreamUrl(fileId: string): string {
  const token = useAuthStore.getState().accessToken ?? '';
  return `http://${window.location.hostname}:3007/api/v1/media/files/${fileId}/stream?token=${token}`;
}
```

## Anforderungen

### A1: Ordner-Navigation (Source Browser)
- NEUER Tab "Durchsuchen" (neben Quellen/Alben/Galerie/Karte)
- Zeigt Ordner-Baum einer Quelle an (Ordner-Struktur aus `relativePath`)
- Klick auf Ordner → zeigt Unterordner + Dateien in diesem Ordner
- Breadcrumb-Navigation (Quelle > 2024 > Urlaub)
- Grid-Ansicht für Dateien im aktuellen Ordner (Thumbnails wie in Galerie)
- Backend: NEUER Endpoint `GET /media/sources/:id/browse?path=...` der Ordner-Inhalte liefert

### A2: Bild-Vollansicht (Lightbox-Fix)
- Lightbox nutzt Stream-URL statt `thumbnailPath` für Bilder
- Keyboard-Navigation (← → Escape) — bereits vorhanden
- Zoom (Mausrad / Pinch)
- EXIF-Daten anzeigen (Button für Info-Panel)

### A3: Video-Player
- Lightbox erkennt Videos (`isVideo()`) und rendert `<VidMediaPlayer>` statt `<img>`
- Vidstack mit Community-Skin für Controls (Play/Pause, Timeline, Volume, Fullscreen)
- Range-Request-Streaming funktioniert bereits (Backend)

### A4: Diashow-Modus
- Button "Diashow" in der Lightbox und in der Grid-Ansicht
- Konfigurierbares Intervall (2-10 Sekunden, Default 4s)
- Automatisches Durchwechseln aller Bilder im aktuellen Kontext (Ordner/Album/alle)
- Pause/Play, Vor/Zurück während Diashow
- Visueller Übergang (Fade oder Slide, CSS-only)

### A5: Musik-Erkennung & -Darstellung
- Audio-Dateien (mp3, flac, wav, aac, ogg) werden erkannt
- Ordner-Struktur "Interpret/Album/Track" wird geparst
- NEUER Tab "Musik" in der Media-Seite
- Anzeige: Interpreten → Alben → Tracks (Drei-Ebenen-Navigation)
- Album-Cover: Falls `cover.jpg`/`folder.jpg` im Album-Ordner, als Thumbnail nutzen

### A6: Musik-Album-Ansicht
- Album-Seite zeigt: Cover, Album-Name, Artist, Tracklist
- Klick auf Track → Wiedergabe startet
- "Alle abspielen" Button

### A7: Audio-Player
- Vidstack Audio-Player (`<VidMediaPlayer>` mit `type: 'audio/mpeg'`)
- Mini-Player am unteren Bildschirmrand (fixed bottom bar)
- Zeigt: Cover, Track-Name, Artist, Play/Pause, Vor/Zurück, Timeline
- Playlist-Unterstützung: Nächster Track automatisch

## Constraints
- **KEINE neuen npm-Pakete** (Vidstack ist bereits installiert)
- Nur Tailwind CSS + Custom CSS
- TypeScript strict — keine `any`
- Deutsche UI-Texte
- Backend-Endpoints müssen existierenden Patterns folgen (Zod-Validierung, JwtGuard, PermissionGuard)
- **Keine DB-Migration** für neue Tabellen nötig — `media_files.relativePath` enthält bereits den Ordner-Pfad

## Ausgabe-Format
Schreibe dein Design-Dokument nach `C:\Users\Robert_D_AZ_1\Documents\LifeHub\designs\media_fixes_{MODEL}_v1.md`

Das Dokument MUSS enthalten:
1. **Backend-Änderungen**: Neue/geänderte Endpoints, Service-Methoden, DTOs
2. **Frontend-Architektur**: Neue Komponenten, Tabs, State-Flow
3. **Ordner-Navigation**: API + UI-Design (Baum, Breadcrumb, Grid)
4. **Lightbox/Player**: Bild vs. Video vs. Audio — wie wird entschieden?
5. **Slideshow**: State-Maschine, Timer, Übergänge
6. **Musik-UI**: Interpret→Album→Track Navigation, Audio-Player
7. **Datenfluss**: Welche API-Calls? Query-Keys? Optimistic Updates?
8. **Edge Cases**: Leere Ordner, keine Medien, kein Cover, Mobile
9. **Implementierungs-Reihenfolge** (Bottom-up)
10. **Was NICHT in Phase 1 kommt**
