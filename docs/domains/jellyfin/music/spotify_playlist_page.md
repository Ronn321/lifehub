1|# Playlist Page
2|
3|Version 0.2
4|
5|---
6|
7|# Ziel
8|
9|Die Playlistseite dient der Verwaltung und Wiedergabe beliebiger Musiksammlungen.
10|
11|---
12|
13|# Aufbau
14|
15|Die Seite besteht aus
16|
17|- Playlist Header
18|- Aktionsleiste
19|- Filter-Chips
20|- Songliste
21|- Zusatzinformationen
22|
23|---
24|
25|# Playlist Header
26|
27|## Layout
28|
29|```
30|+-----------------------------------------------------------+
31||                                                           |
32||  +----------+   Playlist                                  |
33||  |          |                                             |
34||  |  Cover   |   Lieblingssongs                            |
35||  | 232x232  |                                             |
36||  |          |   dasilva.robert468 • 2.197 Songs,          |
37||  +----------+   146 Std. 37 Min.                          |
38||                                                           |
39||                [▶ Play]  [⇄ Shuffle] [⤓ Download] [⋯]    |
40||                                                           |
41|+-----------------------------------------------------------+
42||  Rock  Rap  Klassik  Pop  Indie  Jazz  Blues  ...         |
43|+-----------------------------------------------------------+
44||  #  | Titel              | Album        | Hinzugefügt  |♥| Zeit |
45|+-----------------------------------------------------------+
46|```
47|
48|## Header-Elemente
49|
50|- Cover: 232x232 px, quadratisch, 4px Radius
51|- Typ-Label: "Playlist" — 12px, uppercase, secondary
52|- Titel: 28px, bold, weiß
53|- Beschreibung: 14px, secondary — "Besitzer • n Songs, X Std. Y Min."
54|- Header-Gradient: Farbverlauf aus Cover-Farbe → #121212
55|
56|## Header-Gradient
57|
58|Der Hintergrund des Headers nutzt einen Farbverlauf.
59|
60|Die Farben werden aus dem Cover extrahiert (Canvas-API, dominante Farbe).
61|
62|Übergang: Cover-Farbe (Top) → transparent → #121212 (Bottom).
63|
64|Beim Scrollen wird der Gradient durch backdrop-filter: blur(12px) ersetzt.
65|
66|---
67|
68|# Header Aktionen
69|
70|## Play-Button
71|
72|Großer grüner Kreis (32px Durchmesser, Akzent-Farbe).
73|
74|Startet Wiedergabe ab erstem Song.
75|
76|Bei bereits spielender Playlist → Pause-Icon.
77|
78|## Shuffle-Button
79|
80|Akzentfarbe aktiv, wenn Shuffle an.
81|
82|Startet Zufallswiedergabe.
83|
84|## Download-Button
85|
86|Lädt alle Songs der Playlist für Offline-Nutzung herunter.
87|
88|Zeigt Fortschrittsbalken bei aktivem Download.
89|
90|## More-Menü (⋯)
91|
92|- Bearbeiten
93|- Teilen
94|- Zu Sammlung hinzufügen
95|- Als Smart Playlist speichern
96|- Duplizieren
97|- Löschen
98|
99|---
100|
101|# Filter-Chips
102|
103|Unter dem Header befinden sich Genre-Filter-Chips.
104|
105|Chips werden automatisch aus den Genres der Playlist-Songs generiert.
106|
107|Beispiele: Rock, Rap, Klassik, Pop, Indie, Jazz, Blues, Electropop, Soundtrack.
108|
109|- Aussehen: Pill-shaped, Hintergrund #2A2A2A, Text 12px weiß
110|- Aktiv: Hintergrund weiß, Text schwarz
111|- Mehrere Chips gleichzeitig aktivierbar (AND-Filter)
112|
113|---
114|
115|# Songliste
116|
117|## Spaltenlayout
118|
119|| Spalte | Breite | Inhalt |
120||--------|--------|--------|
121|| # | 40px | Index oder Play-Icon (Hover) oder Soundbar (Playing) |
122|| Titel | flex (min 200px) | Cover 40x40 + Titel (bold) + Künstler (secondary) |
123|| Album | 25% | Album-Name (klickbar) |
124|| Hinzugefügt am | 120px | "vor X Tagen" oder Datum |
125|| ♥ | 40px | Favorit-Icon |
126|| Dauer | 60px | m:ss Format |
127|
128|## Hover-Verhalten
129|
130|- Zeile: Hintergrund wird #2A2A2A
131|- Index-Zahl: wird zu Play-Icon (▶)
132|- Herz-Icon: erscheint (grau → grün bei Liked)
133|- More-Button (⋯): erscheint am Zeilenende
134|
135|## Currently-Playing-Indikator
136|
137|Wenn ein Song aus dieser Playlist aktuell spielt:
138|
139|- Index-Zahl wird durch animierte Soundbar (3 Balken) ersetzt
140|- Titel wird in Akzentfarbe (Grün) dargestellt
141|- Pause-Icon bei pausierter Wiedergabe
142|
143|---
144|
145|# Aktionen pro Song
146|
147|## Doppelklick
148|
149|Startet Wiedergabe dieser Playlist ab diesem Song.
150|
151|## Rechtsklick / Kontextmenü
152|
153|- Abspielen
154|- Als nächstes abspielen
155|- Zur Queue hinzufügen
156|- Zur Playlist hinzufügen (Submenu)
157|- Zur Sammlung hinzufügen
158|- Favorit (Herz toggeln)
159|- Herunterladen
160|- Informationen anzeigen
161|- Teilen
162|- Zur Künstlerseite
163|- Zur Albumseite
164|- Aus Playlist entfernen
165|
166|---
167|
168|# Sortierung
169|
170|Klick auf Spaltenüberschrift sortiert die Liste.
171|
172|| Spalte | Standard-Sortierung |
173||--------|-------------------|
174|| # | Playlist-Reihenfolge (Default) |
175|| Titel | Alphabetisch A→Z |
176|| Album | Alphabetisch A→Z |
177|| Hinzugefügt am | Neueste zuerst |
178|| Dauer | Kurzeste zuerst |
179|
180|Toggle bei erneutem Klick: ascending ↔ descending.
181|
182|Sort-Indikator: Pfeil-Icon (▲ / ▼) in aktiver Spalte.
183|
184|---
185|
186|# Drag & Drop
187|
188|Songs können innerhalb der Playlist neu angeordnet werden.
189|
190|- Drag-Handle: gesamte Zeile ist draggable
191|- Ghost-Element folgt dem Mauszeiger
192|- Zielzeile zeigt Einfüge-Marker (Linie in Akzentfarbe)
193|- Bei Drop: API-Call an Jellyfin mit neuer Position
194|
195|```
196|POST /Playlists/{id}/Items
197|{ "Id": "{songId}", "newPosition": N }
198|```
199|
200|---
201|
202|# Mehrfachauswahl
203|
204|- Strg+Klick: einzelne Songs toggeln
205|- Shift+Klick: Bereich auswählen
206|- Strg+A: alle Songs auswählen
207|- Klick auf leeren Bereich: Auswahl aufheben
208|
209|## Bulk-Aktionen bei Auswahl
210|
211|- Ausgewählte abspielen
212|- Zur Queue hinzufügen
213|- Zur Playlist hinzufügen
214|- Herunterladen
215|- Aus Playlist entfernen
216|- Favorit toggeln
217|
218|Auswahl-Leiste erscheint oben über der Songliste mit Anzahl und Aktionen.
219|
220|---
221|
222|# Playlisttypen
223|
224|| Typ | Badge | Quelle |
225||------|-------|--------|
226|| Eigene Playlist | "Playlist" | LifeHub |
227|| Jellyfin-Playlist | "Playlist" | Jellyfin |
228|| Smart Playlist | "Smart" | LifeHub (regelbasiert) |
229|| Geteilte Playlist | "Geteilt" | LifeHub (Multi-User) |
230|| Importierte Playlist | "Importiert" | M3U/M3U8-Import |
231|
232|---
233|
234|# Smart Playlists
235|
236|Regelbasierte, automatisch generierte Playlists.
237|
238|Beispiele:
239|
240|- "Zuletzt gespielt" (letzten 30 Tage)
241|- "Am meisten gehört" (Top 100)
242|- "Favoriten mit Genre: Rock"
243|- "Nie gehörte Songs aus Lieblingsalben"
244|
245|Regel-Editor:
246|
247|- Bedingungen: Genre, Künstler, Jahr, Favorit, PlayCount, DateAdded
248|- Operatoren: AND, OR, NOT
249|- Sortierung: Random, Newest, Most Played
250|- Auto-Update: Playlist aktualisiert sich bei Bibliotheksänderung
251|
252|---
253|
254|# Kollaborative Playlists
255|
256|Mehrere LifeHub-User können eine Playlist gemeinsam bearbeiten.
257|
258|- User-Verwaltung im Playlist-Edit-Dialog
259|- Hinzufügen/Entfernen von Songs wird allen Usern angezeigt
260|- Änderungen werden über WebSocket synchronisiert
261|- Aktivitäts-Log: "wer hat was wann hinzugefügt"
262|
263|---
264|
265|# Empty State
266|
267|Wenn die Playlist keine Songs enthält:
268|
269|```
270|Diese Playlist ist leer.
271|Suche nach Songs, um sie hinzuzufügen.
272|
273|[ Songs durchsuchen ]
274|```
275|
276|---
277|
278|# Informationen
279|
280|Optional im More-Menü unter "Informationen":
281|
282|- Erstellungsdatum
283|- Änderungsdatum
284|- Gesamtanzahl Songs
285|- Gesamtdauer
286|- Tags
287|- Beschreibung
288|- Statistiken (am häufigsten gespielte Künstler, Genre-Verteilung)
289|
290|---
291|
292|# Jellyfin Integration
293|
294|## API-Endpoints
295|
296|```
297|GET    /Playlists/{id}/Items          # Playlist-Inhalt abrufen
298|POST   /Playlists                      # Neue Playlist erstellen
299|POST   /Playlists/{id}/Items           # Song hinzufügen
300|DELETE /Playlists/{id}/Items           # Song entfernen
301|POST   /Playlists/{id}/Items/{pos}     # Song verschieben
302|```
303|
304|## Synchronisation
305|
306|Jellyfin synchronisiert:
307|
308|- Playlist-Inhalt
309|- Reihenfolge
310|- Cover
311|- Metadaten
312|
313|LifeHub ergänzt:
314|
315|- Notizen
316|- Bewertungen
317|- Kategorien
318|- Sammlungen
319|- Smart-Playlist-Regeln
320|
321|---
322|
323|# Animationen
324|
325|- Header-Gradient: smooth Übergang beim Scrollen (backdrop-filter wird aktiviert bei scrollY > 232px)
326|- Songliste: Fade-In gestaffelt (stagger 20ms pro Zeile)
327|- Filter-Chips: Slide-In von oben (150ms)
328|- Currently-Playing-Soundbar: kontinuierliche Animation
329|
330|---
331|
332|# Zukünftige Erweiterungen
333|
334|Dieses Dokument wird später detailliert beschreiben
335|
336|- kollaborative Bearbeitung in Echtzeit (CRDT)
337|- Playlist-Analytics-Dashboard
338|- Playlist-Export (M3U, XSPF)
339|- automatische Playlist-Cleanup-Werkzeuge
340|

---

# Playlist Header

Der Header bildet den Einstiegspunkt jeder Playlist.

## Header Inhalte
Großes Cover, Titel, Beschreibung, Besitzer, Anzahl Songs, Gesamtdauer, Erstellungsdatum, Zuletzt geändert

## Header Aktionen
Play, Shuffle, Download, Bearbeiten, Teilen, Kontextmenü

---

# Songliste
Die Songliste verwendet virtuelle Tabellen.

## Tabellenlayout
#, Cover, Titel, Interpret, Album, Genre, Dauer, Bewertung, Favorit, Hinzugefügt

## Tabellenregeln
Sortierbar, Filterbar, Virtuell gerendert, Mehrfachauswahl

---

# Song Aktionen
Play, Queue, Playlist hinzufügen, Favorisieren, Download, Informationen, Bearbeiten, Löschen

---

# Mehrfachaktionen
Zur Playlist/Queue hinzufügen, Download, Löschen, Tags bearbeiten

---

# Kontextmenü Playlist
Umbenennen, Beschreibung, Cover ändern, Exportieren, Teilen, Löschen

---

# Kontextmenü Song
Abspielen, Zur Queue, Album öffnen, Interpret öffnen, Metadaten, Dateispeicherort

---

# Covergrößen
Klein, Normal, Groß — automatische Skalierung

---

# Virtualisierung
Songlisten rendern ausschließlich sichtbare Zeilen.

---

# Jellyfin Datenmodell
Playlist, Playlist Items/Order/Images/Metadata

---

# Erweiterung später
Playlist Header Layout, Sticky Header, Tabelleninteraktionen, Drag & Drop, Playlist Statistiken
