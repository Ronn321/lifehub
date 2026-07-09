1|# Music Library
2|
3|Version 0.2
4|
5|---
6|
7|# Ziel
8|
9|Die Bibliothek bildet den Mittelpunkt der Music Domain.
10|
11|Sie verwaltet sämtliche Musikobjekte.
12|
13|---
14|
15|# Bibliothekstypen
16|
17|- Songs
18|- Alben
19|- Künstler
20|- Playlists
21|- Genres
22|- Komponisten
23|- Sampler
24|- Favoriten
25|- Downloads
26|- Eigene Sammlungen
27|
28|---
29|
30|# Datenmodell
31|
32|## Song
33|
34|```typescript
35|interface Song {
36|  id: string;                    // Jellyfin ItemId
37|  title: string;
38|  artist: string;
39|  artistId: string;
40|  album: string;
41|  albumId: string;
42|  albumArtist: string;
43|  composers: string[];
44|  genres: string[];
45|  duration: number;              // Sekunden
46|  trackNumber: number;
47|  discNumber: number;
48|  year: number;
49|  bitrate: number;
50|  container: string;             // mp3, flac, ...
51|  size: number;                  // Bytes
52|  playCount: number;             // aus Jellyfin UserData
53|  isFavorite: boolean;
54|  isDownloaded: boolean;
55|  dateAdded: string;             // ISO-8601
56|  datePlayed?: string;
57|  tags: string[];                // LifeHub-Tags
58|  rating?: number;               // 1-5
59|}
60|```
61|
62|## Album
63|
64|```typescript
65|interface Album {
66|  id: string;
67|  title: string;
68|  artist: string;
69|  artistId: string;
70|  year: number;
71|  genres: string[];
72|  songCount: number;
73|  duration: number;
74|  coverUrl: string;
75|  isFavorite: boolean;
76|  dateAdded: string;
77|}
78|```
79|
80|## Artist
81|
82|```typescript
83|interface Artist {
84|  id: string;
85|  name: string;
86|  genres: string[];
87|  albumCount: number;
88|  songCount: number;
89|  imageUrl?: string;
90|  biography?: string;
91|  isFavorite: boolean;
92|}
93|```
94|
95|## Playlist
96|
97|```typescript
98|interface Playlist {
99|  id: string;
100|  name: string;
101|  description?: string;
102|  owner: string;
103|  songCount: number;
104|  duration: number;
105|  coverUrl: string;
106|  type: 'own' | 'jellyfin' | 'smart' | 'shared' | 'imported';
107|  dateCreated: string;
108|  dateModified: string;
109|  rules?: SmartPlaylistRule[];   // nur bei type='smart'
110|}
111|```
112|
113|---
114|
115|# Ansichten
116|
117|## Listenansicht
118|
119|Detaillierte Tabelle mit allen Songs.
120|
121|→ siehe Tabellenlayout unten.
122|
123|## Kachelansicht (Grid)
124|
125|Card-Raster für Alben, Künstler, Playlists.
126|
127|| Modus | Cover-Größe | Verwendung |
128||-------|-------------|------------|
129|| Small | 48x48 px | Kompaktliste, Sidebar |
130|| Medium | 160x160 px | Card-Grid Standard |
131|| Large | 232x232 px | Playlist-Header, Album-Header |
132|
133|Card-Grid: 16 px Gap, Auto-Fill mit minmax(160px, 1fr).
134|
135|## Kompaktansicht
136|
137|Reduzierte Tabelle, nur Titel + Künstler + Dauer.
138|
139|## Detailansicht
140|
141|Erweiterte Song-Liste mit allen Metadaten-Spalten.
142|
143|---
144|
145|# Sortierung
146|
147|| Kriterium | Standard-Richtung |
148||-----------|-------------------|
149|| Alphabetisch (Titel) | A→Z |
150|| Zuletzt hinzugefügt | Neueste zuerst |
151|| Zuletzt gespielt | Neueste zuerst |
152|| Meist gehört | Höchste PlayCount zuerst |
153|| Erscheinungsjahr | Neueste zuerst |
154|| Bewertung | Höchste zuerst |
155|| Eigene Reihenfolge | User-definiert |
156|
157|Sortierung durch Klick auf Spaltenüberschrift.
158|
159|Toggle ascending ↔ descending bei erneutem Klick.
160|
161|---
162|
163|# Filter
164|
165|| Filter | Typ |
166||--------|-----|
167|| Genre | Multi-Select-Chips |
168|| Jahr | Range (von–bis) |
169|| Interpret | Autocomplete |
170|| Album | Autocomplete |
171|| Komponist | Autocomplete |
172|| Dauer | Range (min–max Minuten) |
173|| Favorit | Toggle (nur Favoriten) |
174|| Bewertung | Mindestwert (1–5) |
175|| Heruntergeladen | Toggle |
176|
177|Filter-Chips erscheinen als Pill-shaped Buttons über der Liste.
178|
179|Mehrere Filter kombinieren mit AND.
180|
181|---
182|
183|# Songliste (Tabellenlayout)
184|
185|## Spalten
186|
187|| Spalte | Breite | Ausrichtung | Sortierbar |
188||--------|--------|-------------|------------|
189|| # | 40px | rechts | nein |
190|| Titel | flex (min 200px) | links | ja |
191|| Album | 25% | links | ja |
192|| Hinzugefügt am | 120px | links | ja |
193|| ♥ | 40px | zentriert | nein |
194|| Genre | 120px | links | ja |
195|| Qualität | 60px | zentriert | nein |
196|| Dauer | 60px | rechts | ja |
197|
198|Titel-Spalte enthält: Cover (40x40 px) + Titel (14px bold) + Künstler (12px sekundär).
199|
200|## Hoververhalten
201|
202|- Zeile: Hintergrund → #2A2A2A
203|- Index-Zahl → Play-Icon (▶)
204|- Herz-Icon: erscheint (grau) bzw. leuchtet (grün bei Liked)
205|- More-Button (⋯): erscheint am rechten Rand
206|
207|## Auswahlverhalten
208|
209|| Aktion | Ergebnis |
210||--------|----------|
211|| Single Click | Zeile auswählen (visuell hervorheben) |
212|| Double Click | Song abspielen |
213|| Strg+Click | Einzelne Songs toggeln (Mehrfachauswahl) |
214|| Shift+Click | Bereich auswählen |
215|| Strg+A | Alle Songs auswählen |
216|| Click außerhalb | Auswahl aufheben |
217|
218|---
219|
220|# Performance
221|
222|## Virtualisierung
223|
224|Listen mit > 100 Einträgen werden virtualisiert.
225|
226|```typescript
227|import { useVirtualizer } from '@tanstack/react-virtual';
228|
229|const rowVirtualizer = useVirtualizer({
230|  count: songs.length,
231|  estimateSize: () => 56,       // px pro Zeile
232|  overscan: 5,                  // zusätzliche Zeilen außerhalb Viewport
233|  getScrollElement: () => scrollRef.current,
234|});
235|```
236|
237|- Geschätzte Zeilenhöhe: 56 px
238|- Overscan: 5 Zeilen
239|- Nur sichtbare Zeilen werden gerendert
240|- Funktioniert bei 100.000+ Songs ohne Performance-Verlust
241|
242|## Cache
243|
244|| Cache-Strategie | Wert |
245||-----------------|------|
246|| TanStack Query staleTime | 60 s (Bibliotheks-Listen) |
247|| TanStack Query gcTime | 5 min |
248|| Cover-Cache | LRU, max 500 Einträge |
249|| Cover-Auflösung | Lazy-load mit IntersectionObserver |
250|| Scroll-Restoration | position wird bei Route-Wechsel gespeichert |
251|
252|---
253|
254|# Aktionen
255|
256|## Song-Aktionen
257|
258|- Abspielen
259|- Zur Queue
260|- Playlist hinzufügen
261|- Favorisieren (Herz)
262|- Download
263|- Informationen anzeigen
264|- Bearbeiten (Metadaten)
265|- Löschen
266|
267|---
268|
269|# Mehrfachauswahl
270|
271|Mehrere Songs markieren.
272|
273|Gemeinsame Aktionen:
274|
275|- Ausgewählte abspielen
276|- Zur Queue hinzufügen
277|- Zur Playlist hinzufügen
278|- Herunterladen
279|- Favorit toggeln
280|- Löschen
281|
282|Auswahl-Leiste erscheint über der Tabelle mit Anzahl und Bulk-Aktionen.
283|
284|---
285|
286|# Bibliotheksordner
287|
288|Playlists können
289|
290|- geordnet
291|- gruppiert
292|- verschachtelt
293|- angeheftet
294|
295|werden.
296|
297|Ordner sind LifeHub-spezifisch (nicht in Jellyfin).
298|
299|---
300|
301|# Kontextmenüs
302|
303|Für: Song, Album, Playlist, Ordner, Künstler, Genre.
304|
305|→ siehe spotify_interactions.md für vollständige Kontextmenü-Definitionen.
306|
307|---
308|
309|# Suche innerhalb der Bibliothek
310|
311|Unterstützt
312|
313|- Titel
314|- Interpret
315|- Album
316|- Genre
317|- Jahr
318|- Tags
319|
320|Kleinenes Suchfeld über der Liste filtert live (Debounce 200 ms).
321|
322|---
323|
324|# Jellyfin Integration
325|
326|## API-Endpoints
327|
328|```
329|GET /Users/{userId}/Items?IncludeItemTypes=Audio&Recursive=true
330|GET /Items?ParentId={albumId}&IncludeItemTypes=Audio
331|GET /Artists
332|GET /Artists/Items
333|GET /Genres
334|GET /Items?Filters=IsFavorite
335|GET /Items?SortBy=DatePlayed&SortOrder=Descending
336|```
337|
338|## Synchronisation
339|
340|Jellyfin synchronisiert: Songs, Playlists, Metadaten, Cover, Bewertungen, Verlauf.
341|
342|LifeHub ergänzt: Tags, Sammlungen, Smart-Playlists, Custom-Reihenfolge, Ordner.
343|
344|---
345|
346|# Accessibility
347|
348|- Tabelle: role="grid", jede Zeile role="row", jede Zelle role="gridcell"
349|- aria-rowcount und aria-colcount auf Tabelle
350|- aria-selected auf ausgewählten Zeilen
351|- Sort-Buttons: aria-sort="ascending" | "descending" | "none"
352|- Keyboard-Navigation: Pfeiltasten durch Zellen, Enter für Aktion
353|
354|---
355|
356|# Tastatursteuerung
357|
358|| Taste | Aktion |
359||-------|--------|
360|| Pfeil oben/unten | Durch Liste navigieren |
361|| Enter | Ausgewählten Song abspielen |
362|| Space | Ausgewählten Song zur Queue |
363|| Shift+Pfeil | Bereich auswählen |
364|| Strg+A | Alle auswählen |
365|| Entf | Auswahl entfernen (nur eigene Playlists) |
366|| Strg+F | Bibliotheks-Suche fokussieren |
367|
368|---
369|
370|# Bibliotheksanimationen
371|
372|- Listen-Laden: Skeleton-Shimmer (16 Zeilen Platzhalter, Pulsing-Animation)
373|- Fade-In: gestaffelt, 20 ms pro Zeile (max 500 ms Gesamt)
374|- Filter-Wechsel: Cross-Fade 150 ms
375|
376|---
377|
378|# Zukünftige Erweiterungen
379|
380|Dieses Dokument wird später detailliert beschreiben
381|
382|- Batch-Metadaten-Editor
383|- Duplicate-Detection
384|- automatische Genre-Korrektur
385|- Cover-Manager (fehlende Covers suchen)
386|- Bibliotheks-Statistik-Dashboard
387|

---

# Bibliotheksansichten

## Listenansicht
Optimiert für große Bibliotheken. Zeilenbasierte Darstellung.

## Kompaktansicht
Minimale Zeilenhöhe. Mehr Inhalte gleichzeitig sichtbar.

## Kartenansicht
Albumcover im Vordergrund. Geeignet für Alben, Playlists, Genres, Sammlungen.

## Detailansicht
Zusätzliche Metadaten, Beschreibung, Statistiken.

---

# Tabellenlayout
Spalten: Cover, Titel, Interpret, Album, Genre, Jahr, Länge, Bewertung, Favorit, Qualität, Bitrate, Hinzugefügt, Zuletzt gehört

---

# Spaltenregeln
Beliebig sortierbar. Ein-/ausblendbar. Breite anpassbar.

---

# Sortierung
Alphabetisch, Interpret, Album, Genre, Jahr, Hinzugefügt, Geändert, Zuletzt gehört, Bewertung, Eigene Reihenfolge

---

# Filterlogik
Genre, Interpret, Album, Jahr, Tags, Dateiformat, Favoriten, Downloads, Bewertung, Bitrate, Samplingrate

---

# Suchfilter
Live Filter, Mehrfachfilter, Kombinierte Filter, Persistente Filter

---

# Covergrößen
Extra Small, Small, Medium, Large, Extra Large — beeinflusst ausschließlich Darstellung

---

# Kontextmenüs
Song, Album, Interpret, Genre, Playlist, Ordner, Sammlung

---

# Virtuelle Listen
Alle Listen unterstützen Virtualisierung. Rendering nur für sichtbare Bereiche.

---

# Performance
Asynchrones Nachladen, Lazy Loading, Unendliches Scrollen, Sortierung ohne Neuladen

---

# Jellyfin Datenmodell
Library, Artist, Album, Track, Genre, Playlist, Collection, Image, Playback History, Favorite

---

# Erweiterung später
Tabellenlayout im Detail, Zeilenhöhen, Covergrößen in Pixel, Datenquellen, Performance Benchmarks, Caching
