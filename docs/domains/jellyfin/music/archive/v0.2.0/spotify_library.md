# Music Library

Version 0.2

---

# Ziel

Die Bibliothek bildet den Mittelpunkt der Music Domain.

Sie verwaltet sämtliche Musikobjekte.

---

# Bibliothekstypen

- Songs
- Alben
- Künstler
- Playlists
- Genres
- Komponisten
- Sampler
- Favoriten
- Downloads
- Eigene Sammlungen

---

# Datenmodell

## Song

```typescript
interface Song {
  id: string;                    // Jellyfin ItemId
  title: string;
  artist: string;
  artistId: string;
  album: string;
  albumId: string;
  albumArtist: string;
  composers: string[];
  genres: string[];
  duration: number;              // Sekunden
  trackNumber: number;
  discNumber: number;
  year: number;
  bitrate: number;
  container: string;             // mp3, flac, ...
  size: number;                  // Bytes
  playCount: number;             // aus Jellyfin UserData
  isFavorite: boolean;
  isDownloaded: boolean;
  dateAdded: string;             // ISO-8601
  datePlayed?: string;
  tags: string[];                // LifeHub-Tags
  rating?: number;               // 1-5
}
```

## Album

```typescript
interface Album {
  id: string;
  title: string;
  artist: string;
  artistId: string;
  year: number;
  genres: string[];
  songCount: number;
  duration: number;
  coverUrl: string;
  isFavorite: boolean;
  dateAdded: string;
}
```

## Artist

```typescript
interface Artist {
  id: string;
  name: string;
  genres: string[];
  albumCount: number;
  songCount: number;
  imageUrl?: string;
  biography?: string;
  isFavorite: boolean;
}
```

## Playlist

```typescript
interface Playlist {
  id: string;
  name: string;
  description?: string;
  owner: string;
  songCount: number;
  duration: number;
  coverUrl: string;
  type: 'own' | 'jellyfin' | 'smart' | 'shared' | 'imported';
  dateCreated: string;
  dateModified: string;
  rules?: SmartPlaylistRule[];   // nur bei type='smart'
}
```

---

# Ansichten

## Listenansicht

Detaillierte Tabelle mit allen Songs.

→ siehe Tabellenlayout unten.

## Kachelansicht (Grid)

Card-Raster für Alben, Künstler, Playlists.

| Modus | Cover-Größe | Verwendung |
|-------|-------------|------------|
| Small | 48x48 px | Kompaktliste, Sidebar |
| Medium | 160x160 px | Card-Grid Standard |
| Large | 232x232 px | Playlist-Header, Album-Header |

Card-Grid: 16 px Gap, Auto-Fill mit minmax(160px, 1fr).

## Kompaktansicht

Reduzierte Tabelle, nur Titel + Künstler + Dauer.

## Detailansicht

Erweiterte Song-Liste mit allen Metadaten-Spalten.

---

# Sortierung

| Kriterium | Standard-Richtung |
|-----------|-------------------|
| Alphabetisch (Titel) | A→Z |
| Zuletzt hinzugefügt | Neueste zuerst |
| Zuletzt gespielt | Neueste zuerst |
| Meist gehört | Höchste PlayCount zuerst |
| Erscheinungsjahr | Neueste zuerst |
| Bewertung | Höchste zuerst |
| Eigene Reihenfolge | User-definiert |

Sortierung durch Klick auf Spaltenüberschrift.

Toggle ascending ↔ descending bei erneutem Klick.

---

# Filter

| Filter | Typ |
|--------|-----|
| Genre | Multi-Select-Chips |
| Jahr | Range (von–bis) |
| Interpret | Autocomplete |
| Album | Autocomplete |
| Komponist | Autocomplete |
| Dauer | Range (min–max Minuten) |
| Favorit | Toggle (nur Favoriten) |
| Bewertung | Mindestwert (1–5) |
| Heruntergeladen | Toggle |

Filter-Chips erscheinen als Pill-shaped Buttons über der Liste.

Mehrere Filter kombinieren mit AND.

---

# Songliste (Tabellenlayout)

## Spalten

| Spalte | Breite | Ausrichtung | Sortierbar |
|--------|--------|-------------|------------|
| # | 40px | rechts | nein |
| Titel | flex (min 200px) | links | ja |
| Album | 25% | links | ja |
| Hinzugefügt am | 120px | links | ja |
| ♥ | 40px | zentriert | nein |
| Genre | 120px | links | ja |
| Qualität | 60px | zentriert | nein |
| Dauer | 60px | rechts | ja |

Titel-Spalte enthält: Cover (40x40 px) + Titel (14px bold) + Künstler (12px sekundär).

## Hoververhalten

- Zeile: Hintergrund → #2A2A2A
- Index-Zahl → Play-Icon (▶)
- Herz-Icon: erscheint (grau) bzw. leuchtet (grün bei Liked)
- More-Button (⋯): erscheint am rechten Rand

## Auswahlverhalten

| Aktion | Ergebnis |
|--------|----------|
| Single Click | Zeile auswählen (visuell hervorheben) |
| Double Click | Song abspielen |
| Strg+Click | Einzelne Songs toggeln (Mehrfachauswahl) |
| Shift+Click | Bereich auswählen |
| Strg+A | Alle Songs auswählen |
| Click außerhalb | Auswahl aufheben |

---

# Performance

## Virtualisierung

Listen mit > 100 Einträgen werden virtualisiert.

```typescript
import { useVirtualizer } from '@tanstack/react-virtual';

const rowVirtualizer = useVirtualizer({
  count: songs.length,
  estimateSize: () => 56,       // px pro Zeile
  overscan: 5,                  // zusätzliche Zeilen außerhalb Viewport
  getScrollElement: () => scrollRef.current,
});
```

- Geschätzte Zeilenhöhe: 56 px
- Overscan: 5 Zeilen
- Nur sichtbare Zeilen werden gerendert
- Funktioniert bei 100.000+ Songs ohne Performance-Verlust

## Cache

| Cache-Strategie | Wert |
|-----------------|------|
| TanStack Query staleTime | 60 s (Bibliotheks-Listen) |
| TanStack Query gcTime | 5 min |
| Cover-Cache | LRU, max 500 Einträge |
| Cover-Auflösung | Lazy-load mit IntersectionObserver |
| Scroll-Restoration | position wird bei Route-Wechsel gespeichert |

---

# Aktionen

## Song-Aktionen

- Abspielen
- Zur Queue
- Playlist hinzufügen
- Favorisieren (Herz)
- Download
- Informationen anzeigen
- Bearbeiten (Metadaten)
- Löschen

---

# Mehrfachauswahl

Mehrere Songs markieren.

Gemeinsame Aktionen:

- Ausgewählte abspielen
- Zur Queue hinzufügen
- Zur Playlist hinzufügen
- Herunterladen
- Favorit toggeln
- Löschen

Auswahl-Leiste erscheint über der Tabelle mit Anzahl und Bulk-Aktionen.

---

# Bibliotheksordner

Playlists können

- geordnet
- gruppiert
- verschachtelt
- angeheftet

werden.

Ordner sind LifeHub-spezifisch (nicht in Jellyfin).

---

# Kontextmenüs

Für: Song, Album, Playlist, Ordner, Künstler, Genre.

→ siehe spotify_interactions.md für vollständige Kontextmenü-Definitionen.

---

# Suche innerhalb der Bibliothek

Unterstützt

- Titel
- Interpret
- Album
- Genre
- Jahr
- Tags

Kleinenes Suchfeld über der Liste filtert live (Debounce 200 ms).

---

# Jellyfin Integration

## API-Endpoints

```
GET /Users/{userId}/Items?IncludeItemTypes=Audio&Recursive=true
GET /Items?ParentId={albumId}&IncludeItemTypes=Audio
GET /Artists
GET /Artists/Items
GET /Genres
GET /Items?Filters=IsFavorite
GET /Items?SortBy=DatePlayed&SortOrder=Descending
```

## Synchronisation

Jellyfin synchronisiert: Songs, Playlists, Metadaten, Cover, Bewertungen, Verlauf.

LifeHub ergänzt: Tags, Sammlungen, Smart-Playlists, Custom-Reihenfolge, Ordner.

---

# Accessibility

- Tabelle: role="grid", jede Zeile role="row", jede Zelle role="gridcell"
- aria-rowcount und aria-colcount auf Tabelle
- aria-selected auf ausgewählten Zeilen
- Sort-Buttons: aria-sort="ascending" | "descending" | "none"
- Keyboard-Navigation: Pfeiltasten durch Zellen, Enter für Aktion

---

# Tastatursteuerung

| Taste | Aktion |
|-------|--------|
| Pfeil oben/unten | Durch Liste navigieren |
| Enter | Ausgewählten Song abspielen |
| Space | Ausgewählten Song zur Queue |
| Shift+Pfeil | Bereich auswählen |
| Strg+A | Alle auswählen |
| Entf | Auswahl entfernen (nur eigene Playlists) |
| Strg+F | Bibliotheks-Suche fokussieren |

---

# Bibliotheksanimationen

- Listen-Laden: Skeleton-Shimmer (16 Zeilen Platzhalter, Pulsing-Animation)
- Fade-In: gestaffelt, 20 ms pro Zeile (max 500 ms Gesamt)
- Filter-Wechsel: Cross-Fade 150 ms

---

# Zukünftige Erweiterungen

Dieses Dokument wird später detailliert beschreiben

- Batch-Metadaten-Editor
- Duplicate-Detection
- automatische Genre-Korrektur
- Cover-Manager (fehlende Covers suchen)
- Bibliotheks-Statistik-Dashboard
