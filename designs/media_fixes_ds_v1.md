# Media Domain: Folder Browsing, Playback & Slideshow — Design Spec v1

Erstellt: 2026-06-19
Status: Entwurf
Basiert auf: `designs/media_fixes_prompt.md`

---

## Inhaltsverzeichnis

1. [Backend-Änderungen](#1-backend-änderungen)
2. [Frontend-Architektur](#2-frontend-architektur)
3. [Ordner-Navigation (A1)](#3-ordner-navigation-a1)
4. [Lightbox/Player (A2 + A3)](#4-lightboxplayer-a2--a3)
5. [Slideshow (A4)](#5-slideshow-a4)
6. [Musik-UI (A5 + A6)](#6-musik-ui-a5--a6)
7. [Audio-Player (A7)](#7-audio-player-a7)
8. [Datenfluss](#8-datenfluss)
9. [Edge Cases](#9-edge-cases)
10. [Implementierungs-Reihenfolge](#10-implementierungs-reihenfolge)
11. [Nicht in Phase 1](#11-nicht-in-phase-1)

---

## 1. Backend-Änderungen

### 1.1 Neuer Endpoint: `GET /media/sources/:id/browse`

Zweck: Ordner-Inhalte einer Quelle abrufen (Dateien + Unterordner) für den neuen "Durchsuchen"-Tab.

**Controller** (`media.controller.ts`):

```
GET /media/sources/:id/browse?path=
  - Guard: JwtGuard + PermissionGuard (media:read)
  - Query-Parameter: path (string, optional, default "")
  - Response: {
      folders: { name: string; path: string; itemCount: number }[]
      files: MediaFile[]
    }
  - Permission: media:read
```

**DTO** (`media.dto.ts`):

```typescript
const browseSourceSchema = z.object({
  path: z.string().max(1024).default(''),
});
type BrowseSourceDto = z.infer<typeof browseSourceSchema>;

interface BrowseResult {
  folders: Array<{ name: string; path: string; itemCount: number }>;
  files: MediaFile[];
}
```

**Service** (`media.service.ts`):

Neue Methode `browseSource(ownerId: string, sourceId: string, relativeDir: string): Promise<BrowseResult>`:

1. Holt die Source via `repo.findSourceById()` — 404 wenn nicht gefunden
2. Baut `fullDirPath = path.join(source.path, relativeDir)`
3. Prüft `fs.existsSync(fullDirPath)` — 404 wenn nicht existiert
4. Listet Directory via `fs.readdirSync(fullDirPath, { withFileTypes: true })`
5. Filtert:
   - **Unterordner**: `entry.isDirectory() && !entry.name.startsWith('.')`
   - **Dateien**: `entry.isFile() && MEDIA_EXTENSIONS.has(ext)`
6. Für jeden Unterordner: zählt enthaltene Mediendateien (rekursiv bis Tiefe 2) via `walkDirectory`-ähnlichem Helper
7. Für Dateien: Query aus DB via `repo.findFilesBySourceAndRelativePaths(sourceId, paths[])` — NEU

**Repository** (`media.repository.ts`):

Neue Methode `findFilesBySourceAndPaths(sourceId: string, relativePaths: string[])`:

```typescript
async findFilesBySourceAndPaths(sourceId: string, relativePaths: string[]): Promise<MediaFile[]> {
  if (relativePaths.length === 0) return [];
  return this.db.select().from(mediaFiles)
    .where(and(
      eq(mediaFiles.sourceId, sourceId),
      inArray(mediaFiles.relativePath, relativePaths),
      isNull(mediaFiles.deletedAt),
    ))
    .orderBy(asc(mediaFiles.filename));
}
```

Optimierung: Batch-Query statt N Einzel-Queries.

### 1.2 Neuer Endpoint: `GET /media/music/artists`

```
GET /media/music/artists?sourceId=
  - Response: { name: string; albumCount: number }[]
```

Logik: Parst `relativePath` nach Muster `{Artist}/{Album}/{Track}` für Dateien mit `mimeType.startsWith('audio/')`.

### 1.3 Neuer Endpoint: `GET /media/music/albums`

```
GET /media/music/albums?artist=InterpretName&sourceId=
  - Response: {
      name: string;
      artist: string;
      trackCount: number;
      coverUrl: string | null;
    }[]
```

Logik: Gruppiert Audio-Dateien nach `{Artist}/{Album}`-Pfad-Muster. Prüft auf `cover.jpg`/`folder.jpg` im Album-Ordner.

### 1.4 Neuer Endpoint: `GET /media/music/tracks`

```
GET /media/music/tracks?artist=InterpretName&album=AlbumName&sourceId=
  - Response: MediaFile[] (gefiltert auf Audio-Dateien, sortiert nach filename)
```

Logik: `relativePath LIKE '${artist}/${album}/%'` + `mimeType.startsWith('audio/')`.

### 1.5 Stream-Endpunkt

Keine Änderung nötig — `GET /media/files/:id/stream?token=` funktioniert bereits für Audio via Range-Requests.

### 1.6 Datenmodell: Keine Migration

Keine neuen DB-Tabellen. Ordner-Struktur wird aus `media_files.relativePath` abgeleitet. Musik-Metadaten (Interpret, Album) werden aus dem Pfad geparst.

---

## 2. Frontend-Architektur

### 2.1 Neue Komponenten-Struktur

Die aktuelle `page.tsx` (1711 Zeilen) wird in separate Dateien aufgeteilt:

```
apps/frontend/src/app/(dashboard)/media/
├── page.tsx                    ← reduziert auf Tabs + Imports
├── MapContent.tsx              ← bereits existiert
├── browse-tab.tsx              ← NEU: Ordner-Navigation
├── music-tab.tsx               ← NEU: Musik-Ansicht
├── lightbox.tsx                ← NEU: Ausgelagerte Lightbox (bisher inline)
├── mini-player.tsx             ← NEU: Audio-Mini-Player (fixed bottom)
├── types.ts                    ← NEU: Alle Media-Typen (bisher inline)
```

### 2.2 Neue Tabs

```typescript
type TabId = 'sources' | 'albums' | 'gallery' | 'map' | 'browse' | 'music';

const TABS = [
  { id: 'sources', label: 'Quellen', icon: <FolderOpen /> },
  { id: 'albums', label: 'Alben', icon: <Image /> },
  { id: 'gallery', label: 'Galerie', icon: <Camera /> },
  { id: 'browse', label: 'Durchsuchen', icon: <FolderTree /> },   // NEU
  { id: 'music', label: 'Musik', icon: <Music /> },               // NEU
  { id: 'map', label: 'Karte', icon: <MapPin /> },
];
```

Lucide-Icons: `FolderTree`, `Music`, `Play`, `SkipBack`, `SkipForward`, `Shuffle`, `Repeat`, `ListMusic`, `Album`, `Mic2`, `Slideshow`, `ZoomIn`, `Info`, `Maximize2`, `Minimize2`, `Pause`.

### 2.3 State-Flow Übersicht

```
MediaPage (Zustand)
├── activeTab: TabId
├── showSourceModal: boolean
├── showAlbumModal: boolean
│
├── BrowseTab (eigener State)
│   ├── sourceId: string | null
│   ├── currentPath: string (relativer Pfad, default "")
│   ├── breadcrumbs: { name, path }[]
│   ├── folders: BrowseFolder[]
│   └── files: MediaFile[]
│
├── MusicTab (eigener State)
│   ├── selectedArtist: string | null
│   ├── selectedAlbum: string | null
│   ├── artists: ArtistInfo[]
│   ├── albums: AlbumInfo[]
│   └── tracks: MediaFile[]
│
├── GalleryTab (unverändert)
│   └── lightboxFile -> Lightbox-Komponente
│       └── slideshowActive, slideshowInterval
│
└── MiniPlayer (global, immer sichtbar wenn aktiv)
    ├── queue: MediaFile[]
    ├── currentIndex: number
    ├── isPlaying: boolean
    ├── volume: number
    └── isShuffled: boolean
```

### 2.4 MiniPlayer-Zustand (Zustand Store)

```typescript
// apps/frontend/src/lib/player-store.ts
interface PlayerState {
  queue: MediaFile[];
  currentIndex: number;
  isPlaying: boolean;
  volume: number;
  isShuffled: boolean;
  repeatMode: 'none' | 'one' | 'all';

  play: (file: MediaFile, queue?: MediaFile[]) => void;
  togglePlay: () => void;
  next: () => void;
  prev: () => void;
  setVolume: (v: number) => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  clear: () => void;
}
```

---

## 3. Ordner-Navigation (A1)

### 3.1 API-Design

**Request:**
```
GET /api/v1/media/sources/:id/browse?path=2024/Urlaub
```

**Response:**
```json
{
  "folders": [
    { "name": "Strand", "path": "2024/Urlaub/Strand", "itemCount": 12 },
    { "name": "Hotel", "path": "2024/Urlaub/Hotel", "itemCount": 8 }
  ],
  "files": [
    { "id": "uuid", "filename": "IMG_001.jpg", "relativePath": "2024/Urlaub/IMG_001.jpg", "mimeType": "image/jpeg", "width": 4000, "height": 3000, "thumbnailPath": "...", "isFavorite": false, "takenAt": "2024-07-15T..." }
  ]
}
```

**Backend-Logik (`browseSource`):**

```
1. source = repo.findSourceById(sourceId, ownerId)
2. fullDir = path.join(source.path, relativeDir)
3. fs.existsSync(fullDir) -> 404 wenn nicht
4. entries = fs.readdirSync(fullDir, { withFileTypes: true })

5. folders = []
   for each entry:
     if entry.isDirectory() && !entry.name.startsWith('.'):
       relativePath = relativeDir ? `${relativeDir}/${entry.name}` : entry.name
       count = countMediaRecursive(path.join(fullDir, entry.name))
       folders.push({ name: entry.name, path: relativePath, itemCount: count })

6. fileEntries = []
   for each entry:
     if entry.isFile():
       ext = path.extname(entry.name).slice(1).toLowerCase()
       if MEDIA_EXTENSIONS.has(ext):
         fileEntries.push(relativeDir ? `${relativeDir}/${entry.name}` : entry.name)

7. files = repo.findFilesBySourceAndPaths(sourceId, fileEntries)

8. return { folders, files }
```

### 3.2 UI-Design

**BrowseTab-Komponente:**

```
┌─────────────────────────────────────────────┐
│  [Dropdown: Quelle wählen]                  │
│                                             │
│  Breadcrumb: Quelle > 2024 > Urlaub         │
│                                             │
│  ┌───────── Grid / ──────────┐              │
│  │ Ordner 1  │  Ordner 2     │  Ordner 3    │
│  │ (12)      │  (8)          │  (5)         │
│  ├───────────┼───────────────┤              │
│  │ Datei 1   │  Datei 2      │  Datei 3     │
│  └───────────┴───────────────┘              │
└─────────────────────────────────────────────┘
```

**Komponenten-Hierarchie:**

```
BrowseTab
├── SourceSelector (Dropdown, filtert Quellen)
├── BreadcrumbNav
│   └── BreadcrumbSegment (klickbar: Quelle > 2024 > Urlaub)
├── ViewToggle (Grid/List)
├── Ordner-Grid (2-4 Spalten)
│   └── FolderCard
│       ├── FolderIcon (Lucide `Folder`)
│       ├── Name
│       └── ItemCount ("12 Dateien")
└── Dateien-Grid (2-4 Spalten)
    └── FileCard (identisch zur Galerie-Thumbnail)
```

**Breadcrumb-Logik:**

```
currentPath = "2024/Urlaub/Strand"
segments = [
  { name: source.name, path: "" },
  { name: "2024", path: "2024" },
  { name: "Urlaub", path: "2024/Urlaub" },
  { name: "Strand", path: "2024/Urlaub/Strand" },
]
// Letztes Segment = aktuell (nicht klickbar)
```

**Klick-Verhalten:**
- Ordner → `currentPath = folder.path`, Query neu laden, Breadcrumb aktualisieren
- Bild → Lightbox mit Dateien des aktuellen Ordners als Kontext
- Video → Lightbox mit Vidstack-Player
- Audio → MiniPlayer mit Queue = alle Audio-Dateien des Ordners

### 3.3 Query-Strategie

```typescript
const { data, isLoading } = useQuery({
  queryKey: ['media-browse', sourceId, currentPath],
  queryFn: () => {
    const params = new URLSearchParams({ path: currentPath });
    return api.get<BrowseResult>(`/media/sources/${sourceId}/browse?${params}`);
  },
  staleTime: 30_000,
});

interface BrowseFolder {
  name: string;
  path: string;
  itemCount: number;
}

interface BrowseResult {
  folders: BrowseFolder[];
  files: MediaFile[];
}
```

---

## 4. Lightbox/Player (A2 + A3)

### 4.1 Entscheidungsmatrix

| MIME-Typ | Rendering | Komponente |
|----------|-----------|------------|
| `image/*` | `<img>` mit Stream-URL | `ImageContent` |
| `video/*` | `<VidMediaPlayer>` | `VideoContent` |
| `audio/*` | Fallback auf MiniPlayer (keine Lightbox) | — |
| sonstige | Fallback: Datei-Info anzeigen | `FallbackContent` |

### 4.2 Neue Lightbox-Architektur (`lightbox.tsx`)

```typescript
function Lightbox({
  files,           // alle Dateien im aktuellen Kontext (für Navigation)
  initialIndex,    // Start-Index
  onClose,
}: {
  files: MediaFile[];
  initialIndex: number;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(initialIndex);
  const currentFile = files[index];

  const [slideshowActive, setSlideshowActive] = useState(false);
  const [slideshowInterval, setSlideshowInterval] = useState(4000);
  const [showInfo, setShowInfo] = useState(false);
  const [zoom, setZoom] = useState(1);

  return (
    <div className="fixed inset-0 z-50 bg-black/90">
      <button onClick={onClose}><X /></button>
      {index > 0 && <button onClick={prev}><ChevronLeft /></button>}
      {index < files.length - 1 && <button onClick={next}><ChevronRight /></button>}

      {isImage(currentFile.mimeType) && (
        <ImageContent file={currentFile} zoom={zoom} onZoomChange={setZoom} />
      )}
      {isVideo(currentFile.mimeType) && (
        <VideoContent file={currentFile} />
      )}
      {!isImage(currentFile.mimeType) && !isVideo(currentFile.mimeType) && (
        <FallbackContent file={currentFile} />
      )}

      <LightboxToolbar
        file={currentFile}
        hasPrev={index > 0}
        hasNext={index < files.length - 1}
        onPrev={prev}
        onNext={next}
        slideshowActive={slideshowActive}
        onToggleSlideshow={() => setSlideshowActive(!slideshowActive)}
        showInfo={showInfo}
        onToggleInfo={() => setShowInfo(!showInfo)}
      />
      {showInfo && <InfoPanel file={currentFile} onClose={() => setShowInfo(false)} />}
    </div>
  );
}
```

### 4.3 ImageContent (A2 — Bild-Vollansicht)

```typescript
function ImageContent({ file, zoom, onZoomChange }: {
  file: MediaFile;
  zoom: number;
  onZoomChange: (z: number) => void;
}) {
  const handleWheel = (e: React.WheelEvent) => {
    if (e.deltaY < 0) onZoomChange(Math.min(zoom * 1.1, 5));
    else onZoomChange(Math.max(zoom / 1.1, 0.5));
  };

  return (
    <div className="flex items-center justify-center w-full h-full" onWheel={handleWheel}>
      <img
        src={getMediaStreamUrl(file.id)}  // FIX: Nutzt Stream statt thumbnailPath
        alt={file.filename}
        className="max-h-[90vh] max-w-[90vw] object-contain transition-transform duration-200"
        style={{ transform: `scale(${zoom})` }}
        draggable={false}
      />
    </div>
  );
}
```

**Wichtige Änderung:** Bild-URL ist `getMediaStreamUrl(file.id)` statt `file.thumbnailPath`.

**Zoom per Mausrad:** Range 0.5x–5x. Reset auf 1x bei Doppelklick oder Bildwechsel.

### 4.4 VideoContent (A3 — Video-Player)

```typescript
import { MediaPlayer as VidMediaPlayer, MediaOutlet } from '@vidstack/react';
import 'vidstack/styles/base.css';
import 'vidstack/styles/community-skin/video.css';

function VideoContent({ file }: { file: MediaFile }) {
  const streamUrl = getMediaStreamUrl(file.id);

  return (
    <div className="flex items-center justify-center w-full h-full p-4">
      <VidMediaPlayer
        src={{ src: streamUrl, type: file.mimeType }}
        controls
        autoPlay
        className="max-h-[85vh] max-w-[90vw] rounded-lg"
        loading="eager"
        stream-type="unknown"
      >
        <MediaOutlet />
      </VidMediaPlayer>
    </div>
  );
}
```

**MIME-Type Mapping:** Kein Mapping nötig — Vidstack akzeptiert `video/mp4`, `video/webm`, `video/ogg`, `video/x-matroska` direkt.

### 4.5 InfoPanel (EXIF + Metadaten)

```typescript
function InfoPanel({ file, onClose }: { file: MediaFile; onClose: () => void }) {
  const { data: tags } = useQuery({
    queryKey: ['media-file-tags', file.id],
    queryFn: () => api.get<MediaFileTag[]>(`/media/files/${file.id}/tags`),
  });

  return (
    <div className="absolute right-0 top-0 bottom-0 w-80 bg-black/80 backdrop-blur p-4 overflow-y-auto">
      <button onClick={onClose}><X /></button>
      <h3>Info</h3>
      <dl>
        <dt>Datei</dt><dd>{file.filename}</dd>
        <dt>Auflösung</dt><dd>{file.width} × {file.height}</dd>
        <dt>Typ</dt><dd>{file.mimeType}</dd>
        <dt>Größe</dt><dd>{formatFileSize(file.fileSize)}</dd>
        <dt>Aufnahme</dt><dd>{formatDate(file.takenAt)}</dd>
        <dt>GPS</dt><dd>{file.gpsLat}, {file.gpsLng}</dd>
        <dt>Tags</dt><dd>{tags?.map(t => <TagBadge key={t.tagId} tag={t} />)}</dd>
      </dl>
    </div>
  );
}
```

### 4.6 Keyboard-Shortcuts (erweitert für Slideshow)

| Taste | Aktion |
|-------|--------|
| `Escape` | Lightbox schließen |
| `←` / `→` | Vorheriges/Nächstes Bild |
| `Space` | Slideshow Play/Pause |
| `+` / `-` | Zoom rein/raus |
| `i` | Info-Panel togglen |
| `f` | Fullscreen (Browser-API) |

---

## 5. Slideshow (A4)

### 5.1 State-Machine

```
[Idle] → (Button "Diashow") → [Playing]
[Playing] → (Space / Button "Pause") → [Paused]
[Playing] → (letztes Bild erreicht) → [Idle] oder [Loop] (konfigurierbar)
[Paused] → (Space / Button "Play") → [Playing]
[Playing/Paused] → (Escape) → [Idle] + Lightbox schließen
```

### 5.2 Timer-Logik

```typescript
function useSlideshow(
  isActive: boolean,
  interval: number,        // ms, default 4000
  onNext: () => void,
  filesLength: number,
  currentIndex: number,
) {
  useEffect(() => {
    if (!isActive) return;
    if (currentIndex >= filesLength - 1) return;
    const timer = setInterval(onNext, interval);
    return () => clearInterval(timer);
  }, [isActive, interval, currentIndex, filesLength, onNext]);
}
```

### 5.3 Slideshow-Steuerung (UI)

```
┌──────────────────────────────────────────────┐
│  ⏮  ⏸  ⏭  |  Intervall: [4s ▼]  |  ❌     │
│  Links  Play Rechts  2s/4s/6s/8s/10s  Close  │
└──────────────────────────────────────────────┘
```

Positioniert als Overlay in der Lightbox-Toolbar (unten zentriert).

### 5.4 Übergänge (CSS-only)

```css
.slideshow-image {
  transition: opacity 0.4s ease-in-out;
}
```

In Phase 1: nur Fade-Übergang.

### 5.5 Slideshow-Einstiegs-Punkte

1. **Lightbox-Toolbar** — alle Bilder des aktuellen Kontexts
2. **BrowseTab-Button** — "Diashow" oberhalb des Grids, alle Bilder des Ordners
3. **GalleryTab-Button** — "Diashow", alle gefilterten Bilder

---

## 6. Musik-UI (A5 + A6)

### 6.1 Pfad-Parsing (Backend)

```
relativePath: "Metallica/Master of Puppets/01_Battery.mp3"
→ artist: "Metallica"
→ album: "Master of Puppets"
```

**Helper-Funktion:**

```typescript
function parseAudioPath(relativePath: string): { artist: string; album: string } | null {
  const parts = relativePath.replace(/\\/g, '/').split('/');
  if (parts.length < 2) return null;
  if (parts.length >= 3) {
    return { artist: parts[parts.length - 3], album: parts[parts.length - 2] };
  }
  return { artist: 'Unbekannt', album: parts[parts.length - 2] };
}
```

### 6.2 Neue Backend-Methoden

**`getMusicArtists(ownerId, sourceId?)`**:

```typescript
async getMusicArtists(ownerId: string, sourceId?: string): Promise<ArtistInfo[]> {
  const files = await this.repo.findAudioFiles(ownerId, sourceId);
  const artistMap = new Map<string, Set<string>>();
  for (const file of files) {
    const parsed = parseAudioPath(file.relativePath);
    if (parsed) {
      if (!artistMap.has(parsed.artist)) artistMap.set(parsed.artist, new Set());
      artistMap.get(parsed.artist)!.add(parsed.album);
    }
  }
  return Array.from(artistMap.entries())
    .map(([name, albums]) => ({ name, albumCount: albums.size }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
```

**`getMusicAlbums(ownerId, artist, sourceId?)`**:

```typescript
async getMusicAlbums(ownerId: string, artist: string, sourceId?: string): Promise<AlbumInfo[]> {
  const files = await this.repo.findAudioFiles(ownerId, sourceId);
  const albumMap = new Map<string, MediaFile[]>();
  for (const file of files) {
    const parsed = parseAudioPath(file.relativePath);
    if (parsed && parsed.artist === artist) {
      if (!albumMap.has(parsed.album)) albumMap.set(parsed.album, []);
      albumMap.get(parsed.album)!.push(file);
    }
  }
  return Promise.all(Array.from(albumMap.entries()).map(async ([name, tracks]) => {
    const coverUrl = await this.findAlbumCover(tracks[0], artist, name);
    return { name, artist, trackCount: tracks.length, coverUrl };
  })).then(albums => albums.sort((a, b) => a.name.localeCompare(b.name)));
}
```

**`findAlbumCover(referenceFile, artist, album)`**:

```typescript
private async findAlbumCover(referenceFile: MediaFile, artist: string, album: string): Promise<string | null> {
  const parts = referenceFile.relativePath.replace(/\\/g, '/').split('/');
  const albumDir = parts.slice(0, -1).join('/');
  const coverNames = ['cover.jpg', 'cover.jpeg', 'cover.png', 'folder.jpg', 'folder.jpeg', 'folder.png'];
  for (const coverName of coverNames) {
    const coverPath = albumDir ? `${albumDir}/${coverName}` : coverName;
    const existing = await this.repo.findFileBySourceAndPath(referenceFile.sourceId, coverPath);
    if (existing) return getMediaStreamUrl(existing.id);
  }
  return null;
}
```

**Repository: `findAudioFiles`**:

```typescript
async findAudioFiles(ownerId: string, sourceId?: string): Promise<MediaFile[]> {
  const conditions = [
    eq(mediaFiles.ownerId, ownerId),
    isNull(mediaFiles.deletedAt),
    sql`${mediaFiles.mimeType} LIKE 'audio/%'`,
  ];
  if (sourceId) conditions.push(eq(mediaFiles.sourceId, sourceId));
  return this.db.select().from(mediaFiles)
    .where(and(...conditions))
    .orderBy(asc(mediaFiles.relativePath));
}
```

### 6.3 Neue API-Controller (`media-music.controller.ts`)

```typescript
@Controller('media/music')
@UseGuards(JwtGuard, PermissionGuard)
export class MediaMusicController {
  constructor(@Inject(MediaService) private readonly media: MediaService) {}

  @Get('artists')
  @Permissions('media:read')
  async getArtists(@CurrentUser() user: JwtPayload, @Query('sourceId') sourceId?: string) {
    return this.media.getMusicArtists(user.sub, sourceId);
  }

  @Get('albums')
  @Permissions('media:read')
  async getAlbums(@CurrentUser() user: JwtPayload, @Query('artist') artist: string, @Query('sourceId') sourceId?: string) {
    return this.media.getMusicAlbums(user.sub, artist, sourceId);
  }

  @Get('tracks')
  @Permissions('media:read')
  async getTracks(@CurrentUser() user: JwtPayload, @Query('artist') artist: string, @Query('album') album: string, @Query('sourceId') sourceId?: string) {
    return this.media.getMusicTracks(user.sub, artist, album, sourceId);
  }
}
```

**Module-Update:**

```typescript
@Module({
  providers: [MediaRepository, MediaService],
  controllers: [MediaController, MediaStreamController, MediaMusicController],
  exports: [MediaService],
})
export class MediaModule {}
```

### 6.4 UI: Musik-Tab (Drei-Ebenen-Navigation)

```
Ebene 1: Künstler-Liste
┌───────────────────────────────────────┐
│  [Dropdown: Quelle wählen]            │
│                                       │
│  ┌────────── ──────────── ───────────┐│
│  │ 🎤 Metallica            (5 Alben) ││
│  │ 🎤 Radiohead            (3 Alben) ││
│  │ 🎤 Klassik               (1 Album)││
│  │ 🎤 Unbekannt            (2 Alben) ││
│  └────────────────────────────────────┘│
└───────────────────────────────────────┘

Ebene 2: Alben des Künstlers
┌───────────────────────────────────────┐
│  < Zurück  |  Metallica               │
│                                       │
│  ┌──────┐ ┌──────┐ ┌──────┐          │
│  │ Cover│ │ Cover│ │ Cover│          │
│  │ Master│ │ ...AJ│ │ Load │          │
│  │ Puppet│ │  ... │ │  ... │          │
│  └──────┘ └──────┘ └──────┘          │
└───────────────────────────────────────┘

Ebene 3: Tracklist eines Albums
┌───────────────────────────────────────┐
│  < Zurück  |  Master of Puppets       │
│                                       │
│  ┌──────┐                             │
│  │ Cover│  Metallica                  │
│  │      │  Master of Puppets          │
│  └──────┘  1986 · 8 Tracks            │
│                                       │
│  [▶ Alle abspielen]                   │
│                                       │
│  01. Battery                  3:45  ▶ │
│  02. Master of Puppets        4:22  ▶ │
│  03. ...                              │
└───────────────────────────────────────┘
```

**Komponenten-Hierarchie:**

```
MusicTab
├── SourceSelector (Dropdown)
├── ArtistList (Ebene 1)
│   └── ArtistRow (Mic2-Icon, Name, AlbumCount)
├── AlbumGrid (Ebene 2)
│   ├── BackButton + ArtistHeader
│   └── AlbumCard (CoverImage/Fallback, AlbumName, TrackCount)
└── AlbumDetail (Ebene 3)
    ├── BackButton + AlbumHeader (Cover + Metadaten)
    ├── PlayAllButton
    └── TrackList → TrackRow (TrackNumber, Title, Duration, PlayButton)
```

### 6.5 Album-Cover-Anzeige

```typescript
function AlbumCover({ coverUrl, albumName, size = 'md' }: {
  coverUrl: string | null;
  albumName: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const sizeClasses = { sm: 'w-12 h-12', md: 'w-32 h-32', lg: 'w-48 h-48' };
  if (coverUrl) {
    return <img src={coverUrl} alt={albumName} className={`${sizeClasses[size]} rounded-lg object-cover shadow-lg`} />;
  }
  return (
    <div className={`${sizeClasses[size]} rounded-lg bg-gradient-to-br from-brand-500/20 to-purple-500/20 flex items-center justify-center border border-border`}>
      <Music className="h-8 w-8 text-fg-muted" />
    </div>
  );
}
```

---

## 7. Audio-Player (A7)

### 7.1 MiniPlayer-Komponente

```typescript
// mini-player.tsx
import { MediaPlayer as VidMediaPlayer, MediaOutlet } from '@vidstack/react';
import 'vidstack/styles/base.css';
import 'vidstack/styles/community-skin/audio.css';

function MiniPlayer() {
  const { queue, currentIndex, isPlaying, togglePlay, next, prev, volume, setVolume, clear } = usePlayerStore();
  const currentFile = queue[currentIndex];
  if (!currentFile || queue.length === 0) return null;

  const streamUrl = getMediaStreamUrl(currentFile.id);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-bg-surface/95 backdrop-blur">
      <div className="mx-auto max-w-6xl flex items-center gap-4 px-4 py-2">
        <div className="w-10 h-10 rounded bg-gradient-to-br from-brand-500/20 to-purple-500/20 flex items-center justify-center shrink-0">
          <Music className="h-5 w-5 text-fg-muted" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate">{currentFile.filename.replace(/\.[^.]+$/, '')}</p>
          <p className="text-xs text-fg-muted truncate">{currentIndex + 1}/{queue.length}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={prev} className="p-1 text-fg-muted hover:text-fg"><SkipBack className="h-5 w-5" /></button>
          <button onClick={togglePlay} className="rounded-full bg-brand-500 p-2 text-bg hover:bg-brand-400">
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </button>
          <button onClick={next} className="p-1 text-fg-muted hover:text-fg"><SkipForward className="h-5 w-5" /></button>
        </div>
        <div className="hidden">
          <VidMediaPlayer
            src={{ src: streamUrl, type: currentFile.mimeType }}
            controls={false}
            autoPlay={isPlaying}
            volume={volume}
            onEnded={next}
            onPlay={() => usePlayerStore.getState().setPlaying(true)}
            onPause={() => usePlayerStore.getState().setPlaying(false)}
          >
            <MediaOutlet />
          </VidMediaPlayer>
        </div>
        <button onClick={clear} className="p-1 text-fg-muted hover:text-fg"><X className="h-4 w-4" /></button>
      </div>
    </div>
  );
}
```

### 7.2 Player-Store (Zustand)

```typescript
// apps/frontend/src/lib/player-store.ts
import { create } from 'zustand';

interface PlayerFileInfo {
  id: string;
  filename: string;
  mimeType: string;
}

interface PlayerState {
  queue: PlayerFileInfo[];
  currentIndex: number;
  isPlaying: boolean;
  volume: number;
  isShuffled: boolean;
  repeatMode: 'none' | 'one' | 'all';

  play: (file: PlayerFileInfo, queue?: PlayerFileInfo[]) => void;
  togglePlay: () => void;
  setPlaying: (v: boolean) => void;
  next: () => void;
  prev: () => void;
  setVolume: (v: number) => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  clear: () => void;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  queue: [],
  currentIndex: -1,
  isPlaying: false,
  volume: 0.8,
  isShuffled: false,
  repeatMode: 'none',

  play: (file, newQueue) => {
    const queue = newQueue ?? [file];
    const index = queue.findIndex(f => f.id === file.id);
    set({ queue, currentIndex: index >= 0 ? index : 0, isPlaying: true });
  },
  togglePlay: () => set(s => ({ isPlaying: !s.isPlaying })),
  setPlaying: (v) => set({ isPlaying: v }),
  next: () => {
    const { queue, currentIndex, repeatMode } = get();
    if (repeatMode === 'one') { set({ isPlaying: true }); return; }
    const nextIndex = currentIndex + 1;
    if (nextIndex >= queue.length) {
      if (repeatMode === 'all') set({ currentIndex: 0, isPlaying: true });
      else set({ isPlaying: false });
    } else set({ currentIndex: nextIndex, isPlaying: true });
  },
  prev: () => {
    const { currentIndex } = get();
    if (currentIndex > 0) set({ currentIndex: currentIndex - 1, isPlaying: true });
  },
  setVolume: (v) => set({ volume: Math.max(0, Math.min(1, v)) }),
  toggleShuffle: () => set(s => ({ isShuffled: !s.isShuffled })),
  cycleRepeat: () => set(s => ({
    repeatMode: s.repeatMode === 'none' ? 'all' : s.repeatMode === 'all' ? 'one' : 'none',
  })),
  clear: () => set({ queue: [], currentIndex: -1, isPlaying: false }),
}));
```

### 7.3 Integration in MediaPage

```typescript
export default function MediaPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* tabs, content */}
      <MiniPlayer /> {/* Global, immer sichtbar */}
    </div>
  );
}
```

Der MiniPlayer ist außerhalb der Tab-Selection und bleibt sichtbar während Tab-Wechseln.

---

## 8. Datenfluss

### 8.1 Query-Keys Übersicht

| Query-Key | Endpoint | Beschreibung | Stale Time |
|-----------|----------|--------------|------------|
| `['media-sources']` | `GET /media/sources` | Quellen-Liste | 30s |
| `['media-browse', sourceId, path]` | `GET /media/sources/:id/browse?path=` | Ordner-Inhalt | 30s |
| `['media-files', sourceId, favFilter]` | `GET /media/files` | Galerie-Dateien | 10s |
| `['media-files-gps']` | `GET /media/files?limit=500` | GPS-Dateien (Map) | 30s |
| `['media-files-all']` | `GET /media/files?limit=500` | Alle Dateien (Album-Dialog) | 30s |
| `['media-albums']` | `GET /media/albums` | Alben-Liste | 30s |
| `['media-album-files', albumId]` | `GET /media/albums/:id/media` | Album-Dateien | 10s |
| `['media-file-tags', fileId]` | `GET /media/files/:id/tags` | Tags einer Datei | 30s |
| `['media-music-artists', sourceId]` | `GET /media/music/artists` | Musik-Interpreten | 60s |
| `['media-music-albums', artist, sourceId]` | `GET /media/music/albums` | Alben eines Interpreten | 60s |
| `['media-music-tracks', artist, album, sourceId]` | `GET /media/music/tracks` | Tracks eines Albums | 60s |
| `['media-tags']` | `GET /media/tags` | Alle Tags | 30s |

### 8.2 Mutation-Invalidierung

| Mutation | Invalidierte Keys |
|----------|-------------------|
| `POST /media/sources/:id/index` | `['media-sources']`, `['media-files']`, `['media-browse']` |
| `POST /media/files/:id/favorite` | `['media-files']`, `['media-album-files']`, `['media-files-gps']`, `['media-browse']` |
| `POST /media/albums/:id/items` | `['media-album-files']`, `['media-albums']` |
| `DELETE /media/sources/:id` | `['media-sources']` |
| `POST /media/files/:id/tags` | `['media-file-tags']`, `['media-tags']` |
| `DELETE /media/files/:id/tags/:tagId` | `['media-file-tags']` |

### 8.3 Optimistic Updates

Nicht nötig in Phase 1 — Daten sind lokal (NAS), Latenz niedrig.

### 8.4 Datenfluss-Diagramm (Ordner-Navigation)

```
User wählt Quelle
  → Query: ['media-browse', sourceId, '']
  → Backend: browseSource(ownerId, sourceId, '')
  → Response: { folders: [...], files: [...] }

User klickt auf Ordner "2024"
  → setCurrentPath('2024')
  → Query: ['media-browse', sourceId, '2024']
  → Breadcrumb: [Quelle, 2024]

User klickt auf Datei (Bild)
  → setLightboxFile(file)
  → setLightboxFiles(files) // alle Dateien des aktuellen Ordners
  → Lightbox geöffnet
```

### 8.5 Datenfluss-Diagramm (Musik-Navigation)

```
User wählt Quelle (optional)
  → Query: ['media-music-artists', sourceId]
  → Response: [{ name: 'Metallica', albumCount: 5 }, ...]

User klickt auf "Metallica"
  → setSelectedArtist('Metallica')
  → Query: ['media-music-albums', 'Metallica', sourceId]
  → Response: [{ name: 'Master of Puppets', trackCount: 8, coverUrl: ... }, ...]

User klickt auf Album "Master of Puppets"
  → setSelectedAlbum('Master of Puppets')
  → Query: ['media-music-tracks', 'Metallica', 'Master of Puppets', sourceId]
  → Response: MediaFile[]

User klickt auf Track "▶" oder "Alle abspielen"
  → playerStore.play(track, allTracks)
  → MiniPlayer erscheint
```

---

## 9. Edge Cases

### 9.1 Leere Ordner

- BrowseTab: Ordner ohne Mediendateien mit `itemCount: 0` anzeigen, klickbar → Hinweis "Dieser Ordner enthält keine Mediendateien."

### 9.2 Quelle leer / nicht indexiert

- BrowseTab: Source-Selector zeigt nur Quellen mit `lastIndexedAt !== null`.
- Error-State: "Diese Quelle wurde noch nicht indexiert. Scanne sie zuerst im Reiter 'Quellen'."

### 9.3 Musik ohne Album-Cover

- `AlbumCover` zeigt Fallback-Gradient mit `Music`-Icon.
- Keine DB-Queries für nicht-existente Cover.

### 9.4 Musik ohne Ordner-Struktur (flache Dateien)

- `parseAudioPath()` gibt `null` bei < 2 Pfad-Segmenten.
- Diese Dateien unter "Unbekannt" → "Unbekanntes Album" gruppiert.

### 9.5 Mobile (Touch + kleine Bildschirme)

- MiniPlayer: < 640px → Track-Info reduziert, Cover kleiner.
- Lightbox: Prev/Next als 50% hohe Touch-Ziele.
- Slideshow: Touch-Geste "Streichen" via `onTouchEnd` X-Delta.
- BrowseTab: Breadcrumb scrollbar (`overflow-x-auto`).
- Grid: `grid-cols-2` Mobile, `grid-cols-4` Desktop.

### 9.6 Große Ordner (> 100 Dateien)

- Kein Server-Pagination in Phase 1. Falls nötig: `?limit=50&offset=` später ergänzbar.

### 9.7 Sonderzeichen in Pfaden

- Breadcrumb: `text-overflow: ellipsis` für lange Segmente.
- `encodeURIComponent()` für alle Pfad-Parameter.

### 9.8 Audio-Dateien ohne Duration

- `file.duration` ist `number | undefined`. Fallback: "--:--" in Tracklist.

### 9.9 Slideshow mit gemischten Inhalten

- Phase 1: Slideshow zeigt NUR Bilder, Videos werden übersprungen.
- `files.filter(f => isImage(f.mimeType))` für die Slideshow-Queue.

---

## 10. Implementierungs-Reihenfolge

**Prinzip:** Bottom-up, keine Abhängigkeit auf nicht gebaute Features.

### Phase 1a: Backend (Voraussetzung)

| Schritt | Beschreibung | Dateien |
|---------|-------------|---------|
| 1 | `browseSource()` Service-Methode | `media.service.ts` |
| 2 | `findFilesBySourceAndPaths()` Repository | `media.repository.ts` |
| 3 | Browse-Endpoint `GET /media/sources/:id/browse` | `media.controller.ts`, `media.dto.ts` |
| 4 | `findAudioFiles()` + `getMusicArtists/Albums/Tracks()` | `media.repository.ts`, `media.service.ts` |
| 5 | Music-Controller `GET /media/music/*` | `media-music.controller.ts` (neu) |
| 6 | Module aktualisieren | `media.module.ts` |

### Phase 1b: Frontend — Lightbox-Fix + Video

| Schritt | Beschreibung | Dateien |
|---------|-------------|---------|
| 7 | `types.ts` extrahieren | `media/types.ts` |
| 8 | `getMediaStreamUrl()` für Bilder nutzen | `page.tsx` (Lightbox) |
| 9 | Lightbox auslagern: Bild-Content mit Stream-URL | `media/lightbox.tsx` |
| 10 | Vidstack-Video-Player in Lightbox | `media/lightbox.tsx` |
| 11 | Zoom per Mausrad | `media/lightbox.tsx` |
| 12 | Info-Panel (EXIF + Tags) | `media/lightbox.tsx` |

### Phase 1c: Frontend — BrowseTab

| Schritt | Beschreibung | Dateien |
|---------|-------------|---------|
| 13 | `browse-tab.tsx`: Source-Selector, Breadcrumb, Grids | `media/browse-tab.tsx` |
| 14 | Tab `browse` in TABS + Conditional Rendering | `page.tsx` |
| 15 | Lightbox-Integration (Klick auf Datei) | `browse-tab.tsx`, `page.tsx` |

### Phase 1d: Frontend — Slideshow

| Schritt | Beschreibung | Dateien |
|---------|-------------|---------|
| 16 | `useSlideshow`-Hook (Timer, Play/Pause) | `media/lightbox.tsx` |
| 17 | Slideshow-Steuerung in Lightbox-Toolbar | `media/lightbox.tsx` |
| 18 | Fade-Übergang (CSS) | `media/lightbox.tsx` oder `globals.css` |
| 19 | "Diashow"-Button in GalleryTab + BrowseTab | `page.tsx`, `browse-tab.tsx` |

### Phase 1e: Frontend — Musik + Audio-Player

| Schritt | Beschreibung | Dateien |
|---------|-------------|---------|
| 20 | `player-store.ts` (Zustand) | `lib/player-store.ts` |
| 21 | `mini-player.tsx` mit Vidstack Audio | `media/mini-player.tsx` |
| 22 | MiniPlayer in `page.tsx` rendern | `page.tsx` |
| 23 | `music-tab.tsx`: Artist-Liste, Album-Grid, Tracklist | `media/music-tab.tsx` |
| 24 | Tab `music` in TABS | `page.tsx` |
| 25 | "Play" / "Alle abspielen" → MiniPlayer | `music-tab.tsx` |

### Reihenfolge-Risiken

- **Keine Abhängigkeiten:** Phase 1a kann unabhängig gebaut und getestet werden.
- Slideshow braucht Lightbox (Ph1b) → kommt danach.
- MiniPlayer ist unabhängig von MusicTab, aber MusicTab triggert ihn → Reihenfolge egal.

---

## 11. Nicht in Phase 1

### 11.1 Backend

| Feature | Grund |
|---------|-------|
| DB-Migration für Music-Felder (artist, album, trackNumber) | Wird aus Pfad geparst |
| Server-seitige Playlist-Verwaltung | Queue lebt im Client |
| Rekursive Ordner-Zählung mit Caching | Wird live berechnet |
| Fulltext-Suche auf Server-Seite | Client `filter()` reicht |
| Audio-Tag-Parsing (ID3, FLAC-Metadaten) | Würde neue Library brauchen |
| Transcoding (Video/Audio-Stream-Adaption) | NAS hat genug Bandbreite |
| Cover-Art-Extraktion aus Audio-Dateien | Würde neue Library brauchen |
| Downloads von Medien | Nicht gefordert |
| Teilen von Playlists/Alben | Nicht gefordert |
| Equalizer / Audio-Effekte | Nicht gefordert |
| Subtitle-Support für Videos | Nicht gefordert |

### 11.2 Frontend

| Feature | Grund |
|---------|-------|
| List-View im BrowseTab | Grid reicht |
| Drag & Drop in Alben | Nicht gefordert |
| Bulk-Edit (Tags, Favoriten) | Nicht gefordert |
| Video-Thumbnails (FFmpeg) | Nicht im Stack |
| EXIF-Bearbeitung | Nicht gefordert |
| Musik-Playlist-Persistenz | Nicht gefordert |
| Shuffle-Implementierung | MiniPlayer zeigt Button, Logik deaktiviert |
| Audio-Visualizer | Nicht gefordert |
| Lyrics-Anzeige | Nicht gefordert |
| Letztes-Video-Position-Merken | Nicht gefordert |
| Tastatur-Shortcut-Helper ("?"-Overlay) | Nice-to-have |

### 11.3 Mobile/Responsive

| Feature | Grund |
|---------|-------|
| PWA-Manifest + Service Worker | Nicht gefordert |
| Touch-Gesten in Lightbox | Phase 1: nur Keyboard + Buttons |
| Bottom-Sheet statt Modal | Bestehende Modals funktionieren |
| Mobile-optimierte Tab-Leiste | Bestehende passt |

---

## Änderungsprotokoll

| Datum | Version | Änderung |
|-------|---------|----------|
| 2026-06-19 | v1 | Initiale Version — alle 7 Probleme adressiert |

---

*Design-Dokument erstellt gemäß `designs/media_fixes_prompt.md`.*
*Stack: NestJS 10 + Drizzle ORM | Next.js 14 + Tailwind + TanStack Query + Zustand | Vidstack 0.6.15*
