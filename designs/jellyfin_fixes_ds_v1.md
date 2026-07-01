# Jellyfin 7-Probleme — Fix-Design v1

Datum: 2026-06-19
Framework: LifeHub UI_UX.md (Dark Default, Amber Brand, shadcn/ui, Tailwind)
Constraints: Keine neuen npm-Pakete, keine neuen DB-Tabellen, TypeScript strict, deutsche UI-Texte

---

## Root Cause Map

```
P1 ─→ ItemsTab flach, kein Folder-Traversal
P2 ─→ getAlbums nutzt ParentId statt ArtistIds → falsche/leere Ergebnisse
P3 ─→ MediaPlayer: CORS, Range-Request-Proxy, Type-Detection
P4 ─→ Kein Image-Preview in ItemCard, keine Lightbox
P5 ─→ Fehlende Slideshow-Komponente
P6 ─→ Gleiche Ursache wie P2 (Artist-Id-Filter falsch)
P7 ─→ MusicPlayer: audio-Element-Events, Format-Erkennung, Playlist-Edge-Cases
```

---

## P1: Ordner-Navigation für Filme/Heimvideos/Fotos

### IST
`LibraryBrowser` (Zeile 1104) routed: `tvshows→SeriesBrowser`, `music→MusicBrowser`, alles andere → `ItemsTab`. `ItemsTab` zeigt nur flache Liste aus lokaler DB. Sync-Ebene 1 speichert nur Items direkt unter der Library (ParentId=libraryId). Ordner/Subfolder werden nicht erfasst.

### Root Cause
- `fetchItemsFromJellyfin()` (jellyfin.service.ts:301) holt nur `/Users/{id}/Items?ParentId={libraryId}` → nur Top-Level
- Kein Frontend-Code, der `/children`-API für Folder-Traversal nutzt
- `JellyfinItem`-Typ hat keinen `IsFolder`-Flag

### Fix

#### Backend — Neuer Endpoint
**`GET /jellyfin/libraries/:serverId/:libraryId/contents`**

Proxy zu Jellyfin: `/Users/{userId}/Items?ParentId={libraryExternalId}&Fields=Path,PrimaryImageAspectRatio,Overview,ProductionYear,IsFolder`

Response:
```ts
interface JellyfinFolderItem {
  Id: string;
  Name: string;
  Type: string;          // 'Folder', 'Movie', 'Video', 'Photo', etc.
  IsFolder: boolean;
  ProductionYear?: number;
  Path?: string;
}
```

#### Backend — `getLibraryContents()` in jellyfin.service.ts
```ts
async getLibraryContents(ownerId: string, serverId: string, libraryExternalId: string): Promise<any[]> {
  const server = await this.repo.findServerById(serverId);
  if (!server || server.ownerId !== ownerId) throw new NotFoundException();
  const userId = await this.getJellyfinUserId(server);
  const data = await this.fetchFromJellyfin(
    server,
    `/Users/${userId}/Items?ParentId=${libraryExternalId}&Fields=Path,PrimaryImageAspectRatio,Overview,ProductionYear`,
  );
  return data.Items ?? [];
}
```

Kein neuer Controller nötig — Umbau des bestehenden `getChildren`-Endpoints oder neuer Query-Parameter.

**Alternativ (weniger Backend-Änderungen):** Bestehenden `GET /jellyfin/items/:id/children` so erweitern, dass er auch Library-IDs akzeptiert. Oder neuen Endpoint `GET /jellyfin/libraries/:id/browse` mit optionalem `?parentId=` für Drill-Down.

**Bevorzugt:** Neuer Endpoint `GET /jellyfin/browse/:serverId?parentId=` mit:
- parentId = library-external-ID → zeigt Library-Root
- parentId = folder-external-ID → zeigt Folder-Inhalt
- parentId = item-external-ID → leer (keine Kinder)

#### Frontend — New `FolderBrowser` Component

Ersetzt `ItemsTab` für Library-Typen `movies`, `homevideos`, `photos`, `books`, `mixed`.

```tsx
function FolderBrowser({
  library,
  server,
  onBack,
}: {
  library: JellyfinLibrary;
  server: JellyfinServer;
  onBack: () => void;
}) {
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(
    library.externalId
  );
  const [breadcrumb, setBreadcrumb] = useState<BreadcrumbItem[]>([
    { id: library.externalId, name: library.name },
  ]);
  const [playingItem, setPlayingItem] = useState<JellyfinApiItem | null>(null);

  // Fetch contents via new API endpoint
  const { data: contents, isLoading } = useQuery({
    queryKey: ['jellyfin-browse', server.id, currentFolderId],
    queryFn: () =>
      api.get<JellyfinApiItem[]>(
        `/jellyfin/browse/${server.id}${currentFolderId ? `?parentId=${currentFolderId}` : ''}`
      ),
  });

  const folders = contents?.filter((c) => c.IsFolder) ?? [];
  const items = contents?.filter((c) => !c.IsFolder) ?? [];
  const isPhotoLib = library.type === 'photos';
  const isVideoLib = ['movies', 'homevideos'].includes(library.type ?? '');

  // render: Breadcrumb + Grid (folders as folder-cards + items as item-cards)
  // Photo items → click opens lightbox
  // Video items → click opens MediaPlayer
  // Media items → click opens MediaPlayer
}
```

**Grid-Layout:**
- Ordner: 4:3-Kacheln mit `FolderOpen`-Icon, nur Name
- Items: 2:3-Poster-Kacheln (bestehendes `ItemCard`-Design)
- Photos: 1:1-Quadrat-Kacheln mit Image-Thumbnail

**Breadcrumb:**
- Bestehender `FolderBreadcrumb` (Zeile 1074) mit `ChevronRight`
- Klick auf Breadcrumb-Item → navigiert zu dem Ordner
- Breadcrumb wird bei Folder-Wechsel aktualisiert

**Card-Layout pro Item-Typ:**

| Typ | Card-Format | Thumbnail | Klick-Aktion | Hover-Overlay |
|-----|-------------|-----------|-------------|---------------|
| Folder | `aspect-[4/3]`, Ordner-Icon | FolderOpen-Icon | Navigieren | — |
| Movie/Episode/Video | `aspect-[2/3]`, Poster | JellyfinImage primary | MediaPlayer | Play-Button |
| Photo | `aspect-square`, Thumbnail | JellyfinImage primary | Lightbox | Vergrößerungsglas |
| Audio | `aspect-[2/3]`, Icon | Music-Icon | MusicPlayer | Play-Button |

---

## P2: Musik-Interpreten zeigen falsche Inhalte

### IST
`getAlbums()` (jellyfin.service.ts:218) ruft auf:
```
/Users/{userId}/Items?ParentId={artistId}&IncludeItemTypes=MusicAlbum
```

### Root Cause
`ParentId={artistId}` filtert nach Jellyfin-interner Parent-Child-Beziehung. Bei `/Artists/AlbumArtists` gelieferte Artists haben **keine** Parent-Child-Beziehung zu ihren Alben. Stattdessen müssen **ArtistIds** (Array) verwendet werden.

Jellyfin korrekt:
```
/Users/{userId}/Items?ArtistIds={artistId}&IncludeItemTypes=MusicAlbum&Fields=Path,PrimaryImageAspectRatio,Overview,ProductionYear&SortBy=ProductionYear,SortName
```

Bei Verwendung von `ParentId` returned Jellyfin entweder alle Items (weil Artist kein Folder ist) oder gar nichts — je nach Jellyfin-Version. Das erklärt "AC/DC zeigt Filme": Der Fallback gibt alle Library-Items zurück.

### Fix

**jellyfin.service.ts:218** — `getAlbums()` ändern:
```ts
async getAlbums(ownerId: string, serverId: string, artistId: string): Promise<any[]> {
  const server = await this.repo.findServerById(serverId);
  if (!server || server.ownerId !== ownerId) throw new NotFoundException();
  const userId = await this.getJellyfinUserId(server);
  const data = await this.fetchFromJellyfin(
    server,
    `/Users/${userId}/Items?ArtistIds=${artistId}&IncludeItemTypes=MusicAlbum&Fields=Path,PrimaryImageAspectRatio,Overview,ProductionYear&SortBy=ProductionYear,SortName&SortOrder=Descending,Ascending`,
  );
  return data.Items ?? [];
}
```

**Zusätzlich: Frontend-Debug**
- `MusicBrowser` (Zeile 1298) album-View: im Fehlerfall die API-Response loggen
- Sicherstellen, dass `albums` nicht die gesamte Library-Items enthält
- Album-Artwork via `JellyfinImage` mit `AlbumId` (korrekt, schon implementiert)

---

## P3: Videos können nicht abgespielt werden

### IST
`MediaPlayer` (Zeile 946) erzeugt:
```
http://localhost:3007/api/v1/jellyfin/items/{id}/stream?token={jwt}
```
Vidstack `<VidMediaPlayer>` erhält `src={{ src: streamUrl, type: 'video/mp4' }}`.

### Mögliche Root Causes

1. **CORS:** Stream-Controller hat `OPTIONS`-Handler, aber Vidstack sendet ggf. andere Origin/Headers. `corsHeaders()` erlaubt nur `http://localhost:3001`. Produktion nutzt anderen Port/Tailscale-URL.

2. **Range-Requests:** Vidstack sendet `Range`-Header, der Proxy leitet an Jellyfin weiter. Jellyfin returned `206 Partial Content`. Der Proxy muss `206` genauso behandeln wie `200` — tut er (Zeile 132).

3. **Content-Type:** Vidstack `type: 'video/mp4'` ist hardcoded. Wenn Jellyfin andere Container liefert (mkv, webm), schlägt der Player fehl.

4. **Transfer-Encoding:** Zeile 82 löscht `transfer-encoding`, aber wenn Jellyfin `chunked` sendet und der Proxy `Content-Length` nicht setzt, kann der Player das Stream-Ende nicht erkennen.

5. **Port-Hardcoding:** MediaPlayer nutzt hardcoded `:3007` statt der konfigurierten API-Port. In Produktion könnte der API-Port abweichen.

### Fix-Plan

**Fix 1 — CORS:** `corsHeaders()` dynamisch aus Request-Origin oder Konfiguration:
```ts
function corsHeaders(origin?: string): OutgoingHttpHeaders {
  const allowed = origin && origin !== 'null' ? origin : 'http://localhost:3001';
  return {
    'Access-Control-Allow-Origin': allowed,
    ...
  };
}
```
(Bereits so implementiert, aber prüfen ob `origin` korrekt von Vidstack gesendet wird)

**Fix 2 — Content-Type dynamisch:** Backend soll korrektes Content-Type vom Jellyfin-Response übernehmen, nicht hardcoded `'video/mp4'`:

`getExternalStream()` (Zeile 229): Bereits korrekt — `mimeType` wird aus mediaType-Param bestimmt. Aber `getItemStream()` (Zeile 110) übernimmt MimeType aus Jellyfin-Response → korrekt.

**Fix 3 — Port:** `window.location.hostname` + `:3007` → ersetzen durch konfigurierbare API-Base-URL:
```ts
const apiHost = process.env.NEXT_PUBLIC_API_URL ?? `http://localhost:3007`;
const streamUrl = `${apiHost}/api/v1/jellyfin/items/${item.id}/stream?token=${encodeURIComponent(accessToken)}`;
```

**Fix 4 — Community-Skin CSS:** Prüfen ob `vidstack/styles/community-skin/video.css` korrekt importiert ist (Zeile 17). Fehlender Import → Player unsichtbar.

**Fix 5 — Vidstream-Type:** `stream-type="unknown"` (Zeile 1023) kann zu Buffer-Issues führen. Versuchen `stream-type="unknown"` zu entfernen oder auf `"live"` zu setzen.

**Fix 6 — Error-Handling:** Aktuell wird `onError` nur per `setLoaded(true)` + `setError()` behandelt. Vidstack wirft oft nicht-fatale Async-Channel-Fehler (deswegen `PlayerErrorBoundary`). Debug-Output hinzufügen um echte Fehler zu sehen:
```tsx
const handleError = (e: any) => {
  console.error('[MediaPlayer] Vidstack error:', e);
  setError('Medien konnte nicht geladen werden. Prüfe Server-Erreichbarkeit.');
};
```

---

## P4: Bilder können nicht normal angeguckt werden

### IST
- Photos in `ItemsTab`: Karte mit `ImageIcon`-Platzhalter (Zeile 819), kein Thumbnail
- `MediaPlayer` kann Photo via `<img>` + Stream-URL anzeigen (Zeile 1054-1063)
- Aber `ItemCard` zeigt kein Vorschaubild

### Root Cause
- `JellyfinItem` in der lokalen DB hat keinen `externalId`-Bezug für Image-Proxy
- `ItemCard` hat kein Image-Loading für Photo-Items
- Kein Lightbox-Viewer für Photo-Betrachtung

### Fix

**Fix 1 — Image-Proxy-Endpoint (Backend):**
```
GET /jellyfin/items/:id/image
```
Proxy zu Jellyfin: `/Items/{externalId}/Images/Primary?maxWidth=300&quality=90`
Auth: Bearer Token (via `extractToken` aus Stream-Controller)

Alternative: Bestehenden `getItemStream` für Photos nutzen (funktioniert bereits: `mimeType: 'image/jpeg'`). Frontend kann für Photos den Stream-URL direkt als `<img src>` nutzen.

**Fix 2 — ItemCard Thumbnail für Photos:**
```tsx
// In ItemCard, if item.type === 'photo'
const thumbnailUrl = `${apiHost}/api/v1/jellyfin/items/${item.id}/stream?token=${encodeURIComponent(accessToken)}`;

// Replace icon fallback with img:
{isPhoto && (
  <img src={thumbnailUrl} alt={item.name}
    className="h-full w-full object-cover group-hover:scale-105 transition-transform"
    loading="lazy"
    onError={(e) => { /* fallback to icon */ }}
  />
)}
```

**Fix 3 — Lightbox-Komponente:**

```tsx
function PhotoLightbox({
  photos,
  initialIndex,
  onClose,
}: {
  photos: JellyfinApiItem[];
  initialIndex: number;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(initialIndex);
  const currentPhoto = photos[index];

  // KeyHandler: ArrowLeft/Right prev/next, Escape close
  // Zoom: Mausrad, Pinch-to-Zoom (CSS transform: scale)
  // Fullscreen: requestFullscreen API
  // Image: <img src={streamUrl} className="max-h-screen max-w-full object-contain" />

  // Bottom: Photo counter "3 / 15", filename, prev/next buttons
}
```

**Integration in FolderBrowser:**
- Photo-Item-Klick → `setLightboxOpen(true)` + `useState<JellyfinApiItem[]>(contents.filter(isPhoto))`
- Alle Photos der aktuellen Ansicht als Slideshow-Quelle

---

## P5: Diashow-Modus

### IST
Nicht vorhanden.

### Fix — `PhotoSlideshow` Component

```tsx
function PhotoSlideshow({
  photos,
  initialIndex,
  interval = 5, // Sekunden
  onClose,
}: {
  photos: JellyfinApiItem[];
  initialIndex: number;
  interval?: number;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(initialIndex);
  const [playing, setPlaying] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    if (playing) {
      timerRef.current = setInterval(() => {
        setIndex((i) => (i + 1) % photos.length);
      }, interval * 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [playing, interval, photos.length]);

  // Fullscreen-Overlay
  // Controls: Pause/Play, Prev/Next, Speed-Selector
  // Image: <img src={streamUrl} className="max-h-screen max-w-full object-contain" />
  // Transition: CSS opacity fade zwischen Bildern
  // Info-Overlay: Dateiname, Zähler "7 / 42"

  return (
    <div className="fixed inset-0 z-50 bg-black" onClick={onClose}>
      {/* Fullscreen image */}
      <img
        key={currentPhoto.Id}
        src={streamUrl}
        className="max-h-screen max-w-full object-contain mx-auto"
      />
      {/* Controls (auto-hide after 3s) */}
      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-6">
        {/* Play/Pause, Prev/Next, Counter, Interval-Selector */}
      </div>
    </div>
  );
}
```

**Integration:**
- In `FolderBrowser`: Button "Diashow starten" wenn Library-Type = `photos`
- Nimmt alle aktuell sichtbaren Photos (gefiltert + sortiert)
- Kann auch aus Lightbox heraus gestartet werden ("Diashow" Button in Lightbox-Controls)

---

## P6: Musik-Alben können nicht geöffnet werden

### IST
`MusicBrowser` (Zeile 1298) 3-Level: Artists → Albums → Songs. Album-View existiert (Zeile 1399) und zeigt Alben als klickbare Karten.

### Root Cause
Gleicher Bug wie P2: `getAlbums()` nutzt `ParentId={artistId}` statt `ArtistIds={artistId}`. Wenn der Endpoint leere oder falsche Daten liefert, sieht die Album-Ansicht leer aus oder zeigt die falschen Alben.

### Fix
Siehe P2-Fix: `ArtistIds` statt `ParentId` im `getAlbums()`-Endpoint.

**Zusätzlich:**
- Album-Cover via `JellyfinImage` mit `Album.Id` (bereits korrekt in Zeile 1417-1424)
- Songs unter einem Album via `GET /jellyfin/servers/:serverId/items/:albumId/children` (bereits korrekt, Zeile 1329)
- `getExternalChildren` (jellyfin.service.ts:196) ruft korrekt `/Users/{userId}/Items?ParentId={albumId}` auf

**Debug-Check:**
- Im MusicBrowser, `albums`-Query: Response-Logging für `albums` und `artists` hinzufügen
- Prüfen ob `albums.length === 0` oder ob falsche Items zurückkommen
- Wenn `albums.length > 0` → P6 ist eigentlich schon gelöst, dann liegt der Bug im Frontend (falscher State-Übergang)

---

## P7: Songs/Alben können nicht abgespielt werden

### IST
`MusicPlayer` (Zeile 1503) nutzt verstecktes `<audio>`-Element mit:
```tsx
<audio ref={audioRef} src={streamUrl} preload="auto" className="hidden" />
```
Stream-URL: `/jellyfin/servers/{serverId}/items/{trackId}/stream?type=Audio&token={jwt}`

### Root Causes

1. **Kein Autoplay:** Nach Track-Wechsel muss `audio.load()` gefolgt von `audio.play()` aufgerufen werden. Aktuell wird nur `audio.load()` aufgerufen (Zeile 1604), aber kein explizites `.play()` nach Track-Wechsel.

2. **Event-Registry:** `useEffect` abhängig von `[currentTrack.Id]` (Zeile 1614). Bei Track-Wechsel: Alte Event-Listener werden entfernt, neue hinzugefügt. Aber `audio.load()` triggert `loadedmetadata` → `.play()` wird nur im `onMeta`-Handler aufgerufen (Zeile 1588) — **aber nur bei initialem Laden**. Bei Track-Wechsel wird `audioRef.current` beibehalten, daher bleibt `onMeta` registered und funktioniert.

3. **Audio-Format:** Backend `getExternalStream()` hardcoded `mimeType: 'audio/mpeg'`. Jellyfin könnte FLAC, OGG, oder andere Formate streamen. Der Browser `<audio>`-Element unterstützt mehrere Formate, aber `Content-Type` muss korrekt sein.

4. **Volume-Persistence:** `volume` State initialisiert mit `0.8` (Zeile 1514). Setzt `audioRef.current.volume = volume` nur via `useEffect([volume])` (Zeile 1616-1620). OK.

5. **Progress-Bar:** `currentTime` und `duration` werden via `timeupdate`- und `loadedmetadata`-Events gesetzt (Zeile 1587-1588). OK.

6. **Play-State-Desync:** `onPlay`/`onPause`-Events (Zeile 1591-1592) syncen `playing`-State. Aber initialer `playing`-State ist `false` (Zeile 1511). Beim ersten Laden → `loadedmetadata` → `audio.play()` → `onPlay`-Event → `setPlaying(true)`. OK.

### Fix-Plan

**Fix 1 — Explizites Play nach Track-Wechsel:**
Nach `audio.load()` → warten auf `canplay`-Event → `.play()`:
```ts
const onCanPlay = () => {
  audio.play().catch(() => setError('Wiedergabe fehlgeschlagen'));
};
audio.addEventListener('canplay', onCanPlay);
```

**Fix 2 — Audio-Format korrekt setzen:**
Backend `getExternalStream()` MIME-Type aus Jellyfin-Response übernehmen (wie `getItemStream()` bereits tut), nicht hardcoded:
```ts
const mimeType = jellyfinRes.headers.get('content-type') ?? 'audio/mpeg';
```

**Fix 3 — Error-Reporting verbessern:**
```ts
const onError = () => {
  const mediaError = audio.error;
  const msg = mediaError
    ? `Audio-Fehler: ${mediaError.code} — ${mediaError.message}`
    : 'Audio konnte nicht geladen werden';
  setError(msg);
};
```

**Fix 4 — Abspiel-Start nach Track-Wechsel:**
Nach `setIndex()` → `audio.src` ändert sich → `load()` wird getriggert → wir brauchen explizites Play. Aktuell geschieht das nur bei `loadedmetadata` (Zeile 1588), was ein Timeout-Problem haben kann.

Alternative: `useEffect` auf `currentTrack.Id` erweitern mit:
```ts
// Am Ende des Effekts:
const playPromise = audio.play();
if (playPromise !== undefined) {
  playPromise.catch(() => {
    // Browser blockiert Autoplay — User muss klicken
    setPlaying(false);
  });
}
```

**Fix 5 — Repeat-One bei aktuellem Track:**
`nextTrackFn` (Zeile 1554): Bei `repeat === 'one'` wird `currentTime = 0` gesetzt und `return`. Danach muss `audio.play()` aufgerufen werden, sonst bleibt Audio pausiert.
```ts
if (repeat === 'one') {
  if (audioRef.current) {
    audioRef.current.currentTime = 0;
    audioRef.current.play().catch(() => {});
  }
  return;
}
```

---

## Zusammenfassung Backend-Änderungen

| File | Änderung | Für |
|------|---------|-----|
| `jellyfin.service.ts:218` | `getAlbums()`: `ParentId` → `ArtistIds` | P2, P6 |
| `jellyfin.service.ts:229` | `getExternalStream()`: MIME-Type aus Jellyfin-Response | P7 |
| `jellyfin.service.ts:neu` | `getLibraryContents()`: neuer Endpoint für Folder-Browsing | P1 |
| `jellyfin.controller.ts:neu` | `GET /jellyfin/browse/:serverId?parentId=` | P1 |
| `jellyfin-stream.controller.ts` | CORS-Origin dynamisch (produktionstauglich) | P3 |

## Zusammenfassung Frontend-Änderungen

| File | Änderung | Für |
|------|---------|-----|
| `page.tsx:1104` | `LibraryBrowser`: `FolderBrowser` für movies/homevideos/photos/books | P1 |
| `page.tsx:neu` | `FolderBrowser`-Komponente (parallel zu SeriesBrowser/MusicBrowser) | P1 |
| `page.tsx:946` | `MediaPlayer`: Port dynamisch, CORS-freundlich, Error-Debug | P3 |
| `page.tsx:807` | `ItemCard`: Photo-Thumbnail via Stream-URL | P4 |
| `page.tsx:neu` | `PhotoLightbox`-Komponente | P4 |
| `page.tsx:neu` | `PhotoSlideshow`-Komponente | P5 |
| `page.tsx:1503` | `MusicPlayer`: Autoplay-Fix, Repeat-One-Fix, MIME-Typ | P7 |

## Keine Änderungen an
- DB-Schema (keine neuen Tabellen/Spalten)
- Dependencies (keine neuen Pakete)
- Auth-Flow (JWT-Token bleibt)
- Sync-Mechanismus (bleibt wie ist — Items in lokaler DB sind nur Top-Level)
- Permissions
- Audit-Logging
