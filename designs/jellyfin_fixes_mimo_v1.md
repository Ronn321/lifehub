# Jellyfin Page Fixes — Design (mimo v1)

> **Status:** Entwurf  
> **Quelle:** `jellyfin_fixes_prompt.md`  
> **Code-Basis:** `page.tsx` (1768 Z.), `jellyfin.controller.ts` (104 Z.), `jellyfin.service.ts` (326 Z.)

---

## Problemübersicht

| # | Problem | Schwere | Komponente betroffen |
|---|---------|---------|----------------------|
| P1 | Filme/Heimvideos/Fotos: keine Ordner-Navigation | hoch | `LibraryBrowser`, `ItemsTab` |
| P2 | Musik-Interpreten zeigen falsche Inhalte | hoch | `MusicBrowser`, Sync-Logik |
| P3 | Videos nicht abspielbar | hoch | `MediaPlayer` (Vidstack) |
| P4 | Bilder keine Vollansicht | mittel | `ItemsTab`, `MediaPlayer` |
| P5 | Kein Diashow-Modus | mittel | fehlt komplett |
| P6 | Musik-Alben nicht öffnbar | mittel | `MusicBrowser` (songs-Level) |
| P7 | Songs/Alben nicht abspielbar | hoch | `MusicPlayer` |

---

## P1: Ordner-Browser für movies, homevideos, photos, books

### Ist-Zustand

`LibraryBrowser` (Zeile 1104-1116) dispatched nur `tvshows` und `music`:
```ts
if (library.type === 'tvshows') return <SeriesBrowser ... />;
if (library.type === 'music') return <MusicBrowser ... />;
return <ItemsTab ... />;  // ← flache Liste für ALLES andere
```

`ItemsTab` (Zeile 686) lädt ALLE Items einer Library flach via `GET /jellyfin/items?libraryId=` und zeigt sie als Grid. Keine Ordner-Navigation, keine Hierarchie.

Jellyfin liefert aber hierarchische Strukturen: Library → Folder → Items. Die API `GET /jellyfin/items/:id/children` und `GET /jellyfin/servers/:serverId/items/:externalId/children` existieren bereits im Backend.

### Konzept: `FolderBrowser` Component

**Neue Komponente** `FolderBrowser` ersetzt `ItemsTab` für `movies`, `homevideos`, `photos`, `books`, `mixed`.

**State-Modell:**
```ts
type FolderViewState =
  | { level: 'root' }                                    // Zeigt Library-Inhalt
  | { level: 'folder'; folderId: string; folderName: string }; // Zeigt Ordner-Inhalt
```

**Datenfluss:**
1. **Root-Ebene:** `GET /jellyfin/items?libraryId={id}` — zeigt alle Items der Library
2. **Ordner-Ebene:** `GET /jellyfin/servers/{serverId}/items/{externalId}/children` — zeigt Kinder des Ordners
3. Ordner werden anhand von `item.type === 'folder'` erkannt (Jellyfin-Type)
4. Dateien werden als Karten angezeigt (mit Bild-Preview wenn möglich)

**Breadcrumb-Navigation:**
```
Filme > Action > 2024 > ...
```
Wiederverwendet existierende `FolderBreadcrumb` (Zeile 1074).

**UI-Grid:**
- Ordner: Karten mit Ordner-Icon + Name + Kinder-Anzahl
- Dateien: Karten mit Jellyfin-Image (wenn `item.externalId` vorhanden) oder Typ-Icon
- Klick auf Ordner → Navigation in Ordner
- Klick auf Datei → entsprechende Aktion (Player für Video/Audio, Lightbox für Foto)

**Änderung in `LibraryBrowser`:**
```ts
function LibraryBrowser({ library, server, onBack }) {
  if (library.type === 'tvshows') return <SeriesBrowser ... />;
  if (library.type === 'music') return <MusicBrowser ... />;
  return <FolderBrowser library={library} server={server} onBack={onBack} />;
}
```

**Backend:** Keine Änderungen nötig. `GET /jellyfin/servers/:serverId/items/:externalId/children` existiert bereits (Zeile 76-85 Controller, Zeile 196-209 Service). Der Endpoint ruft `fetchJellyfinChildren` auf, was `/Users/{id}/Items?ParentId={externalId}` aufruft.

### Dateien
- Neu: `FolderBrowser` in `page.tsx` (ca. 150-200 Zeilen)
- Geändert: `LibraryBrowser` (1 Zeile: `ItemsTab` → `FolderBrowser`)
- `ItemsTab` kann entfernt werden (wird nicht mehr referenziert)

---

## P2: Musik-Interpreten zeigen falsche Inhalte

### Ist-Zustand

Backend:
- `GET /jellyfin/artists?serverId=` → ruft `/Artists/AlbumArtists` auf (Zeile 211-216)
- `GET /jellyfin/albums?serverId=&artistId=` → ruft `/Users/{id}/Items?ParentId={artistId}&IncludeItemTypes=MusicAlbum` auf (Zeile 218-227)

Frontend `MusicBrowser`:
- Artists-Level: `useQuery(['jellyfin-artists', server.id])` → `GET /jellyfin/artists?serverId=` ✅
- Albums-Level: `useQuery(['jellyfin-albums', server.id, artistId])` → `GET /jellyfin/albums?serverId=&artistId=` ✅

**Bug-Analyse:** Die API-Aufrufe korrekt aus. Der Bug liegt wahrscheinlich in einem dieser Bereiche:

1. **Sync-Problem:** `fetchItemsFromJellyfin` (Zeile 301-311) lädt ALLE Items einer Library flach. Bei Music-Libraries werden auch `Audio`, `MusicAlbum`, `MusicArtist` gespeichert. Wenn `ItemsTab` (jetzt `FolderBrowser`) fälschlicherweise auf eine Music-Library zugreift, zeigt es alle Items — inkl. Alben und Songs, die wie "Filme" aussehen könnten (wenn der Type falsch gespeichert wird).

2. **Type-Mapping:** In `fetchItemsFromJellyfin` Zeile 308: `type: item.Type?.toLowerCase() ?? 'unknown'`. Jellyfin liefert z.B. `MusicAlbum`, `MusicArtist`, `Audio`. Das `.toLowerCase()` ergibt `musicalbum`, `musica`, `audio`. Das ist korrekt.

3. **Wahrscheinlichste Ursache:** Die `MusicBrowser`-Komponente funktioniert korrekt ( Artists → Albums → Songs ). Das Problem ist, dass der User eventuell die **falsche Library** öffnet. Wenn eine Music-Library als `mixed` typisiert ist oder der Sync Items aus anderen Libraries混入, zeigt `ItemsTab`/`FolderBrowser` falsche Inhalte.

### Konzept: Debug + Safety

1. **In `FolderBrowser`:** Nur Items mit passendem Typ anzeigen. Für `music`-Libraries: nur `audio`, `musicalbum`, `musica`, `musicartist` zeigen. Für `movies`: nur `movie`, `video`. Für `photos`: nur `photo`, `image`.

2. **Type-Filter in `FolderBrowser`:**
```ts
const ALLOWED_TYPES: Record<string, string[]> = {
  movies: ['movie', 'video', 'folder'],
  music: ['audio', 'musicalbum', 'musica', 'musicartist', 'folder'],
  photos: ['photo', 'image', 'folder'],
  homevideos: ['video', 'movie', 'folder'],
  books: ['book', 'folder'],
};
```

3. **Visuelle Debug-Info:** Im `MusicBrowser` das Album-Level zeigt zusätzlich den Artist-Namen und die Album-ID als Tooltip — hilft beim Debuggen.

4. **Sync-Einschränkung:** Optional: Bei `syncServer` nur Items speichern, deren Typ zur Library-Passt. Das verhindert Fehlinhalte in der DB.

### Dateien
- Geändert: `FolderBrowser` (Type-Filter-Logik)
- Geändert: `jellyfin.service.ts` (optional: Sync-Filterung nach Library-Type)

---

## P3: Videos nicht abspielbar

### Ist-Zustand

`MediaPlayer` (Zeile 946-1068) verwendet Vidstack:
```tsx
<VidMediaPlayer
  src={{ src: streamUrl, type: 'video/mp4' }}
  controls
  autoPlay
  className="max-h-[80vh] w-full"
  stream-type="unknown"
  onLoadedData={() => setLoaded(true)}
  onError={handleError}
>
  <MediaOutlet />
</VidMediaPlayer>
```

Stream-URL: `/jellyfin/servers/{serverId}/items/{externalId}/stream?type=Video&token=`

Backend `getExternalStream` (Zeile 229-271):
- Baut URL: `{baseUrl}/Videos/{externalId}/stream?audioCodec=aac&audioBitRate=320000&enableAutoStreamCopy=true&Container=mp4`
- Leitet `Range`-Header weiter
- Gibt Stream + Response-Headers zurück

**Mögliche Bugs:**

1. **`stream-type="unknown"`** — Vidstream braucht ggf. expliziten `stream-type="on-demand"` für HTTP-Range-Streaming. `unknown` könnte Probleme mit Seeking verursachen.

2. **Fehlende CORS/Content-Type Headers:** Das Backend leitet Jellyfin-Response-Headers weiter, aber `transfer-encoding` wird gelöscht (Zeile 260). Möglicherweise fehlt `content-length` oder `accept-ranges`.

3. **Vidstack-Importe:** Zeile 15-17:
```ts
import { MediaPlayer as VidMediaPlayer, MediaOutlet } from '@vidstack/react';
import 'vidstack/styles/base.css';
import 'vidstack/styles/community-skin/video.css';
```
Community-Skin ist importiert — aber es fehlt `import 'vidstack/styles/community-skin/audio.css'` für Audio-Content.

4. **`PlayerErrorBoundary`** (Zeile 202-221) fängt Vidstack-Rendering-Errors ab — deutet auf bekannte Instabilität hin.

### Konzept: Vidstack-Fixes

1. **Stream-Type ändern:**
```tsx
<VidMediaPlayer
  src={{ src: streamUrl, type: 'video/mp4' }}
  controls
  autoPlay
  className="max-h-[80vh] w-full"
  stream-type="on-demand"  // ← explizit für HTTP-Range
  crossOrigin
  ...
>
```

2. **Backend Response-Headers prüfen:**
   - `accept-ranges: bytes` muss vorhanden sein
   - `content-length` muss gesetzt sein
   - `content-type: video/mp4` muss korrekt sein
   - Bei Bedarf: Explizite Headers im Controller setzen

3. **Audio-CSS importieren:**
```ts
import 'vidstack/styles/community-skin/audio.css';
```

4. **Fullscreen-Unterstützung:** Vidstack unterstützt das nativ — prüfen ob `controls` alle nötigen Buttons zeigt. Bei Bedarf: `VidMediaPlayer` mit `fullscreenEnabled` prop.

5. **Fallback:** Wenn Vidstack fehlschlägt, `<video>`-Tag mit native Controls als Ersatz.

### Dateien
- Geändert: `MediaPlayer` in `page.tsx` (stream-type, CSS-Import, Fallback)
- Geändert: `jellyfin.service.ts` (ggf. explizite Response-Headers)

---

## P4: Bilder-Vollansicht (Lightbox)

### Ist-Zustand

`ItemsTab` zeigt Foto-Items nur als Karten mit Icon (Zeile 813: `ITEM_ICONS['photo'] = ImageIcon`). Kein Thumbnail, keine Vollansicht.

`MediaPlayer` (Zeile 1054-1063) kann Fotos als `<img>` mit Stream-URL anzeigen — aber nur als Overlay-Player, nicht als echte Lightbox.

### Konzept: `PhotoLightbox` Component

**Neue Komponente** `PhotoLightbox` — Fullscreen-Overlay mit:
- Bild-Vollansicht via Stream-URL
- Navigation (← → Tasten)
- Zoom (Mausrad)
- Schließen (Escape, Klick außerhalb)

**UI:**
```
┌─────────────────────────────────────────┐
│  × (Schließen)                    3/25  │
│                                         │
│              ← [Bild] →                 │
│                                         │
│  ───────○─────────────── 3:42           │
└─────────────────────────────────────────┘
```

**State:**
```ts
const [lightboxOpen, setLightboxOpen] = useState(false);
const [lightboxIndex, setLightboxIndex] = useState(0);
```

**Integration in `FolderBrowser`:**
- Klick auf Foto-Item → `setLightboxOpen(true)`, `setLightboxIndex(idx)`
- Nur für `photo`/`image` Items
- Stream-URL: `/jellyfin/servers/{serverId}/items/{externalId}/stream?type=Image&token=`

**Tastatur-Shortcuts:**
- `ArrowLeft` / `ArrowRight`: Vor/Zurück
- `Escape`: Schließen
- `+` / `-`: Zoom
- `0`: Zoom zurücksetzen

**Zoom:** CSS `transform: scale(n)` + `transform-origin: center center`. Mausrad-Event für Inkrement.

### Dateien
- Neu: `PhotoLightbox` in `page.tsx` (ca. 120-150 Zeilen)
- Geändert: `FolderBrowser` (Klick-Handler für Foto-Items)

---

## P5: Diashow-Modus

### Ist-Zustand

Keine Diashow-Funktionalität vorhanden.

### Konzept: Slideshow-Feature in `PhotoLightbox`

**Erweiterung des `PhotoLightbox`:**
- "Diashow"-Button in der Toolbar
- Konfigurierbares Intervall (3s, 5s, 10s, 30s)
- Pause/Play-Taste
- Automatischer Advance zum nächsten Bild

**State-Extras:**
```ts
const [slideshowActive, setSlideshowActive] = useState(false);
const [slideshowInterval, setSlideshowInterval] = useState(5); // Sekunden
```

**Logik:**
```ts
useEffect(() => {
  if (!slideshowActive) return;
  const timer = setInterval(() => {
    setLightboxIndex((prev) => (prev + 1) % photos.length);
  }, slideshowInterval * 1000);
  return () => clearInterval(timer);
}, [slideshowActive, slideshowInterval, photos.length]);
```

**UI-Elemente im Lightbox:**
- Diashow-Button (Play/Pause Icon)
- Intervall-Dropdown (3s / 5s / 10s / 30s)
- Nur sichtbar wenn Lightbox offen + Fotos vorhanden

### Dateien
- Geändert: `PhotoLightbox` (ca. 30-40 Zeilen额外)

---

## P6: Musik-Alben-Öffnung (Songs-Level)

### Ist-Zustand

`MusicBrowser` (Zeile 1298-1497) hat 3-Level-State:
```
artists → albums → songs
```

Songs-Level (Zeile 1445-1496):
- Lädt Songs via `GET /jellyfin/servers/{serverId}/items/{albumId}/children`
- Zeigt Tracklist mit Play-Button pro Song
- `playSong(songs, idx)` setzt `playerState` → öffnet `MusicPlayer`

**Möglicher Bug:** Die Songs werden korrekt geladen und angezeigt. Das Problem ist, dass `MusicPlayer` (P7) möglicherweise nicht funktioniert. Wenn der Player fehlschlägt, wirkt es so als könnten Alben nicht "geöffnet" werden — aber das Songs-Level funktioniert technisch.

**Alternative Bug-Ursache:** Das Album-Level (Zeile 1399-1442) lädt Alben via `GET /jellyfin/albums?serverId=&artistId=`. Wenn dieser Endpoint leere Daten liefert, sieht der User keine Alben und kann nicht zum Songs-Level navigieren.

### Konzept: Verification + UX-Verbesserung

1. **Album-Thumbnail im Songs-Level:** Zeige Cover-Bild des Albums oben (via `JellyfinImage` mit `albumId`)
2. **"Alle abspielen" Button:** Startet Wiedergabe ab Track 1
3. **Track-Nummerierung:** Zeige laufende Nummer (1, 2, 3...) vor jedem Track
4. **Gesamtlaufzeit:** Summe aller RunTimeTicks im Album

### Dateien
- Geändert: `MusicBrowser` songs-Level (ca. 20-30 Zeilen UX-Extras)

---

## P7: Audio-Player funktionsfähig

### Ist-Zustand

`MusicPlayer` (Zeile 1503-1768) ist bereits implementiert mit:
- HTML `<audio>` Element (Zeile 1759-1764)
- Play/Pause, Next/Previous, Shuffle, Repeat
- Volume-Slider, Progress-Slider
- Cover-Art via `JellyfinImage`
- Track-Info (Name, Artist, Album)

**Stream-URL:** `/jellyfin/servers/{serverId}/items/{trackId}/stream?type=Audio&token=`

**Mögliche Bugs:**

1. **Fehlender CSS-Import:** `vidstack/styles/community-skin/audio.css` ist nicht importiert (nur `video.css` in Zeile 17). Obwohl `MusicPlayer` ein natives `<audio>`-Tag statt Vidstream verwendet, könnte der Vidstack-CSS-Basic-Import (Zeile 16: `vidstack/styles/base.css`) Konflikte verursachen.

2. **Auto-Play Policy:** Browser blockieren Auto-Play ohne User-Interaktion. `onMeta` (Zeile 1588) ruft `audio.play().catch(() => {})` auf — das wird leise gefressen. Der User muss ggf. manuell Play drücken.

3. **Stream-URL-Encoding:** Der Token in der URL enthält ggf. Sonderzeichen. `encodeURIComponent(accessToken)` ist korrekt (Zeile 1536).

4. **Fehlerbehandlung:** `onErr` (Zeile 1590) setzt eine Fehlermeldung, aber der Audio-Player zeigt nur Text — kein Retry-Button.

### Konzept: Audio-Player Fixes

1. **Audio-CSS importieren:**
```ts
import 'vidstack/styles/community-skin/audio.css';
```

2. **Auto-Play deaktivieren:** `audio.play()` nur aufrufen wenn User explizit Play drückt. `onMeta` soll nur Metadaten setzen, nicht auto-playen:
```ts
const onMeta = () => { setDuration(audio.duration); /* KEIN audio.play() */ };
```

3. **Retry-Button im Error-State:** Wenn `error` gesetzt ist, zeige "Erneut versuchen" Button.

4. **Buffering-Indikator:** Zeige Lade-Animation während `audio.readyState < 3`.

5. **Keyboard-Shortcuts:** `Space` = Play/Pause, `ArrowRight` = Next, `ArrowLeft` = Prev.

### Dateien
- Geändert: `MusicPlayer` in `page.tsx` (ca. 15-25 Zeilen Fixes)
- Geändert: CSS-Import (1 Zeile)

---

## Zusammenfassung der Änderungen

### Neue Komponenten
| Komponente | Zeilen (ca.) | Beschreibung |
|-----------|-------------|--------------|
| `FolderBrowser` | 150-200 | Ordner-Navigation für alle Library-Typen |
| `PhotoLightbox` | 120-150 | Bild-Vollansicht mit Navigation + Zoom |
| Slideshow-Features | 30-40 | Erweiterung des Lightbox |

### Geänderte Komponenten
| Komponente | Änderung |
|-----------|----------|
| `LibraryBrowser` | Dispatch `FolderBrowser` statt `ItemsTab` |
| `MediaPlayer` | `stream-type="on-demand"`, CSS-Import, Fallback |
| `MusicBrowser` | UX-Extras (Cover, "Alle abspielen", Track-Nummern) |
| `MusicPlayer` | Auto-Play Fix, Retry-Button, Keyboard-Shortcuts |

### Backend-Änderungen
| Datei | Änderung |
|-------|----------|
| `jellyfin.service.ts` | Optional: Sync-Filterung nach Library-Type |
| `jellyfin.service.ts` | Explizite Response-Headers für Video-Stream |

### Zu entfernende Komponenten
| Komponente | Grund |
|-----------|-------|
| `ItemsTab` | Ersetzt durch `FolderBrowser` |

### Geschätzter Aufwand
| Bereich | Zeilen |
|---------|--------|
| FolderBrowser | ~180 |
| PhotoLightbox + Slideshow | ~170 |
| MediaPlayer Fixes | ~15 |
| MusicBrowser UX | ~25 |
| MusicPlayer Fixes | ~20 |
| Backend-Tweaks | ~10 |
| **Gesamt** | **~420** |

---

## Constraints-Check

| Constraint | Erfüllt |
|-----------|---------|
| Keine neuen npm-Pakete | ✅ (Vidstack + HTML `<audio>` + CSS-Transform) |
| Tailwind CSS + shadcn/ui | ✅ |
| TypeScript strict | ✅ |
| Deutsche UI-Texte | ✅ |
| Keine neuen DB-Tabellen | ✅ |
| Jellyfin API als Proxy | ✅ (alle Aufrufe über Backend-Endpoints) |
