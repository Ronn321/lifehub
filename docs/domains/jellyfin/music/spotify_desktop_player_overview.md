# Spotify Desktop Player Reference
## LifeHub Jellyfin Music Domain

Version: 0.2

---

# Purpose

Dieses Dokument definiert die grundlegende Vision der zukünftigen Music Domain innerhalb von LifeHub.

Der Desktop Music Player orientiert sich hinsichtlich Bedienbarkeit, Informationsarchitektur und Workflow am Spotify Desktop Player.

Dies ist ausdrücklich **keine Kopie von Spotify**, sondern eine Spezifikation einer modernen Desktop-Musikbibliothek mit Jellyfin als Backend.

Das Dokument dient als oberste Referenz für sämtliche nachfolgenden Spezifikationen.

---

# Ziele

Die Music Domain soll

- lokale Musikbibliotheken verwalten
- Jellyfin vollständig integrieren
- mehrere hunderttausend Titel performant verwalten
- den Desktop als primäre Plattform behandeln
- sich wie eine native Desktopanwendung anfühlen
- alle häufigen Aktionen mit möglichst wenigen Klicks ermöglichen

---

# Designprinzipien

## Content First

Musik steht im Mittelpunkt.

Navigation tritt optisch zurück.

## Wenige Ebenen

Benutzer sollen niemals tief verschachtelt navigieren müssen.

Fast jede Information ist innerhalb von höchstens drei Klicks erreichbar.

## Permanente Wiedergabe

Die Wiedergabe darf niemals durch Navigation unterbrochen werden.

Player und Queue bleiben jederzeit erhalten.

## Große Bibliotheken

Die Oberfläche muss problemlos funktionieren bei

- 500 Playlists
- 50.000 Alben
- 300.000 Songs
- 30.000 Künstlern

## Desktop First

Keine Mobile-App mit Desktop-Layout.

Stattdessen:

- Maus
- Tastatur
- Drag & Drop
- Kontextmenüs
- Mehrfachauswahl

stehen im Mittelpunkt.

---

# Technologie-Stack

| Bereich | Technologie |
|---------|-------------|
| Frontend | Next.js 14 (App Router), TypeScript strict |
| Styling | Tailwind CSS, shadcn/ui |
| Server-State | TanStack Query (Cache, staleTime, gcTime) |
| Client-State | Zustand (Player-State, Queue, UI) |
| Audio | Web Audio API / Vidstack |
| Virtualisierung | @tanstack/react-virtual |
| Drag & Drop | dnd-kit (react-dnd als Alternative) |
| Icons | Lucide React (Outline, 1.5px stroke) |
| Suche | Meilisearch (< 50 ms) + Jellyfin /Search/Hints |

---

# Hauptbereiche

Die Anwendung besteht aus fünf permanent sichtbaren Bereichen.

```
+-------------------------------------------------------+
| Top Bar (64px)                                        |
+--------+----------------------------------------------+
|        |                                              |
|Sidebar |           Main Content                       |
|(240px) |                                              |
|        |                              Right Sidebar   |
|        |                              (320px, opt.)   |
+--------+----------------------------------------------+
| Playback Bar (90px)                                   |
+-------------------------------------------------------+
```

1. Sidebar (240px expanded / 64px collapsed)
2. Top Bar (64px)
3. Main Content (fluide, max 1440px)
4. Right Sidebar (320px, optional — Queue, Now Playing, Lyrics)
5. Playback Bar (90px, immer sichtbar)

Diese Bereiche verschwinden während der normalen Nutzung nicht.

---

# Seiten

Die Music Domain besitzt folgende Seiten.

## Home

Persönlicher Startbereich.

Greeting-Header, Zuletzt gehört, Schnellzugriff, Mixes, Neue Musik.

→ siehe spotify_home.md

## Search

Musiksuche mit Meilisearch und Jellyfin.

Top Ergebnis, kategorisierte Ergebnisse, Browse-Ansicht.

→ siehe spotify_search.md

## Library

Gesamte Bibliothek.

Songs, Alben, Künstler, Playlists, Genres mit Filter und Sortierung.

→ siehe spotify_library.md

## Playlist

Playlistansicht mit Header, Filter-Chips, Song-Tabelle.

→ siehe spotify_playlist_page.md

## Album

Albumseite mit Trackliste und Metadaten.

## Artist

Künstlerseite mit Biografie, Alben, ähnliche Künstler.

## Genre

Genreübersicht als Card-Raster.

## Queue

Warteschlange mit Now Playing, Next Up, History.

## Now Playing

Aktuelle Wiedergabe — Right Sidebar, Vollbild oder Mini-Player.

→ siehe spotify_now_playing_view.md

---

# Permanenter Player

Der Player ist dauerhaft sichtbar.

→ siehe spotify_player.md

Er besitzt mindestens

- Play / Pause
- Vor / Zurück
- Shuffle
- Repeat (off / all / one)
- Timeline (klickbar, draggable, mit Tooltip)
- Lautstärke (Slider + Mute)
- Queue (mit Badge)
- Geräteauswahl
- Vollbildansicht
- Lyrics-Button
- Mini-Player

Player-State wird über Zustand verwaltet.

Persistiert über Sessions: volume, shuffle, repeatMode.

---

# Interaktionen

Alle Interaktionsmuster sind spezifiziert.

→ siehe spotify_interactions.md

- Maus (Klick, Doppelklick, Rechtsklick, Hover, Drag)
- Tastatur (vollständige Shortcuts, Space = Play/Pause, Strg+L = Suche)
- Drag & Drop (Songs, Playlists, Queue)
- Kontextmenüs (Song, Album, Playlist, Künstler)
- Mehrfachauswahl (Strg+Klick, Shift+Klick, Strg+A)
- Touch (Tap, Long Press, Swipe, Pinch)
- Undo / Redo (Strg+Z / Strg+Shift+Z)

---

# Visuelle Sprache

Das Designsystem ist definiert.

→ siehe spotify_visual_language.md

- Dark Mode ausschließlich
- Spotify-Farbpalette als Referenz (#121212 Basis, #1DB954 Akzent)
- Dynamische Farben aus Albumcovern
- Typografie: System-Font-Stack (Circular nicht verfügbar)
- Icons: Lucide (Outline, rund)
- 4px-Abstands-System
- Schatten, Blur, Transparenz definiert
- Animationen mit Easing-Funktionen

---

# Responsive Verhalten

→ siehe spotify_responsive_behavior.md

Die Anwendung passt sich an Fenstergrößen an.

| Breite | Sidebar | Right Panel | Card-Grid |
|--------|---------|-------------|-----------|
| ≥ 1280px | 240px | sichtbar | 5–6 Spalten |
| 1024–1279px | 240px | ausgeblendet | 4–5 Spalten |
| 768–1023px | 64px (Icons) | ausgeblendet | 3 Spalten |
| 500–767px | kompakt | ausgeblendet | 2 Spalten |
| < 500px | minimal | ausgeblendet | 1–2 Spalten |

Player-Bar bleibt immer sichtbar, wird aber kompakter.

---

# Komponenten-Inventar

→ siehe spotify_component_inventory.md

Vollständiger Katalog aller React-Komponenten.

- Sidebar-Komponenten
- Top Bar-Komponenten
- Player Bar-Komponenten
- Content-Komponenten (Cards, Tracklist, Sections)
- Search-Komponenten
- Library-Komponenten
- Playlist-Komponenten
- Now Playing-Komponenten
- Global / Shared-Komponenten

Jede Komponente mit Props, Accessibility, Variants und Test-IDs.

---

# Jellyfin Integration

Alle Inhalte stammen aus Jellyfin.

## Jellyfin stellt

- Bibliothek (Songs, Alben, Künstler, Genres)
- Streams (/Audio/{id}/stream)
- Metadaten
- Cover
- Wiedergabestatus (UserData)
- Playlists

## LifeHub speichert zusätzlich

- Favoriten
- eigene Playlists
- Bewertungen
- Verlauf
- Empfehlungen
- Tags
- Sammlungen
- Smart Playlists
- Such-History
- Queue-State

## Backend-Architektur

| Schicht | Technologie |
|---------|-------------|
| Suche | Meilisearch + Jellyfin /Search/Hints |
| Audio-Stream | Jellyfin /Audio/{id}/stream |
| Metadaten | Jellyfin /Items, /Users/.../Items |
| Playlists | Jellyfin /Playlists + LifeHub-Erweiterung |
| Tags & Sammlungen | LifeHub DB (PostgreSQL) |
| Verlauf | LifeHub DB + Jellyfin UserData |
| Caching | TanStack Query (Frontend), Redis (Backend) |

---

# Architektur der Spezifikationen

Die Music Domain ist in 12 Spezifikationen unterteilt.

| Datei | Inhalt |
|-------|--------|
| spotify_desktop_player_overview.md | Dieses Dokument — Gesamtarchitektur |
| spotify_layout_specification.md | Grundlayout, Bereiche, Pixelmaße, Grid, Blur |
| spotify_navigation.md | Sidebar, Navigation, History, Drag & Drop |
| spotify_library.md | Bibliothek, Datenmodell, Virtualisierung, API |
| spotify_player.md | Player-Bar, Wiedergabe, Queue, State Management |
| spotify_playlist_page.md | Playlist-Seite, Header, Song-Tabelle, Filter-Chips |
| spotify_home.md | Startseite, Sections, Greeting, Dashboard |
| spotify_now_playing_view.md | Now Playing, Lyrics, Queue, Mini-Player |
| spotify_search.md | Suche, Ranking, Meilisearch, Browse |
| spotify_interactions.md | Maus, Tastatur, Drag & Drop, Touch, Undo |
| spotify_visual_language.md | Farben, Typografie, Icons, Animationen, Tokens |
| spotify_responsive_behavior.md | Breakpoints, Collapse-Regeln, Retina, PWA |
| spotify_component_inventory.md | Alle React-Komponenten mit Props und ARIA |

---

# Performance-Anforderungen

- Song-Listen: virtualisiert mit @tanstack/react-virtual
- Cover: lazy-loaded mit IntersectionObserver, LRU-Cache
- Suche: < 50 ms Antwortzeit (Meilisearch)
- Page-Transitions: < 200 ms
- Gapless Playback: Preload next track

---

# Accessibility

- WCAG 2.1 AA konform
- Volle Tastatur-Navigierbarkeit
- ARIA-Rollen für alle interaktiven Elemente
- Focus-Indikatoren (2px solid Akzent)
- Focus-Trap in Modals
- Kontrastwerte eingehalten

---

# Zukünftige Erweiterungen

Dieses Dokument wird in späteren Versionen ergänzen

- detaillierte React-Komponentenhierarchie
- State-Management-Diagramme
- API-Verträge (OpenAPI)
- Caching-Strategie
| Offline-Modus
|- Equalizer und Audio-Effekte

---

## Anhang: Implementierte Abweichungen v0.2

Die folgenden Abweichungen vom Original-Spec wurden während der Implementierung vorgenommen (Details in `IMPLEMENTATION_PLAN_V0.2.md` §2):

| Spec | Implementiert | Grund |
|------|---------------|-------|
| Deutsche Routen (`/musik`) | Englische Routen (`/music`) | User-Wunsch |
| Player `fixed bottom-0` | Player `w-full` im flex-flow | Überlappte LifeHub-Sidebar |
| Sidebar 240px fix | Sidebar einklappbar 240px↔64px | User-Wunsch |
| `fillWidth`/`fillHeight` für Images | `width`/`height` + `UserId` | Korrekte Jellyfin-API-Parameter |
| `/Genres` Endpoint | `/Artists/AlbumArtists?Fields=Genres` | Filtermusik-Genres |
| Genres 26 (Filme+Musik) | Genres 31 (Nur Musik) | Via AlbumArtists extrahiert |
| `showPlayerBar`/`playerBar` Props | Keine — Player außerhalb von AppShell | Layout-Konflikt mit LifeHub |
| Bibliothek nur als `/library` mit Tabs | Zusätzlich separate Routen: `/tracks`, `/albums`, `/artists`, `/genres`, `/playlists` | User-Wunsch nach eigenen Domains |
| Sidebar 240px fix, statische Tabs | Sidebar einklappbar (240px↔64px) mit Toggle-Button; Tabs (Playlists/Künstler/Alben) laden Items aus music-api-Hooks + Mini-Cover | User-Wunsch |
| Sidebar scrollt mit Inhalt mit | Sidebar `sticky top-0 self-start` — bleibt fixiert, nur Inhalt scrollt | Bessere UX |
- Visualizer
- Webradio-Integration
- Podcast-Unterstützung
- Karaoke-Modus
- Kollaborative Playlists in Echtzeit
