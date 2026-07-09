1|# Spotify Desktop Player Reference
2|## LifeHub Jellyfin Music Domain
3|
4|Version: 0.2
5|
6|---
7|
8|# Purpose
9|
10|Dieses Dokument definiert die grundlegende Vision der zukünftigen Music Domain innerhalb von LifeHub.
11|
12|Der Desktop Music Player orientiert sich hinsichtlich Bedienbarkeit, Informationsarchitektur und Workflow am Spotify Desktop Player.
13|
14|Dies ist ausdrücklich **keine Kopie von Spotify**, sondern eine Spezifikation einer modernen Desktop-Musikbibliothek mit Jellyfin als Backend.
15|
16|Das Dokument dient als oberste Referenz für sämtliche nachfolgenden Spezifikationen.
17|
18|---
19|
20|# Ziele
21|
22|Die Music Domain soll
23|
24|- lokale Musikbibliotheken verwalten
25|- Jellyfin vollständig integrieren
26|- mehrere hunderttausend Titel performant verwalten
27|- den Desktop als primäre Plattform behandeln
28|- sich wie eine native Desktopanwendung anfühlen
29|- alle häufigen Aktionen mit möglichst wenigen Klicks ermöglichen
30|
31|---
32|
33|# Designprinzipien
34|
35|## Content First
36|
37|Musik steht im Mittelpunkt.
38|
39|Navigation tritt optisch zurück.
40|
41|## Wenige Ebenen
42|
43|Benutzer sollen niemals tief verschachtelt navigieren müssen.
44|
45|Fast jede Information ist innerhalb von höchstens drei Klicks erreichbar.
46|
47|## Permanente Wiedergabe
48|
49|Die Wiedergabe darf niemals durch Navigation unterbrochen werden.
50|
51|Player und Queue bleiben jederzeit erhalten.
52|
53|## Große Bibliotheken
54|
55|Die Oberfläche muss problemlos funktionieren bei
56|
57|- 500 Playlists
58|- 50.000 Alben
59|- 300.000 Songs
60|- 30.000 Künstlern
61|
62|## Desktop First
63|
64|Keine Mobile-App mit Desktop-Layout.
65|
66|Stattdessen:
67|
68|- Maus
69|- Tastatur
70|- Drag & Drop
71|- Kontextmenüs
72|- Mehrfachauswahl
73|
74|stehen im Mittelpunkt.
75|
76|---
77|
78|# Technologie-Stack
79|
80|| Bereich | Technologie |
81||---------|-------------|
82|| Frontend | Next.js 14 (App Router), TypeScript strict |
83|| Styling | Tailwind CSS, shadcn/ui |
84|| Server-State | TanStack Query (Cache, staleTime, gcTime) |
85|| Client-State | Zustand (Player-State, Queue, UI) |
86|| Audio | Web Audio API / Vidstack |
87|| Virtualisierung | @tanstack/react-virtual |
88|| Drag & Drop | dnd-kit (react-dnd als Alternative) |
89|| Icons | Lucide React (Outline, 1.5px stroke) |
90|| Suche | Meilisearch (< 50 ms) + Jellyfin /Search/Hints |
91|
92|---
93|
94|# Hauptbereiche
95|
96|Die Anwendung besteht aus fünf permanent sichtbaren Bereichen.
97|
98|```
99|+-------------------------------------------------------+
100|| Top Bar (64px)                                        |
101|+--------+----------------------------------------------+
102||        |                                              |
103||Sidebar |           Main Content                       |
104||(240px) |                                              |
105||        |                              Right Sidebar   |
106||        |                              (320px, opt.)   |
107|+--------+----------------------------------------------+
108|| Playback Bar (90px)                                   |
109|+-------------------------------------------------------+
110|```
111|
112|1. Sidebar (240px expanded / 64px collapsed)
113|2. Top Bar (64px)
114|3. Main Content (fluide, max 1440px)
115|4. Right Sidebar (320px, optional — Queue, Now Playing, Lyrics)
116|5. Playback Bar (90px, immer sichtbar)
117|
118|Diese Bereiche verschwinden während der normalen Nutzung nicht.
119|
120|---
121|
122|# Seiten
123|
124|Die Music Domain besitzt folgende Seiten.
125|
126|## Home
127|
128|Persönlicher Startbereich.
129|
130|Greeting-Header, Zuletzt gehört, Schnellzugriff, Mixes, Neue Musik.
131|
132|→ siehe spotify_home.md
133|
134|## Search
135|
136|Musiksuche mit Meilisearch und Jellyfin.
137|
138|Top Ergebnis, kategorisierte Ergebnisse, Browse-Ansicht.
139|
140|→ siehe spotify_search.md
141|
142|## Library
143|
144|Gesamte Bibliothek.
145|
146|Songs, Alben, Künstler, Playlists, Genres mit Filter und Sortierung.
147|
148|→ siehe spotify_library.md
149|
150|## Playlist
151|
152|Playlistansicht mit Header, Filter-Chips, Song-Tabelle.
153|
154|→ siehe spotify_playlist_page.md
155|
156|## Album
157|
158|Albumseite mit Trackliste und Metadaten.
159|
160|## Artist
161|
162|Künstlerseite mit Biografie, Alben, ähnliche Künstler.
163|
164|## Genre
165|
166|Genreübersicht als Card-Raster.
167|
168|## Queue
169|
170|Warteschlange mit Now Playing, Next Up, History.
171|
172|## Now Playing
173|
174|Aktuelle Wiedergabe — Right Sidebar, Vollbild oder Mini-Player.
175|
176|→ siehe spotify_now_playing_view.md
177|
178|---
179|
180|# Permanenter Player
181|
182|Der Player ist dauerhaft sichtbar.
183|
184|→ siehe spotify_player.md
185|
186|Er besitzt mindestens
187|
188|- Play / Pause
189|- Vor / Zurück
190|- Shuffle
191|- Repeat (off / all / one)
192|- Timeline (klickbar, draggable, mit Tooltip)
193|- Lautstärke (Slider + Mute)
194|- Queue (mit Badge)
195|- Geräteauswahl
196|- Vollbildansicht
197|- Lyrics-Button
198|- Mini-Player
199|
200|Player-State wird über Zustand verwaltet.
201|
202|Persistiert über Sessions: volume, shuffle, repeatMode.
203|
204|---
205|
206|# Interaktionen
207|
208|Alle Interaktionsmuster sind spezifiziert.
209|
210|→ siehe spotify_interactions.md
211|
212|- Maus (Klick, Doppelklick, Rechtsklick, Hover, Drag)
213|- Tastatur (vollständige Shortcuts, Space = Play/Pause, Strg+L = Suche)
214|- Drag & Drop (Songs, Playlists, Queue)
215|- Kontextmenüs (Song, Album, Playlist, Künstler)
216|- Mehrfachauswahl (Strg+Klick, Shift+Klick, Strg+A)
217|- Touch (Tap, Long Press, Swipe, Pinch)
218|- Undo / Redo (Strg+Z / Strg+Shift+Z)
219|
220|---
221|
222|# Visuelle Sprache
223|
224|Das Designsystem ist definiert.
225|
226|→ siehe spotify_visual_language.md
227|
228|- Dark Mode ausschließlich
229|- Spotify-Farbpalette als Referenz (#121212 Basis, #1DB954 Akzent)
230|- Dynamische Farben aus Albumcovern
231|- Typografie: System-Font-Stack (Circular nicht verfügbar)
232|- Icons: Lucide (Outline, rund)
233|- 4px-Abstands-System
234|- Schatten, Blur, Transparenz definiert
235|- Animationen mit Easing-Funktionen
236|
237|---
238|
239|# Responsive Verhalten
240|
241|→ siehe spotify_responsive_behavior.md
242|
243|Die Anwendung passt sich an Fenstergrößen an.
244|
245|| Breite | Sidebar | Right Panel | Card-Grid |
246||--------|---------|-------------|-----------|
247|| ≥ 1280px | 240px | sichtbar | 5–6 Spalten |
248|| 1024–1279px | 240px | ausgeblendet | 4–5 Spalten |
249|| 768–1023px | 64px (Icons) | ausgeblendet | 3 Spalten |
250|| 500–767px | kompakt | ausgeblendet | 2 Spalten |
251|| < 500px | minimal | ausgeblendet | 1–2 Spalten |
252|
253|Player-Bar bleibt immer sichtbar, wird aber kompakter.
254|
255|---
256|
257|# Komponenten-Inventar
258|
259|→ siehe spotify_component_inventory.md
260|
261|Vollständiger Katalog aller React-Komponenten.
262|
263|- Sidebar-Komponenten
264|- Top Bar-Komponenten
265|- Player Bar-Komponenten
266|- Content-Komponenten (Cards, Tracklist, Sections)
267|- Search-Komponenten
268|- Library-Komponenten
269|- Playlist-Komponenten
270|- Now Playing-Komponenten
271|- Global / Shared-Komponenten
272|
273|Jede Komponente mit Props, Accessibility, Variants und Test-IDs.
274|
275|---
276|
277|# Jellyfin Integration
278|
279|Alle Inhalte stammen aus Jellyfin.
280|
281|## Jellyfin stellt
282|
283|- Bibliothek (Songs, Alben, Künstler, Genres)
284|- Streams (/Audio/{id}/stream)
285|- Metadaten
286|- Cover
287|- Wiedergabestatus (UserData)
288|- Playlists
289|
290|## LifeHub speichert zusätzlich
291|
292|- Favoriten
293|- eigene Playlists
294|- Bewertungen
295|- Verlauf
296|- Empfehlungen
297|- Tags
298|- Sammlungen
299|- Smart Playlists
300|- Such-History
301|- Queue-State
302|
303|## Backend-Architektur
304|
305|| Schicht | Technologie |
306||---------|-------------|
307|| Suche | Meilisearch + Jellyfin /Search/Hints |
308|| Audio-Stream | Jellyfin /Audio/{id}/stream |
309|| Metadaten | Jellyfin /Items, /Users/.../Items |
310|| Playlists | Jellyfin /Playlists + LifeHub-Erweiterung |
311|| Tags & Sammlungen | LifeHub DB (PostgreSQL) |
312|| Verlauf | LifeHub DB + Jellyfin UserData |
313|| Caching | TanStack Query (Frontend), Redis (Backend) |
314|
315|---
316|
317|# Architektur der Spezifikationen
318|
319|Die Music Domain ist in 12 Spezifikationen unterteilt.
320|
321|| Datei | Inhalt |
322||-------|--------|
323|| spotify_desktop_player_overview.md | Dieses Dokument — Gesamtarchitektur |
324|| spotify_layout_specification.md | Grundlayout, Bereiche, Pixelmaße, Grid, Blur |
325|| spotify_navigation.md | Sidebar, Navigation, History, Drag & Drop |
326|| spotify_library.md | Bibliothek, Datenmodell, Virtualisierung, API |
327|| spotify_player.md | Player-Bar, Wiedergabe, Queue, State Management |
328|| spotify_playlist_page.md | Playlist-Seite, Header, Song-Tabelle, Filter-Chips |
329|| spotify_home.md | Startseite, Sections, Greeting, Dashboard |
330|| spotify_now_playing_view.md | Now Playing, Lyrics, Queue, Mini-Player |
331|| spotify_search.md | Suche, Ranking, Meilisearch, Browse |
332|| spotify_interactions.md | Maus, Tastatur, Drag & Drop, Touch, Undo |
333|| spotify_visual_language.md | Farben, Typografie, Icons, Animationen, Tokens |
334|| spotify_responsive_behavior.md | Breakpoints, Collapse-Regeln, Retina, PWA |
335|| spotify_component_inventory.md | Alle React-Komponenten mit Props und ARIA |
336|
337|---
338|
339|# Performance-Anforderungen
340|
341|- Song-Listen: virtualisiert mit @tanstack/react-virtual
342|- Cover: lazy-loaded mit IntersectionObserver, LRU-Cache
343|- Suche: < 50 ms Antwortzeit (Meilisearch)
344|- Page-Transitions: < 200 ms
345|- Gapless Playback: Preload next track
346|
347|---
348|
349|# Accessibility
350|
351|- WCAG 2.1 AA konform
352|- Volle Tastatur-Navigierbarkeit
353|- ARIA-Rollen für alle interaktiven Elemente
354|- Focus-Indikatoren (2px solid Akzent)
355|- Focus-Trap in Modals
356|- Kontrastwerte eingehalten
357|
358|---
359|
360|# Zukünftige Erweiterungen
361|
362|Dieses Dokument wird in späteren Versionen ergänzen
363|
364|- detaillierte React-Komponentenhierarchie
365|- State-Management-Diagramme
366|- API-Verträge (OpenAPI)
367|- Caching-Strategie
368|| Offline-Modus
369||- Equalizer und Audio-Effekte
370|
371|---
372|
373|## Anhang: Implementierte Abweichungen v0.2
374|
375|Die folgenden Abweichungen vom Original-Spec wurden während der Implementierung vorgenommen (Details in `IMPLEMENTATION_PLAN_V0.2.md` §2):
376|
377|| Spec | Implementiert | Grund |
378||------|---------------|-------|
379|| Deutsche Routen (`/musik`) | Englische Routen (`/music`) | User-Wunsch |
380|| Player `fixed bottom-0` | Player `w-full` im flex-flow | Überlappte LifeHub-Sidebar |
381|| Sidebar 240px fix | Sidebar einklappbar 240px↔64px | User-Wunsch |
382|| `fillWidth`/`fillHeight` für Images | `width`/`height` + `UserId` | Korrekte Jellyfin-API-Parameter |
383|| `/Genres` Endpoint | `/Artists/AlbumArtists?Fields=Genres` | Filtermusik-Genres |
384|| Genres 26 (Filme+Musik) | Genres 31 (Nur Musik) | Via AlbumArtists extrahiert |
385|| `showPlayerBar`/`playerBar` Props | Keine — Player außerhalb von AppShell | Layout-Konflikt mit LifeHub |
386|| Bibliothek nur als `/library` mit Tabs | Zusätzlich separate Routen: `/tracks`, `/albums`, `/artists`, `/genres`, `/playlists` | User-Wunsch nach eigenen Domains |
387|| Sidebar 240px fix, statische Tabs | Sidebar einklappbar (240px↔64px) mit Toggle-Button; Tabs (Playlists/Künstler/Alben) laden Items aus music-api-Hooks + Mini-Cover | User-Wunsch |
388|| Sidebar scrollt mit Inhalt mit | Sidebar `sticky top-0 self-start` — bleibt fixiert, nur Inhalt scrollt | Bessere UX |
389|- Visualizer
390|- Webradio-Integration
391|- Podcast-Unterstützung
392|- Karaoke-Modus
393|- Kollaborative Playlists in Echtzeit
394|

---

# Domain Architecture

Die Music Domain ist eine eigenständige LifeHub Domain. Sie verwendet Jellyfin ausschließlich als Medienbackend.

---

# Architektur
LifeHub > Jellyfin Domain > Home, Search, Library, Playlist, Album, Artist, Queue, Now Playing, Player

---

# React Komponentenstruktur
Application > Layout > Sidebar, Header, Content, Right Sidebar, Playback Bar

---

# State Management
Globale Zustände: Aktueller Song, Queue, Player, Bibliothek, Benutzer, Suche, Filter, Navigation

---

# Lazy Loading
Alle Seiten werden bedarfsorientiert geladen. Nicht benötigte Komponenten werden nicht initialisiert.

---

# Performance
Virtuelle Listen, Asynchrones Rendering, Bild-Caching, Code Splitting, Komponenten-Recycling

---

# Jellyfin Architektur
Jellyfin liefert: Songs, Alben, Künstler, Playlists, Streams, Bilder, Metadaten
LifeHub ergänzt: Favoriten, Sammlungen, Bewertungen, Empfehlungen, Statistiken, Eigene Tags, Historie

---

# Dokumentstruktur
Die Spezifikation besteht aus 13 Dokumenten:
1. spotify_desktop_player_overview.md
2. spotify_layout_specification.md
3. spotify_navigation.md
4. spotify_library.md
5. spotify_player.md
6. spotify_playlist_page.md
7. spotify_home.md
8. spotify_now_playing_view.md
9. spotify_search.md
10. spotify_interactions.md
11. spotify_visual_language.md
12. spotify_responsive_behavior.md
13. spotify_component_inventory.md

---

# Dokumentbeziehungen
Overview > Layout > Navigation > Bibliothek > Player > Seiten > Interaktionen > Designsystem > Komponenten
Jedes Dokument erweitert ausschließlich die darüberliegenden Spezifikationen.

---

# Zielzustand
Nach vollständigem Ausbau bilden sämtliche Dokumente eine vollständige technische Spezifikation der Music Domain inklusive UI, UX, Komponenten, Architektur, Datenmodell, Interaktionen, Performance, Accessibility, Jellyfin Integration, Implementierungsrichtlinien, React-Komponentenstruktur und zukünftiger Erweiterbarkeit.
