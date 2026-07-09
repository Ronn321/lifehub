1|# Home
2|
3|Version 0.2
4|
5|---
6|
7|# Ziel
8|
9|Die Startseite dient als persönlicher Einstiegspunkt in die Music Domain.
10|
11|Sie zeigt relevante Inhalte basierend auf Nutzung und Bibliothek.
12|
13|---
14|
15|# Layout
16|
17|```
18|+-----------------------------------------------------------+
19||  Guten Abend, Robert                                      |
20||                                                           |
21||  [Schnellzugriff: 6 quadratische Cards in 3 Spalten]     |
22||  +--------+ +--------+ +--------+                         |
23||  |❤️ Favor.| |🎵 2026 | |🎵 Abbey|                         |
24||  +--------+ +--------+ +--------+                         |
25||  +--------+ +--------+ +--------+                         |
26||  |🎵 Mix 1| |🎵 Top  | |🎵 Rock |                         |
27||  +--------+ +--------+ +--------+                         |
28||                                                           |
29||  Zuletzt gehört                          Alle anzeigen →  |
30||  +----+ +----+ +----+ +----+ +----+ +----+                |
31||  |    | |    | |    | |    | |    | |    |  →             |
32||  +----+ +----+ +----+ +----+ +----+ +----+                |
33||                                                           |
34||  Für dich erstellt                       Alle anzeigen →   |
35||  +----+ +----+ +----+ +----+ +----+ +----+                |
36||  |    | |    | |    | |    | |    | |    |  →             |
37||  +----+ +----+ +----+ +----+ +----+ +----+                |
38||                                                           |
39||  Neu in deiner Bibliothek                Alle anzeigen →   |
40||  +----+ +----+ +----+ +----+ +----+ +----+                |
41||  |    | |    | |    | |    | |    | |    |  →             |
42||  +----+ +----+ +----+ +----+ +----+ +----+                |
43||                                                           |
44||  Lieblingskünstler                       Alle anzeigen →   |
45||  +----+ +----+ +----+ +----+ +----+ +----+                |
46||  |    | |    | |    | |    | |    | |    |  →             |
47||  +----+ +----+ +----+ +----+ +----+ +----+                |
48|+-----------------------------------------------------------+
49|```
50|
51|---
52|
53|# Greeting-Header
54|
55|Uhrzeit-basierter Begrüßungstext.
56|
57|| Uhrzeit | Begrüßung |
58||---------|-----------|
59|| 5:00–11:59 | Guten Morgen |
60|| 12:00–17:59 | Guten Tag |
61|| 18:00–4:59 | Guten Abend |
62|
63|Format: "Guten Abend, {UserName}".
64|
65|Schriftgröße: 28px, bold, weiß.
66|
67|---
68|
69|# Schnellzugriff
70|
71|6 quadratische Cards in 3 Spalten (2 Reihen).
72|
73|Cards sind breiter als hoch (rechteckig, ~300x80px).
74|
75|Inhalt: kleines Cover links + Titel + Metainfo rechts.
76|
77|Standard-Cards:
78|
79|1. Lieblingssongs (Favoriten)
80|2. Zuletzt gehörte Playlist
81|3. Zuletzt gehörtes Album
82|4. Eigene Sammlung
83|5. Downloads
84|6. Smart Playlist
85|
86|Klick startet Wiedergabe oder öffnet Detailseite.
87|
88|---
89|
90|# Section-Komponente
91|
92|Jede Section folgt demselben Muster.
93|
94|```
95|Section-Header
96|+---------------------------+----------+
97|| Section-Titel             | Alle     |
98|| (20px bold)               | anzeigen →|
99|+---------------------------+----------+
100|[horizontal scrollbar Card-Reihe]
101|+----+ +----+ +----+ +----+ +----+
102||    | |    | |    | |    | |    |  → (Scroll-Pfeile)
103|+----+ +----+ +----+ +----+ +----+
104|```
105|
106|- Card-Größe: 160x160 px (Cover) + Text darunter
107|- Gap: 16 px zwischen Cards
108|- Overflow: hidden, horizontal scrollbar
109|- Scroll-Pfeile erscheinen bei Hover links/rechts
110|- "Alle anzeigen"-Link rechts öffnet vollständige Liste
111|
112|---
113|
114|# Sections (Default-Reihenfolge)
115|
116|## 1. Zuletzt gehört
117|
118|Zuletzt gespielte Alben und Playlists.
119|
120|Data: `GET /Items?SortBy=DatePlayed&SortOrder=Descending&Limit=12`
121|
122|## 2. Für dich erstellt
123|
124|Automatisch generierte Mix-Tapes.
125|
126|- Mix 1–6 basierend auf Lieblingsgenres
127|- "Dein Mixtape X" mit Künstler-Beispielen im Untertitel
128|- "Alle Arten von..." Card
129|
130|Data: LifeHub generiert Mixes aus Hörverlauf + Genres.
131|
132|## 3. Neu in deiner Bibliothek
133|
134|Kürzlich hinzugefügte Alben.
135|
136|Data: `GET /Items?SortBy=DateCreated&SortOrder=Descending&IncludeItemTypes=MusicAlbum&Limit=12`
137|
138|## 4. Lieblingskünstler
139|
140|Häufig gehörte Künstler.
141|
142|Data: `GET /Artists?SortBy=PlayCount&SortOrder=Descending&Limit=12`
143|
144|## 5. Lieblingsalben
145|
146|Häufig gehörte Alben.
147|
148|Data: `GET /Items?IncludeItemTypes=MusicAlbum&SortBy=PlayCount&Limit=12`
149|
150|## 6. Entdecken
151|
152|Neue Musik innerhalb der eigenen Bibliothek.
153|
154|Songs, die noch nie gespielt wurden aus Lieblingsgenres.
155|
156|## 7. Fortsetzen
157|
158|- Zuletzt abgespielte Alben
159|- Unvollständig gehörte Alben (Progress > 0% und < 90%)
160|- Zuletzt gehörte Playlists
161|
162|---
163|
164|# Empfehlungen
165|
166|Basierend auf:
167|
168|- Hörverlauf (PlayCount, DatePlayed)
169|- Lieblingskünstlern
170|- Lieblingsgenres
171|- Bewertungen
172|
173|LifeHub generiert Empfehlungen aus der eigenen Bibliothek.
174|
175|Keine externen Online-Empfehlungen erforderlich.
176|
177|---
178|
179|# Highlight-Banner
180|
181|Optional oben auf der Startseite.
182|
183|Promotet neue Features oder LifeHub-spezifische Inhalte.
184|
185|Beispiel: "Die größten Schlager-Stars und Hits" mit CTA-Button.
186|
187|Kann vom User ausgeblendet werden.
188|
189|---
190|
191|# Dashboard Logik (Data Fetching)
192|
193|Jede Section nutzt eigene TanStack Query.
194|
195|```typescript
196|const { data: recentlyPlayed } = useQuery({
197|  queryKey: ['music', 'recently-played'],
198|  queryFn: () => jellyfinApi.getItems({ sortBy: 'DatePlayed', limit: 12 }),
199|  staleTime: 60_000,
200|});
201|
202|const { data: newReleases } = useQuery({
203|  queryKey: ['music', 'new-in-library'],
204|  queryFn: () => jellyfinApi.getItems({ sortBy: 'DateCreated', includeItemTypes: ['MusicAlbum'], limit: 12 }),
205|  staleTime: 60_000,
206|});
207|```
208|
209|Sections laden unabhängig voneinander (kein Blocking).
210|
211|Skeleton-Shimmer während des Ladens.
212|
213|---
214|
215|# Animationen
216|
217|- Section-Laden: Fade-In gestaffelt, 100 ms pro Section
218|- Card-Hover: Scale 1.0 → 1.02 (200ms ease-out) + Play-Button-Overlay
219|- Skeleton-Shimmer: Pulsing-Animation (1.5s infinite)
220|- ScrollRow-Pfeile: Fade-In bei Hover (150ms)
221|
222|---
223|
224|# Responsive Verhalten
225|
226|Card-Raster passt sich an Fensterbreite an.
227|
228|| Fensterbreite | Schnellzugriff | Card-Rows |
229||---------------|---------------|-----------|
230|| ≥ 1400px | 3 Spalten | 6 Cards sichtbar |
231|| 1200–1399px | 3 Spalten | 5 Cards |
232|| 1000–1199px | 2 Spalten | 4 Cards |
233|| 700–999px | 2 Spalten | 3 Cards |
234|| < 700px | 1 Spalte | 2 Cards |
235|
236|---
237|
238|# Personalisierung
239|
240|User kann Sections:
241|
242|- verschieben (Drag-Reihenfolge)
243|- ausblenden
244|- anheften (immer oben)
245|
246|Einstellungen gespeichert in LifeHub-DB.
247|
248|---
249|
250|# Jellyfin Integration
251|
252|Verwendet:
253|
254|- Bibliothek (Items, Artists, Albums)
255|- Verlauf (UserData, DatePlayed)
256|- Metadaten
257|
258|LifeHub ergänzt:
259|
260|- Statistiken (häufigste Genres, Hörzeiten)
261|- Empfehlungen (aus lokaler Bibliothek)
262|- Personalisierung (Section-Reihenfolge)
263|- Mix-Generierung
264|
265|---
266|
267|# Zukünftige Erweiterungen
268|
269|Dieses Dokument wird später detailliert beschreiben
270|
271|- dynamische Section-Anzahl basierend auf Hörverhalten
272|- Jahresrückblick-Widgets (Wrapped-Style)
273|- Social Features (Freunde hören)
274|- Weather-based Recommendations
275|

---

# Home Dashboard

Das Home Dashboard ist der persönliche Einstiegspunkt der Music Domain. Es basiert vollständig auf den lokalen Jellyfin-Daten sowie den von LifeHub erzeugten Nutzungsdaten.

---

# Dashboard Aufbau
Das Dashboard besteht aus modularen Sektionen. Jede Sektion kann zukünftig verschoben, ausgeblendet, angeheftet oder neu angeordnet werden.

---

# Standardbereiche
Continue Listening, Quick Access, Zuletzt hinzugefügt, Zuletzt gespielt, Favoriten, Empfohlene Alben, Empfohlene Künstler, Empfohlene Playlists, Neue Musik, Eigene Sammlungen, Statistiken

---

# Continue Listening
Zeigt angefangene Alben, laufende Playlists, Hörbücher, Podcasts. Die Wiedergabe kann exakt an der letzten Position fortgesetzt werden.

---

# Empfehlungen
Basieren auf Hörverlauf, Lieblingsgenres, Lieblingskünstlern, Bewertungen, Wiedergabehäufigkeit, Tageszeit, Wochentag. Keine externen Cloud-Dienste.

---

# Quick Access
Automatisch erzeugte Schnellzugriffe: Favoriten, Downloads, Zuletzt verwendete Playlists, Eigene Sammlungen

---

# Dashboard Karten
Alle Bereiche verwenden dieselben Card-Komponenten: Card Header, Content, Actions, Footer

---

# Lazy Loading
Sektionen werden unabhängig geladen. Nicht sichtbare Bereiche werden verzögert gerendert.

---

# Performance
Virtuelle Listen, Asynchrones Nachladen, Bild-Caching, Vorberechnung von Empfehlungen

---

# Erweiterung später
Dashboard Personalisierung, Widgetsystem, Eigene Dashboardseiten, Statistikmodule, Recommendation Engine
