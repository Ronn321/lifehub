# Media Domain Fixes — Design-Dokument v1

**Erstellt:** 2026-06-19
**Lösung für:** 7 Probleme (P1–P7)
**Modell:** mimo-v2.5-free

---

## 1. Backend-Änderungen

### 1.1 Neuer Endpoint: Ordner-Browsen

```
GET /media/sources/:id/browse?path=/
```

**Response:**
```typescript
interface BrowseResult {
  currentPath: string;
  parentPath: string | null;
  folders: FolderEntry[];
  files: MediaFileSummary[];
}

interface FolderEntry {
  name: string;
  path: string;
  fileCount: number;
}

interface MediaFileSummary {
  id: string;
  filename: string;
  mimeType: string;
  thumbnailPath: string | null;
  width: number | null;
  height: number | null;
  duration: number | null;
}
```

**Implementierung in `media.service.ts`:**
- Methode `browseSource(sourceId: string, relativePath: string)` parsen
- `fs.readdir` mit `withFileTypes: true`
- Ordner: `dirent.isDirectory()` → `FolderEntry`
- Dateien: `dirent.isFile()` → aus `media_files` per `relativePath LIKE '{path}/%'` + `NOT LIKE '{path}/%/%'` (direkte Kinder)
- `parentPath`: `path.dirname(relativePath)`, null wenn Root

### 1.2 Geänderter Endpoint: File-Liste

```
GET /media/files?sourceId=...&relativePath=...&mimeType=image/*
```

Bestehender Endpoint wird erweitert um optionalen `relativePath`-Filter (Prefix-Matching).

### 1.3 Musik-Metadaten-Endpoint (NEU)

```
GET /media/music/library
```

**Response:**
```typescript
interface MusicLibrary {
  artists: ArtistEntry[];
}

interface ArtistEntry {
  name: string;
  albumCount: number;
  albums: AlbumEntry[];
}

interface AlbumEntry {
  name: string;
  artist: string;
  coverFileId: string | null;
  year: number | null;
  tracks: TrackEntry[];
}

interface TrackEntry {
  id: string;
  filename: string;
  title: string | null;
  trackNumber: number | null;
  duration: number | null;
  relativePath: string;
}
```

**Implementierung:**
- `media_files` nach `mimeType LIKE 'audio/%'` filtern
- `relativePath` parsen: `{source}/{artist}/{album}/{track}` → 3 Ebenen
- Cover-Suche: Im Album-Ordner nach `cover.jpg`, `folder.jpg`, `front.jpg` suchen
- Metadaten aus Dateinamen (kein neues Paket): Track-Number aus `{01 - }.mp3` Pattern

### 1.4 Keine DB-Migration

`media_files.relativePath` enthält bereits den vollständigen Pfad. Alle Berechnungen erfolren zur Laufzeit.

---

## 2. Frontend-Architektur

### 2.1 Neue Komponenten-Struktur

```
apps/frontend/src/app/(dashboard)/media/
├── page.tsx                          (existierend — erweitert)
├── components/
│   ├── source-browser/
│   │   ├── SourceBrowser.tsx         (NEU — Tab "Durchsuchen")
│   │   ├── FolderGrid.tsx            (NEU — Ordner + Dateien Grid)
│   │   └── Breadcrumb.tsx            (NEU — Navigation)
│   ├── lightbox/
│   │   ├── MediaLightbox.tsx         (NEU — ersetzt openLightbox)
│   │   ├── ImageSlide.tsx            (NEU — Bild mit Zoom + Stream-URL)
│   │   ├── VideoSlide.tsx            (NEU — Vidstack Video)
│   │   └── SlideshowControls.tsx     (NEU — Diashow-Steuerung)
│   ├── music/
│   │   ├── MusicLibrary.tsx          (NEU — Tab "Musik")
│   │   ├── ArtistCard.tsx            (NEU)
│   │   ├── AlbumView.tsx             (NEU — Cover + Tracklist)
│   │   └── TrackList.tsx             (NEU)
│   └── player/
│       ├── AudioPlayer.tsx           (NEU — Mini-Player, fixed bottom)
│       └── PlayerContext.tsx          (NEU — globaler Player-State)
```

### 2.2 Tab-Erweiterung

Aktuelle Tabs: Quellen | Alben | Galerie | Karte

Neue Tabs: **Quellen | Durchsuchen | Musik | Alben | Galerie | Karte**

### 2.3 State-Management

```typescript
// PlayerContext.tsx — globaler Audio-Player-State
interface PlayerState {
  currentTrack: TrackEntry | null;
  playlist: TrackEntry[];
  isPlaying: boolean;
  volume: number;
  currentTime: number;
  repeat: 'none' | 'one' | 'all';
  shuffle: boolean;
}

// Lightbox-State (lokal in MediaLightbox)
interface LightboxState {
  items: MediaFileSummary[];
  currentIndex: number;
  isSlideshow: boolean;
  slideshowInterval: number; // ms, default 4000
}
```

TanStack Query Keys:
- `['browse', sourceId, path]` — Ordner-Inhalte
- `['music-library']` — Musik-Bibliothek
- `['album', artistName, albumName]` — Album-Details

---

## 3. Ordner-Navigation (P1)

### 3.1 UI-Design

**SourceBrowser.tsx:**
- Dropdown für Quelle wählen
- Breadcrumb: `Fotos > 2024 > Urlaub` (letztes Element ist aktiver Ordner)
- Grid darunter: Ordner als Ordner-Icons (Lucide `Folder`), Dateien als Thumbnails
- Ordner-Click → `setPath(newPath)` → Query `['browse', sourceId, newPath]`
- Zurück-Button im Breadcrumb

### 3.2 Backend-Flow

```
User klickt "Fotos"-Quelle
→ GET /media/sources/{id}/browse?path=/
→ Response: { folders: [...], files: [...] }
→ User klickt "2024"-Ordner
→ GET /media/sources/{id}/browse?path=/2024
→ User klickt "Urlaub"
→ GET /media/sources/{id}/browse?path=/2024/Urlaub
```

### 3.3 Edge Cases

- Leerer Ordner: "Keine Dateien" Message
- Ordner mit 1000+ Dateien: Paginierung (limit/offset)
- Keine Berechtigung: 403 → "Zugriff verweigert" Toast

---

## 4. Lightbox / Bild-Vollansicht (P2)

### 4.1 Fix

**Vorher:** `<img src={thumbnailPath}>` (200px, Qualität 70)
**Nachher:** `<img src={getMediaStreamUrl(file.id)}>`

```typescript
// ImageSlide.tsx
function ImageSlide({ file }: { file: MediaFileSummary }) {
  const src = getMediaStreamUrl(file.id);

  return (
    <div className="relative flex items-center justify-center h-full">
      <img
        src={src}
        alt={file.filename}
        className="max-h-full max-w-full object-contain"
        loading="lazy"
      />
    </div>
  );
}
```

### 4.2 Zoom

- Mausrad: `onWheel` → `scale` State (1x–5x)
- Pinch-to-Zoom: `onTouchStart/Move/End` → Distanz-Berechnung
- Double-Click: Toggle 1x ↔ 2x
- Pan bei Zoom > 1x: `onMouseDown/Move` → Offset

### 4.3 EXIF

- Button "ℹ️" im Lightbox-Header
- Klick → Panel滑出 rechts
- Zeigt: Datum, Kamera, Brennweite, Blende, ISO (aus `media_files` oder via Stream-Headers)

---

## 5. Video-Player (P3)

### 5.1 Integration

```tsx
// VideoSlide.tsx
import { MediaPlayer as VidMediaPlayer, MediaOutlet } from '@vidstack/react';
import '@vidstack/react/player/styles/base.css';
import '@vidstack/react/player/styles/community-skin/video.css';

function VideoSlide({ file }: { file: MediaFileSummary }) {
  const src = getMediaStreamUrl(file.id);

  return (
    <div className="flex items-center justify-center h-full bg-black">
      <VidMediaPlayer src={src} className="w-full h-full">
        <MediaOutlet />
      </VidMediaPlayer>
    </div>
  );
}
```

### 5.2 Erkennung

```typescript
function getSlideComponent(file: MediaFileSummary) {
  if (isVideo(file.mimeType)) return VideoSlide;
  if (isAudio(file.mimeType)) return AudioSlide; // Phase 2
  return ImageSlide;
}
```

### 5.3 Controls

Vidstack Community-Skin liefert: Play/Pause, Timeline, Volume, Fullscreen, PiP. Keine Custom-Controls nötig.

---

## 6. Diashow-Modus (P4)

### 6.1 State-Maschine

```
IDLE → START → PLAYING → PAUSE → PLAYING
                         → STOP → IDLE
                         → NEXT → (Loop)
                         → PREV → (Loop)
```

### 6.2 Implementierung

```typescript
// SlideshowControls.tsx
function SlideshowControls({ state, dispatch }: SlideshowProps) {
  return (
    <div className="flex items-center gap-2">
      <select
        value={state.interval}
        onChange={(e) => dispatch({ type: 'SET_INTERVAL', payload: +e.target.value })}
        className="bg-zinc-800 text-white rounded px-2 py-1 text-sm"
      >
        <option value={2000}>2 Sek.</option>
        <option value={3000}>3 Sek.</option>
        <option value={4000}>4 Sek.</option>
        <option value={5000}>5 Sek.</option>
        <option value={10000}>10 Sek.</option>
      </select>

      {state.isPlaying ? (
        <Button onClick={() => dispatch({ type: 'PAUSE' })}>⏸</Button>
      ) : (
        <Button onClick={() => dispatch({ type: 'START' })}>▶️</Button>
      )}
      <Button onClick={() => dispatch({ type: 'PREV' })}>◀</Button>
      <Button onClick={() => dispatch({ type: 'NEXT' })}>▶</Button>
    </div>
  );
}
```

### 6.3 Timer

```typescript
useEffect(() => {
  if (!isPlaying) return;
  const timer = setInterval(() => {
    dispatch({ type: 'NEXT' });
  }, interval);
  return () => clearInterval(timer);
}, [isPlaying, interval]);
```

### 6.4 Übergänge

CSS-only Fade:
```css
.slide-enter { opacity: 0; }
.slide-enter-active { opacity: 1; transition: opacity 300ms; }
.slide-exit { opacity: 1; }
.slide-exit-active { opacity: 0; transition: opacity 300ms; }
```

Mit `key={currentIndex}` auf dem `<img>` Trigger React-Remount + CSS-Transition.

---

## 7. Musik-UI (P5 + P6 + P7)

### 7.1 Tab "Musik"

**MusicLibrary.tsx:**
- 3-Ebenen-Navigation: Interpreten → Alben → Tracks
- Ansicht 1: Kacheln für Interpreten (Name, Album-Anzahl)
- Ansicht 2: Kacheln für Alben (Cover, Album-Name, Track-Anzahl)
- Ansicht 3: Tracklist Tabelle (Nr., Titel, Dauer)

### 7.2 Album-Ansicht

**AlbumView.tsx:**
- Cover-Bild (groß, links)
- Album-Name, Artist, Jahr
- "Alle abspielen" Button → setzt Playlist + startet ersten Track
- Tracklist: Nummer, Titel (aus Dateiname), Dauer
- Klick auf Track → `playerDispatch({ type: 'PLAY', payload: { track, playlist } })`

### 7.3 Audio-Player (Mini-Player)

**AudioPlayer.tsx** — fixed bottom bar:

```
┌─────────────────────────────────────────────────────────┐
│ [Cover] Artist - Track    ◄◄  ▶/❚❚  ►►  ──●──────────  │
│                                         02:34 / 04:12   │
└─────────────────────────────────────────────────────────┘
```

- Erscheint nur wenn `currentTrack !== null`
- Vidstack `<VidMediaPlayer>` mit Audio-Type (versteckt, nur Controls sichtbar)
- Cover: 48x48px, links
- Track-Info: Name + Artist
- Controls: Zurück, Play/Pause, Weiter
- Timeline: Slider
- Rechts: Volume, Repeat, Shuffle

### 7.4 PlayerContext

```typescript
// PlayerContext.tsx
export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(playerReducer, initialState);

  return (
    <PlayerContext.Provider value={{ state, dispatch }}>
      {children}
      {state.currentTrack && <AudioPlayer />}
    </PlayerContext.Provider>
  );
}
```

### 7.5 Cover-Suche

Im Album-Ordner nach `cover.jpg`, `folder.jpg`, `front.jpg` suchen. Falls gefunden → `getMediaStreamUrl(coverFileId)` als Thumbnail. Falls nicht → Lucide `Music` Icon als Platzhalter.

---

## 8. Datenfluss

### 8.1 Ordner-Browsen

```
SourceBrowser → useQuery(['browse', sourceId, path]) → GET /media/sources/:id/browse?path=...
            → Query Invalidierung bei Quellenwechsel
```

### 8.2 Musik-Library

```
MusicLibrary → useQuery(['music-library']) → GET /media/music/library
AlbumView   → useQuery(['album', artist, album]) → subset aus music-library (Client-seitig)
```

### 8.3 Player

```
TrackList → dispatch({ type: 'PLAY', payload: { track, playlist } })
          → PlayerContext → <AudioPlayer> → Vidstack src={getMediaStreamUrl(track.id)}
```

### 8.4 Optimistic Updates

Keine nötig — alle Operationen sind read-only (kein CRUD für Musik/Ordner in Phase 1).

---

## 9. Edge Cases

| Fall | Lösung |
|------|--------|
| Leerer Ordner | "Dieser Ordner ist leer" + Ordner-Icon |
| Keine Musik-Dateien | Musik-Tab: "Keine Audiodateien gefunden" |
| Kein Cover | Platzhalter-Icon `Music` oder `Folder` |
| Kein Thumbnail für Bild | Stream-URL direkt laden (First-Load verlangsamt sich) |
| Video zu groß für Browser | Vidstack Ladebalken anzeigen |
| Kein `relativePath` auf alter Datei | Fallback: `filename` als Pfad |
| Mobile Touch | Lightbox: Swipe links/rechts für Next/Prev, Pinch-Zoom |
| Kein Auth-Token | Redirect auf Login (401 Handling) |
| Ordner mit 1000+ Dateien | Paginierung: `?limit=50&offset=0` |
| Mischung Ordner+Dateien | Ordner zuerst, dann Dateien sortiert nach Name |

---

## 10. Implementierungs-Reihenfolge (Bottom-up)

### Phase 1A: Backend Foundation (1–2 Tage)
1. `browseSource()` Methode in `media.service.ts`
2. `GET /media/sources/:id/browse` Endpoint
3. `GET /media/music/library` Endpoint
4. Tests für beide Endpoints

### Phase 1B: Ordner-Navigation (1–2 Tage)
5. `SourceBrowser.tsx` + `FolderGrid.tsx` + `Breadcrumb.tsx`
6. Tab "Durchsuchen" in `page.tsx` einfügen
7. Integration mit Backend-Endpoint

### Phase 1C: Lightbox-Fix (1 Tag)
8. `MediaLightbox.tsx` (Bild + Video Detection)
9. `ImageSlide.tsx` mit Stream-URL + Zoom
10. `VideoSlide.tsx` mit Vidstack

### Phase 1D: Diashow (0.5 Tage)
11. `SlideshowControls.tsx`
12. Timer + State-Maschine in `MediaLightbox`
13. CSS-Transitions

### Phase 1E: Musik-UI (2–3 Tage)
14. `PlayerContext.tsx` + `playerReducer`
15. `AudioPlayer.tsx` (Mini-Player)
16. `MusicLibrary.tsx` + `ArtistCard.tsx` + `AlbumView.tsx` + `TrackList.tsx`
17. Tab "Musik" in `page.tsx`
18. Integration mit Music-Library-Endpoint

---

## 11. Was NICHT in Phase 1 kommt

- **Lyrics-Anzeige** (braucht Additional Metadata oder Online-API)
- **Equalizer / Audio-Effects** (Vidstack-beschränkt)
- **Offline-Playback** (Service Worker, komplex)
- **Playlist-Speicherung** (nur In-Memory in Phase 1)
- **M3U/PLS Import** (nice-to-have)
- **Artist-Biografien / Cover-Art von Online-Quellen** (kein API-Key)
- **MIDI-Unterstützung**
- **Podcast-Features** (RSS, Downloads)
- **Foto-EXIF-Editing** (nur Read)
- **Gesichtserkennung / Tagging** (ML, Phase 3+)
- **360°/VR-Viewer**
- **Chromecast / AirPlay**

---

## 12. Zusammenfassung der Änderungen

| Problem | Lösung | Aufwand |
|---------|--------|---------|
| P1: Ordner-Navigation | Neuer Tab "Durchsuchen" + Backend-Browse-Endpoint | Mittel |
| P2: Lightbox-Fix | Stream-URL statt Thumbnail + Zoom | Gering |
| P3: Video-Player | Vidstack-Integration in Lightbox | Gering |
| P4: Diashow | State-Maschine + Timer + CSS-Transitions | Gering |
| P5: Musik-Erkennung | Path-Parsing + Neuer Endpoint + Tab "Musik" | Mittel |
| P6: Album-Ansicht | AlbumView-Komponente | Gering |
| P7: Audio-Player | Vidstack Audio + Mini-Player + PlayerContext | Mittel |

**Gesamtaufwand:** ~7–10 Tage
