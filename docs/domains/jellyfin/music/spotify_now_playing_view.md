1|1|# Now Playing View
2|2|
3|3|Version 0.2
4|4|
5|5|---
6|6|
7|7|# Ziel
8|8|
9|9|Die Now Playing View erweitert den Player um zusätzliche Informationen zum aktuell wiedergegebenen Titel.
10|10|
11|11|Sie erscheint als rechte Seitenleiste, Vollbild oder Mini-Player.
12|12|
13|13|---
14|14|
15|15|# Modi
16|16|
17|17|Die Now Playing View besitzt drei Modi.
18|18|
19|19|## Modus 1: Right Sidebar (320px)
20|20|
21|21|```
22|22|+---------------------------+
23|23|| Now Playing | Lyrics |Queue|  ← Tabs
24|24|+---------------------------+
25|25||                           |
26|26||    +-----------------+    |
27|27||    |                 |    |
28|28||    |   Album-Cover   |    |
29|29||    |    (280x280)    |    |
30|30||    |                 |    |
31|31||    +-----------------+    |
32|32||                           |
33|33||    Songtitel              |
34|34||    Künstler • Album       |
35|35||                           |
36|36||    [Abspielen] [♥] [⋯]    |
37|37||                           |
38|38|+---------------------------+
39|39|   Right Sidebar, 320px
40|40|```
41|41|
42|42|Sichtbar bei Fenster ≥ 1280px.
43|43|
44|44|Toggle über Now-Playing-Icon in Player-Bar.
45|45|
46|46|## Modus 2: Vollbild (F11)
47|47|
48|48|```
49|49|+-----------------------------------------------------------+
50|50||                                                           |
51|51||                    +------------------+                   |
52|52||                    |                  |                   |
53|53||                    |  Album-Cover     |                   |
54|54||                    |   (400x400)      |                   |
55|55||                    |                  |                   |
56|56||                    +------------------+                   |
57|57||                                                           |
58|58||                   Songtitel (28px)                        |
59|59||                   Künstler • Album                        |
60|60||                                                           |
61|61||              ████████████░░░░░░░░░░  2:34 / 4:07          |
62|62||                                                           |
63|63||           [⇄] [⏮] [▶] [⏭] [↻]                            |
64|64||                                                           |
65|65|+-----------------------------------------------------------+
66|66|```
67|67|
68|68|Background: vergrößertes, unscharfes Cover (Blur 60px, Opacity 30%).
69|69|
70|70|## Modus 3: Mini-Player
71|71|
72|72|```
73|73|+---------------------------+
74|74|| [Cover] Songtitel     [×] |
75|75||          Künstler • [♥]   |
76|76|+---------------------------+
77|77|```
78|78|
79|79|Abgekoppelter schwebender Player rechts unten.
80|80|
81|81|Kleinste Variante (320x80px).
82|82|
83|83|Kann unabhängig vom Hauptfenster positioniert werden.
84|84|
85|85|---
86|86|
87|87|# Aufbau
88|88|
89|89|Die Ansicht besteht aus
90|90|
91|91|- Tabs-Leiste
92|92|- Albumbereich
93|93|- Songinformationen
94|94|- Queue (Tab)
95|95|- Lyrics (Tab)
96|96|- Zusatzinformationen
97|97|
98|98|---
99|99|
100|100|# Tabs
101|101|
102|102|Oben in der Now Playing View.
103|103|
104|104|| Tab | Inhalt |
105|105||-----|--------|
106|106|| Now Playing | Cover, Track-Info, Controls |
107|107|| Lyrics | Synchronisierte Liedtexte |
108|108|| Queue | Warteschlange |
109|109|
110|110|Aktiver Tab: Text weiß, Bottom-Border in Akzentfarbe.
111|111|
112|112|Tab-Wechsel: Cross-Fade 150ms.
113|113|
114|114|---
115|115|
116|116|# Albumbereich
117|117|
118|118|Zeigt
119|119|
120|120|- großes Albumcover (280x280px Sidebar, 400x400px Vollbild)
121|121|- Titel (16px bold)
122|122|- Künstler (14px sekundär, klickbar → Künstlerseite)
123|123|- Album (14px sekundär, klickbar → Albumseite)
124|124|
125|125|---
126|126|
127|127|# Cover-Übergang
128|128|
129|129|Beim Track-Wechsel: Cross-Fade Animation.
130|130|
131|131|- Dauer: 300ms
132|132|- Easing: ease-in-out (cubic-bezier(0.4, 0, 0.2, 1))
133|133|- Altes Cover fade-out, neues Cover fade-in gleichzeitig
134|134|- Background-Gradient wechselt mit neuen Cover-Farben (500ms transition)
135|135|
136|136|---
137|137|
138|138|# Hintergrundeffekte
139|139|
140|140|## Blur-Backdrop
141|141|
142|142|Das Albumcover wird im Hintergrund vergrößert dargestellt.
143|143|
144|144|```css
145|145|.np-background {
146|146|  background-image: url(cover-url);
147|147|  background-size: cover;
148|148|  filter: blur(60px);
149|149|  opacity: 0.3;
150|150|  transform: scale(1.2);
151|151|}
152|152|```
153|153|
154|154|## Dynamischer Gradient
155|155|
156|156|Die dominante Farbe des Covers wird extrahiert und als Hintergrund-Gradient verwendet.
157|157|
158|158|Übergang: Cover-Farbe → transparent → #121212.
159|159|
160|160|---
161|161|
162|162|# Farbextraktion
163|163|
164|164|Die dominante Farbe wird aus dem Cover extrahiert.
165|165|
166|166|## Methode
167|167|
168|168|```javascript
169|169|// Canvas-basierte Farbextraktion
170|170|const canvas = document.createElement('canvas');
171|171|const ctx = canvas.getContext('2d');
172|172|canvas.width = 50;  // klein für Performance
173|173|canvas.height = 50;
174|174|ctx.drawImage(coverImg, 0, 0, 50, 50);
175|175|const data = ctx.getImageData(0, 0, 50, 50).data;
176|176|
177|177|// Dominante Farbe via k-means oder Color Thief
178|178|const dominantColor = colorThief.getColor(coverImg);
179|179|// → [r, g, b]
180|180|```
181|181|
182|182|Wird beim Track-Wechsel neu berechnet.
183|183|
184|184|Gecacht pro Album-Id.
185|185|
186|186|---
187|187|
188|188|# Songinformationen
189|189|
190|190|Anzeige unter dem Cover.
191|191|
192|192|- Genre
193|193|- Erscheinungsjahr
194|194|- Dauer
195|195|- Bewertung (Sterne 1–5)
196|196|- Favoritenstatus (Herz)
197|197|- Wiedergabeanzahl
198|198|
199|199|---
200|200|
201|201|# Queue (Tab)
202|202|
203|203|Zeigt die Warteschlange.
204|204|
205|205|## Aufbau
206|206|
207|207|```
208|208|+---------------------------+
209|209|| AKTUELL                   |
210|210|| ▶ Song A   Künstler A  ♫  |  ← grün markiert
211|211|+---------------------------+
212|212|| ALS NÄCHSTES              |
213|213||   Song B   Künstler B     |
214|214||   Song C   Künstler C     |
215|215||   Song D   Künstler D     |
216|216|+---------------------------+
217|217|| ZULETZT GEHÖRT            |
218|218||   Song X   Künstler X     |  ← ausgegraut
219|219||   Song Y   Künstler Y     |
220|220|+---------------------------+
221|221|```
222|222|
223|223|- Now Playing: grüne Textfarbe, Soundbar-Animation
224|224|- Next Up: normale Textfarbe
225|225|- History: ausgegraute Textfarbe
226|226|
227|227|## Queue-Aktionen
228|228|
229|229|| Aktion | Wie |
230|230||--------|-----|
231|231|| Verschieben | Drag & Drop |
232|232|| Entfernen | ✕ bei Hover oder Entf-Taste |
233|233|| Direkt abspielen | Doppelklick |
234|234|| Leeren | Button oben |
235|235|
236|236|Queue ist virtualisiert bei > 100 Einträgen.
237|237|
238|238|---
239|239|
240|240|# Lyrics
241|241|
242|242|Optionales Modul als Tab oder Panel.
243|243|
244|244|## Synchronisierte Liedtexte
245|245|
246|246|- Aktuelle Zeile: hervorgehoben (größer, weiß, bold)
247|247|- Kommende Zeilen: sekundär, leicht ausgegraut
248|248|- Vergangene Zeilen: stark ausgegraut
249|249|- Auto-Scroll: folgt der aktuellen Zeile
250|250|- Manuelles Scrollen unterbricht Auto-Scroll für 5s
251|251|
252|252|## Quelle
253|253|
254|254|- Jellyfin: LRC-Dateien oder eingebettete Lyrics
255|255|- LifeHub: optionaler Fetch von externen Lyrics-APIs
256|256|
257|257|## Fallback
258|258|
259|259|Wenn keine synchronisierten Lyrics vorhanden:
260|260|
261|261|- Plain-Text anzeigen (falls verfügbar)
262|262|- "Keine Lyrics verfügbar" mit Option zum manuellen Hinzufügen
263|263|
264|264|---
265|265|
266|266|# Ähnliche Musikvideos
267|267|
268|268|Section unter dem Cover (wie auf Spotify-Screenshot zu sehen).
269|269|
270|270|Horizontal scrollbare Card-Reihe.
271|271|
272|272|Zeigt verwandte Musikvideos basierend auf:
273|273|
274|274|- Selben Künstler
275|275|- Selben Album
276|276|- Ähnliche Songs
277|277|
278|278|```
279|279|Ähnliche Musikvideos
280|280|+------+ +------+ +------+ +------+
281|281|| Vid1 | | Vid2 | | Vid3 | | Vid4 |  →
282|282|+------+ +------+ +------+ +------+
283|283|```
284|284|
285|285|Nur verfügbar wenn Video-Content in Jellyfin vorhanden.
286|286|
287|287|---
288|288|
289|289|# Künstlerinformationen
290|290|
291|291|Optional im Now-Playing-Tab.
292|292|
293|293|- Biografie (aus Jellyfin)
294|294|- Weitere Alben (Card-Reihe)
295|295|- Ähnliche Künstler (Card-Reihe)
296|296|
297|297|---
298|298|
299|299|# Albuminformationen
300|300|
301|301|Optional.
302|302|
303|303|- Trackliste des Albums (klickbar)
304|304|- Veröffentlichungsdatum
305|305|- Genre
306|306|- Cover
307|307|
308|308|---
309|309|
310|310|# Bedienung
311|311|
312|312|Unterstützt
313|313|
314|314|- Scrollen (eigenständiges Scrollen)
315|315|- Kontextmenüs (Rechtsklick auf Songs)
316|316|- Drag & Drop (Queue umsortieren)
317|317|- Tastatursteuerung (Pfeiltasten durch Queue)
318|318|
319|319|---
320|320|
321|321|# Accessibility
322|322|
323|323|- role="region", aria-label="Aktuelle Wiedergabe"
324|324|- Tabs: role="tablist", role="tab" mit aria-selected
325|325|- Queue-Liste: role="list", role="listitem"
326|326|- Cover: alt-Text mit Album + Künstler
327|327|- Keyboard: Tab durch Tabs, Pfeiltasten durch Queue
328|328|
329|329|---
330|330|
331|331|# Performance
332|332|
333|333|- Lyrics: Lazy-Loading erst bei Tab-Wechsel
334|334|- Queue: virtualisiert (@tanstack/react-virtual)
335|335|- Cover: gecacht pro Album-Id
336|336|- Debounce auf Tab-Wechsel (100ms)
337|337|
338|338|---
339|339|
340|340|# Jellyfin Integration
341|341|
342|342|Lädt:
343|343|
344|344|- Cover (/Items/{id}/Images/Primary)
345|345|- Metadaten (/Items/{id})
346|346|- Lyrics (eingebettet oder /Items/{id}/Lyrics)
347|347|- Queue (Client-State, nicht Jellyfin)
348|348|- Künstlerinformationen (/Artists/{id})
349|349|
350|350|LifeHub ergänzt:
351|351|
352|352|- Bewertungen
353|353|- Notizen
354|354|- Sammlungen
355|355|- Empfehlungen
356|356|
357|357|---
358|358|
359|359|# Zukünftige Erweiterungen
360|360|
361|361|Dieses Dokument wird später detailliert beschreiben
362|362|
363|363|- Karaoke-Modus (Instrumental + hervorgehobene Lyrics)
364|364|- Live-Audio-Visualizer im Vollbild
365|365|- 3D-Cover-Rotation
366|366|- Multi-Room-Audio-Synchronisation
367|367|- Overlays für Drittanbieter-Plugins
368|368|
369|
370|---
371|
372|# Layout
373|Die Now Playing View ist eine eigenständige rechte Seitenleiste. Sie kann geöffnet und geschlossen werden.
374|
375|---
376|
377|# Bereiche
378|Album, Songinformationen, Lyrics, Queue, Empfehlungen, Zusätzliche Informationen
379|
380|---
381|
382|# Albumbereich
383|Großes Cover, Titel, Interpret, Album, Favorit, Bewertung
384|
385|---
386|
387|# Queue Darstellung
388|Aktueller Titel, Nächste Titel, Bereits abgespielte Titel
389|
390|---
391|
392|# Queue Aktionen
393|Entfernen, Verschieben, Direkt starten, Mehrfachauswahl, Queue löschen
394|
395|---
396|
397|# Lyrics Modul
398|Synchronisierte/Nicht synchronisierte Lyrics, Scroll Sync, Aktuelle Zeile markieren
399|
400|---
401|
402|# Songinformationen
403|Genre, Jahr, Bitrate, Samplingrate, Codec, Dauer, Dateigröße
404|
405|---
406|
407|# Albuminformationen
408|Trackliste, Veröffentlichung, Label, Genre, Anzahl Titel
409|
410|---
411|
412|# Empfehlungen
413|Ähnliche Songs, Weitere Alben, Ähnliche Künstler, Verwandte Genres
414|
415|---
416|
417|# Kontextmenüs
418|Song, Album, Interpret, Lyrics, Queue
419|
420|---
421|
422|# Covergrößen
423|Groß, Extra Groß — automatische Anpassung an Seitenbreite
424|
425|---
426|
427|# Jellyfin Datenmodell
428|Now Playing, Playback Session, Queue, Track/Album/Artist Metadata, Lyrics
429|
430|---
431|
432|# Virtualisierung
433|Queue verwendet virtuelle Listen. Empfehlungen asynchron laden.
434|
435|---
436|
437|# Erweiterung später
438|Responsive Verhalten, Albumanimationen, Hintergrundeffekte, Farbextraktion, Übergänge, Blur, Performance
439|

---

# Mini Player

Version 0.3 — Ergänzung

## Ziel

Der Mini Player ist eine kompakte Variante des Playback Bar für Situationen, in denen der volle Player zu viel Platz einnimmt.

Er erscheint als schwebendes Element und kann vom Benutzer verschoben werden.

---

# Auslöser

Der Mini Player kann aktiviert werden durch:
- Klick auf "Mini-Player" Button in der Player Right Section
- Tastaturkürzel (z.B. Ctrl+M)
- Automatisch beim Verlassen der Music Domain (zukünftig)

---

# Layout

```
┌──────────────────────────────────────┐
│ ┌────┐ 🎵 Titel                     │
│ │    │ 👤 Künstler                   │
│ │ 56 │ ─────────────────────        │
│ │ x  │ ▶  ───●───  ▣  ▦            │
│ │ 56 │                              │
│ └────┘                              │
└──────────────────────────────────────┘
```

Größe: ca. 280×120px (Desktop), schwebend, frei verschiebbar.

---

# Bestandteile

| Bereich | Inhalt |
|---------|--------|
| Cover | 56×56px, abgerundet |
| Track Info | Titel (bold), Künstler (secondary) |
| Progress Bar | Schmale 2px Leiste |
| Controls | Play/Pause (zentral), Prev/Next (klein) |
| Extra | Volume (mini), Close-Button |

---

# Verhalten

- Schwebt über allen anderen Fensterinhalten (z-index: 9999)
- Frei verschiebbar per Drag & Drop auf der Titelleiste
- Merkt sich die letzte Position (localStorage)
- Schließen-Button → zurück zum normalen Playback Bar
- Klick auf Cover → öffnet Now Playing View
- Bleibt beim Navigieren zwischen Seiten erhalten

---

# Zustände

| State | Verhalten |
|-------|-----------|
| Sichtbar | Zeigt aktuellen Track + Controls |
| Versteckt | Normaler Playback Bar wird angezeigt |
| Drag | Halbtransparent während des Ziehens |
| Close | Zurück zum normalen Layout |

---

# Desktop Integration

Der Mini Player ersetzt **nicht** den Playback Bar, sondern wird **zusätzlich** eingeblendet.

Wenn der Mini Player aktiv ist, kann der Playback Bar ausgeblendet oder reduziert werden.

---

# Erweiterung später
- Always-on-Top Modus
- Transparenz-Einstellung
- Snapping an Fensterkanten
- Multi-Monitor Support
- Tastatur-Shortcuts für Position
