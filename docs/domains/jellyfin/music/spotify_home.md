# Home

Version 0.2

---

# Ziel

Die Startseite dient als persönlicher Einstiegspunkt in die Music Domain.

Sie zeigt relevante Inhalte basierend auf Nutzung und Bibliothek.

---

# Layout

```
+-----------------------------------------------------------+
 Guten Abend, Robert                                      |
                                                          |
 [Schnellzugriff: 6 quadratische Cards in 3 Spalten]     |
 +--------+ +--------+ +--------+                         |
 |❤️ Favor.| |🎵 2026 | |🎵 Abbey|                         |
 +--------+ +--------+ +--------+                         |
 +--------+ +--------+ +--------+                         |
 |🎵 Mix 1| |🎵 Top  | |🎵 Rock |                         |
 +--------+ +--------+ +--------+                         |
                                                          |
 Zuletzt gehört                          Alle anzeigen →  |
 +----+ +----+ +----+ +----+ +----+ +----+                |
 |    | |    | |    | |    | |    | |    |  →             |
 +----+ +----+ +----+ +----+ +----+ +----+                |
                                                          |
 Für dich erstellt                       Alle anzeigen →   |
 +----+ +----+ +----+ +----+ +----+ +----+                |
 |    | |    | |    | |    | |    | |    |  →             |
 +----+ +----+ +----+ +----+ +----+ +----+                |
                                                          |
 Neu in deiner Bibliothek                Alle anzeigen →   |
 +----+ +----+ +----+ +----+ +----+ +----+                |
 |    | |    | |    | |    | |    | |    |  →             |
 +----+ +----+ +----+ +----+ +----+ +----+                |
                                                          |
 Lieblingskünstler                       Alle anzeigen →   |
 +----+ +----+ +----+ +----+ +----+ +----+                |
 |    | |    | |    | |    | |    | |    |  →             |
 +----+ +----+ +----+ +----+ +----+ +----+                |
+-----------------------------------------------------------+
```

---

# Greeting-Header

Uhrzeit-basierter Begrüßungstext.

Uhrzeit | Begrüßung |
---------|-----------|
5:00–11:59 | Guten Morgen |
12:00–17:59 | Guten Tag |
18:00–4:59 | Guten Abend |

Format: "Guten Abend, {UserName}".

Schriftgröße: 28px, bold, weiß.

---

# Schnellzugriff

6 quadratische Cards in 3 Spalten (2 Reihen).

Cards sind breiter als hoch (rechteckig, ~300x80px).

Inhalt: kleines Cover links + Titel + Metainfo rechts.

Standard-Cards:

1. Lieblingssongs (Favoriten)
2. Zuletzt gehörte Playlist
3. Zuletzt gehörtes Album
4. Eigene Sammlung
5. Downloads
6. Smart Playlist

Klick startet Wiedergabe oder öffnet Detailseite.

---

# Section-Komponente

Jede Section folgt demselben Muster.

```
Section-Header
+---------------------------+----------+
Section-Titel             | Alle     |
(20px bold)               | anzeigen →|
+---------------------------+----------+
[horizontal scrollbar Card-Reihe]
+----+ +----+ +----+ +----+ +----+
   | |    | |    | |    | |    |  → (Scroll-Pfeile)
+----+ +----+ +----+ +----+ +----+
```

- Card-Größe: 160x160 px (Cover) + Text darunter
- Gap: 16 px zwischen Cards
- Overflow: hidden, horizontal scrollbar
- Scroll-Pfeile erscheinen bei Hover links/rechts
- "Alle anzeigen"-Link rechts öffnet vollständige Liste

---

# Sections (Default-Reihenfolge)

## 1. Zuletzt gehört

Zuletzt gespielte Alben und Playlists.

Data: `GET /Items?SortBy=DatePlayed&SortOrder=Descending&Limit=12`

## 2. Für dich erstellt

Automatisch generierte Mix-Tapes.

- Mix 1–6 basierend auf Lieblingsgenres
- "Dein Mixtape X" mit Künstler-Beispielen im Untertitel
- "Alle Arten von..." Card

Data: LifeHub generiert Mixes aus Hörverlauf + Genres.

## 3. Neu in deiner Bibliothek

Kürzlich hinzugefügte Alben.

Data: `GET /Items?SortBy=DateCreated&SortOrder=Descending&IncludeItemTypes=MusicAlbum&Limit=12`

## 4. Lieblingskünstler

Häufig gehörte Künstler.

Data: `GET /Artists?SortBy=PlayCount&SortOrder=Descending&Limit=12`

## 5. Lieblingsalben

Häufig gehörte Alben.

Data: `GET /Items?IncludeItemTypes=MusicAlbum&SortBy=PlayCount&Limit=12`

## 6. Entdecken

Neue Musik innerhalb der eigenen Bibliothek.

Songs, die noch nie gespielt wurden aus Lieblingsgenres.

## 7. Fortsetzen

- Zuletzt abgespielte Alben
- Unvollständig gehörte Alben (Progress > 0% und < 90%)
- Zuletzt gehörte Playlists

---

# Empfehlungen

Basierend auf:

- Hörverlauf (PlayCount, DatePlayed)
- Lieblingskünstlern
- Lieblingsgenres
- Bewertungen

LifeHub generiert Empfehlungen aus der eigenen Bibliothek.

Keine externen Online-Empfehlungen erforderlich.

---

# Highlight-Banner

Optional oben auf der Startseite.

Promotet neue Features oder LifeHub-spezifische Inhalte.

Beispiel: "Die größten Schlager-Stars und Hits" mit CTA-Button.

Kann vom User ausgeblendet werden.

---

# Dashboard Logik (Data Fetching)

Jede Section nutzt eigene TanStack Query.

```typescript
const { data: recentlyPlayed } = useQuery({
 queryKey: ['music', 'recently-played'],
 queryFn: () => jellyfinApi.getItems({ sortBy: 'DatePlayed', limit: 12 }),
 staleTime: 60_000,
});

const { data: newReleases } = useQuery({
 queryKey: ['music', 'new-in-library'],
 queryFn: () => jellyfinApi.getItems({ sortBy: 'DateCreated', includeItemTypes: ['MusicAlbum'], limit: 12 }),
 staleTime: 60_000,
});
```

Sections laden unabhängig voneinander (kein Blocking).

Skeleton-Shimmer während des Ladens.

---

# Animationen

- Section-Laden: Fade-In gestaffelt, 100 ms pro Section
- Card-Hover: Scale 1.0 → 1.02 (200ms ease-out) + Play-Button-Overlay
- Skeleton-Shimmer: Pulsing-Animation (1.5s infinite)
- ScrollRow-Pfeile: Fade-In bei Hover (150ms)

---

# Responsive Verhalten

Card-Raster passt sich an Fensterbreite an.

Fensterbreite | Schnellzugriff | Card-Rows |
---------------|---------------|-----------|
≥ 1400px | 3 Spalten | 6 Cards sichtbar |
1200–1399px | 3 Spalten | 5 Cards |
1000–1199px | 2 Spalten | 4 Cards |
700–999px | 2 Spalten | 3 Cards |
< 700px | 1 Spalte | 2 Cards |

---

# Personalisierung

User kann Sections:

- verschieben (Drag-Reihenfolge)
- ausblenden
- anheften (immer oben)

Einstellungen gespeichert in LifeHub-DB.

---

# Jellyfin Integration

Verwendet:

- Bibliothek (Items, Artists, Albums)
- Verlauf (UserData, DatePlayed)
- Metadaten

LifeHub ergänzt:

- Statistiken (häufigste Genres, Hörzeiten)
- Empfehlungen (aus lokaler Bibliothek)
- Personalisierung (Section-Reihenfolge)
- Mix-Generierung

---

# Zukünftige Erweiterungen

Dieses Dokument wird später detailliert beschreiben

- dynamische Section-Anzahl basierend auf Hörverhalten
- Jahresrückblick-Widgets (Wrapped-Style)
- Social Features (Freunde hören)
- Weather-based Recommendations
