1|1|# Layout Specification
2|2|
3|3|Version 0.2
4|4|
5|5|---
6|6|
7|7|# Grundaufbau
8|8|
9|9|Der Player besitzt dauerhaft fünf Hauptbereiche.
10|10|
11|11|```
12|12|+-------------------------------------------------------+
13|13|| Top Bar (64px)                                        |
14|14|+--------+----------------------------------------------+
15|15||        |                                              |
16|16||Sidebar |           Main Content                       |
17|17||(240px) |           (fluide, max 1440px)               |
18|18||        |                                              |
19|19||        |                              Right Sidebar   |
20|20||        |                              (320px, opt.)   |
21|21|+--------+----------------------------------------------+
22|22|| Playback Bar (90px)                                   |
23|23|+-------------------------------------------------------+
24|24|```
25|25|
26|26|---
27|27|
28|28|# Pixelmaße
29|29|
30|30|## Hauptbereiche
31|31|
32|32|| Bereich | Breite/Höhe | Verhalten |
33|33||---------|-------------|-----------|
34|34|| Top Bar | 64px hoch | Immer sichtbar |
35|35|| Sidebar | 240px (expanded), 64px (collapsed) | Immer sichtbar |
36|36|| Main Content | fluide | Min 320px, Max 1440px |
37|37|| Right Sidebar | 320px | Optional, ab ≥1280px |
38|38|| Playback Bar | 90px hoch | Immer sichtbar |
39|39|
40|40|## Gesamthöhe
41|41|
42|42|```
43|43|Window Height = Top Bar (64) + Main Content (flex) + Player Bar (90)
44|44|```
45|45|
46|46|Main Content erhält den restlichen vertikalen Platz.
47|47|
48|48|---
49|49|
50|50|# Sidebar
51|51|
52|52|Position: Links.
53|53|
54|54|Immer sichtbar.
55|55|
56|56|Enthält ausschließlich Navigation.
57|57|
58|58|## Interne Struktur
59|59|
60|60|```
61|61|Sidebar (240px)
62|62|├── Nav-Buttons (Home, Suche) — 48px hoch
63|63|├── Bibliotheks-Header (Tabs + Sort) — 48px hoch
64|64|├── Playlist-Liste (scrollbar, flex-1)
65|65|└── Create-Button — 48px hoch
66|66|```
67|67|
68|68|---
69|69|
70|70|# Top Bar
71|71|
72|72|## Aufbau
73|73|
74|74|```
75|75|+-------------------------------------------------------+
76|76|| [⬅] [➡] [🏠] [🔍 Suche...........] [🔔] [👤] [- □ ×] |
77|77|+-------------------------------------------------------+
78|78|   64px hoch
79|79|```
80|80|
81|81|| Element | Breite | Funktion |
82|82||---------|--------|----------|
83|83|| Back-Button | 32px | Vorherige Seite |
84|84|| Forward-Button | 32px | Nächste Seite |
85|85|| Home-Button | 32px | Startseite |
86|86|| Search-Bar | flex (min 200px) | Suche |
87|87|| Notification | 32px | Benachrichtigungen |
88|88|| Avatar | 32px | User-Menu |
89|89|| Window-Controls | 120px | Min/Max/Close |
90|90|
91|91|Enthält: Navigation, Suche, Benutzerprofil, Aktionen.
92|92|
93|93|---
94|94|
95|95|# Main Content
96|96|
97|97|Größter Bereich.
98|98|
99|99|Zeigt: Home, Playlist, Künstler, Album, Bibliothek.
100|100|
101|101|## Grid-System
102|102|
103|103|```css
104|104|.main-content {
105|105|  display: grid;
106|106|  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
107|107|  gap: 16px;
108|108|  padding: 24px;
109|109|}
110|110|```
111|111|
112|112|### Card-Raster
113|113|
114|114|| Fensterbreite | Spalten |
115|115||---------------|---------|
116|116|| ≥ 1400px | 5–6 |
117|117|| 1200–1399px | 4–5 |
118|118|| 1000–1199px | 4 |
119|119|| 700–999px | 3 |
120|120|| < 700px | 2 |
121|121|
122|122|### Song-Listen
123|123|
124|124|Song-Listen bleiben immer volle Breite (keine Spalten-Anpassung).
125|125|
126|126|---
127|127|
128|128|# Right Sidebar
129|129|
130|130|Optional.
131|131|
132|132|Kann anzeigen: Queue, Songinformationen, Lyrics, ähnliche Musik, Albumdetails.
133|133|
134|134|## Sichtbarkeit
135|135|
136|136|| Fensterbreite | Status |
137|137||---------------|--------|
138|138|| ≥ 1280px | Sichtbar (kann manuell geöffnet/geschlossen werden) |
139|139|| < 1280px | Versteckt (Inhalte über Now-Playing-Button aufrufbar) |
140|140|
141|141|## Übergang
142|142|
143|143|Toggle-Animation: Slide-In/Slide-Out 200ms ease-out.
144|144|
145|145|---
146|146|
147|147|# Playback Bar
148|148|
149|149|Immer sichtbar.
150|150|
151|151|Darf niemals verschwinden.
152|152|
153|153|```
154|154|+-------------------------------------------------------+
155|155|| [Cover] Titel   |  [⇄][⏮][▶][⏭][↻]  | [♫][☰][🔊][⛶] |
156|156|| 56x56   Künstler|  Progress-Bar      |                 |
157|157|+-------------------------------------------------------+
158|158|```
159|159|
160|160|| Sektion | Breite | Inhalt |
161|161||---------|--------|--------|
162|162|| Left | 30% | Cover, Titel, Künstler, Like |
163|163|| Center | 40% (max 600px) | Controls + Timeline |
164|164|| Right | 30% | Volume, Queue, Lyrics, Devices, Fullscreen |
165|165|
166|166|---
167|167|
168|168|# Scrollverhalten
169|169|
170|170|| Bereich | Scrollen |
171|171||---------|----------|
172|172|| Sidebar | Eigenständig, vertikal |
173|173|| Main Content | Eigenständig, vertikal |
174|174|| Right Sidebar | Eigenständig, vertikal |
175|175|| Playback Bar | Nie scrollbar |
176|176|
177|177|Jeder Bereich scrollt unabhängig.
178|178|
179|179|---
180|180|
181|181|# Layer
182|182|
183|183|| Ebene | Zweck | z-index |
184|184||-------|-------|---------|
185|185|| 1 | Grundlayout | 0 |
186|186|| 2 | Content | 10 |
187|187|| 3 | Hover / Sticky Headers | 100 |
188|188|| 4 | Dialoge / Modals | 1000 |
189|189|| 5 | Kontextmenüs | 2000 |
190|190|| 6 | Toasts / Overlays | 3000 |
191|191|
192|192|---
193|193|
194|194|# Padding und Margin
195|195|
196|196|## 4er-System
197|197|
198|198|Alle Abstände sind Vielfache von 4px.
199|199|
200|200|| Token | Wert |
201|201||-------|------|
202|202|| xs | 4px |
203|203|| sm | 8px |
204|204|| md | 16px |
205|205|| lg | 24px |
206|206|| xl | 32px |
207|207|
208|208|## Main Content
209|209|
210|210|- Padding: 24px links, rechts, unten
211|211|- Padding: 0 oben (Header ist absolut/ sticky)
212|212|
213|213|## Listen
214|214|
215|215|- Zeilenhöhe: 56px (Song-Row)
216|216|- Zeilen-Padding: 16px links/rechts
217|217|
218|218|## Sidebar
219|219|
220|220|- Padding: 8px links/rechts
221|221|- Item-Abstand: 4px vertikal
222|222|
223|223|---
224|224|
225|225|# Breakpoints
226|226|
227|227|| Breakpoint | Breite | Verhalten |
228|228||------------|--------|-----------|
229|229|| Voll | ≥ 1280px | Alle Bereiche, Right Sidebar sichtbar |
230|230|| Reduziert | 1024–1279px | Sidebar voll, Right Sidebar versteckt |
231|231|| Kompakt | 768–1023px | Sidebar Icons-only (64px) |
232|232|| Klein | 500–767px | Sidebar kompakt, Controls reduziert |
233|233|| Minimal | < 500px | Minimale UI, nur Essentielles |
234|234|
235|235|→ siehe spotify_responsive_behavior.md für Details.
236|236|
237|237|---
238|238|
239|239|# Animationsverhalten bei Layout-Übergängen
240|240|
241|241|## Sidebar Collapse
242|242|
243|243|- Breite: 240px → 64px
244|244|- Dauer: 250ms
245|245|- Easing: ease-in-out (cubic-bezier(0.4, 0, 0.2, 1))
246|246|- Text-Labels: Fade-Out 100ms vor Breiten-Animation
247|247|
248|248|## Right Panel Toggle
249|249|
250|250|- Slide-In/Out: 200ms ease-out
251|251|- Content-Reflow: 200ms
252|252|
253|253|## Page Transitions
254|254|
255|255|- Fade-In: 150ms
256|256|- Slide von rechts: 200ms (neue Seite)
257|257|- Slide nach links: 200ms (Back)
258|258|
259|259|---
260|260|
261|261|# Blur-Effekte
262|262|
263|263|## Player Bar
264|264|
265|265|```css
266|266|.player-bar {
267|267|  background: rgba(18, 18, 18, 0.95);
268|268|  backdrop-filter: blur(16px);
269|269|}
270|270|```
271|271|
272|272|## Sticky Header (beim Scrollen)
273|273|
274|274|```css
275|275|.page-header--scrolled {
276|276|  background: rgba(18, 18, 18, 0.8);
277|277|  backdrop-filter: blur(12px);
278|278|}
279|279|```
280|280|
281|281|## Now Playing Background
282|282|
283|283|```css
284|284|.np-background {
285|285|  filter: blur(60px);
286|286|  opacity: 0.3;
287|287|}
288|288|```
289|289|
290|290|---
291|291|
292|292|# Transparenzen
293|293|
294|294|| Layer | Hintergrund |
295|295||-------|-------------|
296|296|| Basis | #121212 (solid) |
297|297|| Player Bar | rgba(18, 18, 18, 0.95) |
298|298|| Sticky Header | rgba(18, 18, 18, 0.8) |
299|299|| Modal-Overlay | rgba(0, 0, 0, 0.7) |
300|300|| Toast | rgba(18, 18, 18, 0.98) |
301|301|
302|302|---
303|303|
304|304|# Farbverläufe
305|305|
306|306|## Header-Gradient
307|307|
308|308|```css
309|309|.page-header {
310|310|  background: linear-gradient(
311|311|    to bottom,
312|312|    var(--cover-dominant-color, #1E1E1E) 0%,
313|313|    transparent 40%,
314|314|    var(--bg-base) 100%
315|315|  );
316|316|}
317|317|```
318|318|
319|319|Farben werden aus dem Cover extrahiert (Canvas-API, dominante Farbe).
320|320|
321|321|---
322|322|
323|323|# Fensterverhalten
324|324|
325|325|Unterstützt:
326|326|
327|327|- Maximiert
328|328|- Fenstermodus
329|329|- Ultrawide (Content wird zentriert, max 1440px)
330|330|- Mehrere Monitore
331|331|
332|332|---
333|333|
334|334|# Layoutregeln
335|335|
336|336|Navigation bleibt konstant.
337|337|
338|338|Nur Main Content wird ersetzt.
339|339|
340|340|Playback bleibt erhalten.
341|341|
342|342|Right Sidebar ist optional.
343|343|
344|344|---
345|345|
346|346|# Zukünftige Erweiterungen
347|347|
348|348|Dieses Dokument wird später detailliert beschreiben
349|349|
350|350|- Resizable Panels (Sidebar-Breite per Drag änderbar)
351|351|- Dockable Right Sidebar (verschiebbare Position)
352|352|- Custom Layout Presets
353|353|- Picture-in-Picture Layout
354|354|
355|355|---
356|356|
357|357|# Anhang: LifeHub-Integration
358|358|
359|359|Die Music-Shell wird nicht standalone betrieben, sondern in die LifeHub-Oberfläche eingebettet:
360|360|
361|361|```
362|362|LifeHub-Fenster
363|363|+-----+------------------------------------------------------+
364|364||LH   | LifeHub Content Area (padding: 24-32px)               |
365|365||Side | +--------------------------------------------------+ |
366|366||bar  | | MusicPage                                        | |
367|367||256px| | +--- -m-6 ----+                                  | |
368|368||     | | | MusicAppShell (flex: sidebar | content)       | |
369|369||     | | | + Sidebar 240px | Main Content (scrollbar)   | |
370|370||     | | +--------------+                               | |
371|371||     | | + PlayerBar (flex-shrink-0, w-full)             | |
372|372||     | +--------------------------------------------------+ |
373|373|+-----+------------------------------------------------------+
374|374|```
375|375|
376|376|**Wichtige Layout-Prinzipien:**
377|377|
378|378|1. **Negative Margins:** Music-Seite verwendet `-m-6 lg:-m-8` um `p-6 lg:p-8` des LifeHub `<main>`-Containers auszugleichen. Vermeidet schwarze Ränder.
379|379|2. **Player außerhalb von AppShell:** `MusicPlayerWrapper` wird NACH `MusicAppShell` gerendert. AppShell hat keine `playerBar`/`showPlayerBar` Props.
380|380|3. **Seitenhöhe:** Außen `height: calc(100% + 48px)`. Inhalt `flex-1 overflow-y-auto`. Player `flex-shrink-0` (90px).
381|381|4. **Sidebar fixiert:** `position: sticky; top: 0; align-self: start;` — scrollt nicht mit.
382|382|5. **Player-Bar:** `w-full` (kein `fixed`). Breite durch flex-container bestimmt (startet nach LifeHub-Sidebar).
383|383|
384|384|
385|385|---
386|386|
387|387|# Desktop Grid
388|388|
389|389|Die Anwendung verwendet ein dauerhaftes Fünf-Bereich-Layout.
390|390|
391|391|```
392|392|┌──────────────────────────────────────────────────────────────────────────────┐
393|393|│ Top Bar                                                                      │
394|394|├───────────────┬──────────────────────────────────────────────┬───────────────┤
395|395|│               │                                              │               │
396|396|│               │                                              │               │
397|397|│               │                                              │               │
398|398|│ Sidebar       │ Main Content                                │ Right Sidebar │
399|399|│               │                                              │               │
400|400|│               │                                              │               │
401|401|│               │                                              │               │
402|402|├───────────────┴──────────────────────────────────────────────┴───────────────┤
403|403|│ Playback Bar                                                                 │
404|404|└──────────────────────────────────────────────────────────────────────────────┘
405|405|---
406|406|
407|---
408|
409|# Desktop Grid
410|
411|Die Anwendung verwendet ein dauerhaftes Fünf-Bereich-Layout.
412|
413|```
414|+---------------------------------------+
415|| Top Bar                               |
416|+--------+------------------------+------+
417||        |                        |      |
418|| Sidebar| Main Content           |Right |
419||        |                        |Sidebar|
420|+--------+------------------------+------+
421|| Playback Bar                           |
422|+---------------------------------------+
423|```
424|
425|---
426|
427|# Desktop Layout
428|
429|## Sidebar
430|Breite: Expanded, Compact, Hidden (zukünftig). Bleibt unabhängig vom Seiteninhalt erhalten.
431|
432|## Top Bar
433|Volle Fensterbreite. Enthält: Navigation, Suche, Seitentitel, Aktionen, Benutzerprofil.
434|
435|## Main Content
436|Größter Bereich. Ausschließlich dieser wird bei Navigation ersetzt.
437|
438|## Right Sidebar
439|Optional. Kann anzeigen: Queue, Lyrics, Album-/Künstlerinformationen, Empfehlungen.
440|
441|## Playback Bar
442|Immer sichtbar. Keine Navigation verändert diesen Bereich.
443|
444|---
445|
446|# Layoutregeln
447|
448|## Permanente Bereiche
449|Sidebar, Top Bar, Playback Bar bleiben dauerhaft bestehen.
450|
451|## Austauschbare Bereiche
452|Main Content, Right Sidebar dürfen ihren Inhalt vollständig austauschen.
453|
454|---
455|
456|# Grid Regeln
457|Alle Seiten orientieren sich am gleichen Raster. Jede neue Seite verwendet identische Außenabstände. Sektionen beginnen immer auf derselben horizontalen Linie.
458|
459|---
460|
461|# Scrollbereiche
462|Eigenständige Scrollcontainer: Sidebar, Main Content, Right Sidebar
463|Nicht scrollbar: Top Bar, Playback Bar
464|
465|---
466|
467|# Layer System
468|Layer 0-9: Fensterhintergrund, Seitenlayout, Content, Sticky Header, Hover, Selection, Drag Preview, Dialoge, Kontextmenüs, Modale Fenster
469|
470|---
471|
472|# Spacing System
473|Einheitliches Raster mit Stufen: XS, S, M, L, XL, XXL
474|
475|---
476|
477|# Sticky Bereiche
478|Header, Playlist Header, Tabellenkopf, Filterleiste
479|
480|---
481|
482|# Resize Verhalten
483|Content wächst, Sidebar konstant, Playback konstant, Right Sidebar mit Mindestbreite.
484|
485|---
486|
487|# Scroll Position
488|Jede Seite speichert ihre letzte Scrollposition.
489|
490|---
491|
492|# Erweiterung später
493|Pixelgrößen, Grid-Abstände, Breakpoints, Animationen, Blur, Shadow-System, Docking-Regeln
494|

---

# Desktop Layout Specification v0.3

# Ziel

Die Music Domain verwendet ein dauerhaftes Desktop-Layout, dessen Grundstruktur während der gesamten Laufzeit unverändert bleibt.

Nur der Inhalt des Main Content Bereichs verändert sich.

Dieses Verhalten reduziert visuelle Sprünge und erhöht die Orientierung.

---

# Grundstruktur

```
+--------------------------------------------------+
| Top Bar                                          |
+--------+--------------------------------+--------+
|        |                                |        |
| Sidebar| Main Content                   | Right  |
|        |                                | Sidebar|
+--------+--------------------------------+--------+
| Playback Bar                                   |
+--------------------------------------------------+
```

Jeder Bereich besitzt einen eigenen Rendering-Kontext.

---

# Layoutbereiche

## Sidebar
Permanente Navigation. Enthält Navigation, Bibliothek, Playlists, Collections, Favoriten. Eigenschaften: immer links, eigene Scrollbar, unabhängig vom Main Content.

## Top Bar
Globale Navigation. Enthält Zurück/Vor, Suche, Seitentitel, Aktionen, Benutzerprofil. Eigenschaften: sticky, niemals scrollbar, über gesamter Breite.

## Main Content
Größter Bereich. Zeigt Home, Search, Playlist, Album, Künstler, Bibliothek. Eigenschaften: eigener Scrollcontainer, Seitenwechsel ausschließlich hier.

## Right Sidebar (optional)
Kann Queue, Lyrics, Album-/Artistinformationen, Empfehlungen anzeigen. Kann jederzeit geöffnet oder geschlossen werden.

## Playback Bar
Permanent sichtbar. Enthält Player, Timeline, Lautstärke, Geräte, Queue. Wird niemals ersetzt.

---

# Größen

Sidebar Standard: ~240–280px, Compact: ~72–80px
Right Sidebar Geschlossen: 0px, Standard: ~320–380px, Erweitert: ~420–480px
Playback Bar: ~88–96px konstant
Top Bar: ~64–72px konstant
Main Content: belegt sämtlichen verbleibenden Platz.

---

# Desktop Grid
Konsistentes Raster mit 24px Außenabstand. Alle Seiten beginnen mit identischem Abstand. Alle Karten verwenden identische Innenabstände. Alle Listen besitzen identische Einrückungen.

---

# Spacing System
| Name | Verwendung |
|-------|------------|
| XS | Icon-Abstände |
| S | Kleine Buttons |
| M | Standard-Abstände |
| L | Kartengruppen |
| XL | Abschnittsabstände |
| XXL | Große Seitenelemente |

Komponenten dürfen keine eigenen Abstandswerte definieren. Alle Werte stammen aus zentralen Design Tokens.

---

# Scrollcontainer & Regeln
Sidebar, Main Content, Right Sidebar: eigene Scrollposition. Playback, Top Bar: niemals scrollbar.
Beim Seitenwechsel: Sidebar/Playback/Top Bar bleiben unverändert. Nur Main Content erhält neue Scrollposition. Zurücknavigieren stellt vorherige Position wieder her.

---

# Sticky Bereiche
Top Bar, Playlist Header, Tabellenkopf, Filterleiste, Suchleiste.

---

# Layout Ebenen (Layer 0-9)
0: Fensterhintergrund, 1: Layout, 2: Seiteninhalt, 3: Sticky Header, 4: Hover, 5: Selection, 6: Drag Preview, 7: Dialoge, 8: Kontextmenüs, 9: Modale Fenster

Jede Ebene besitzt eindeutige Priorität. Überlagerungen nur durch höhere Ebenen.

---

# Größenregeln
Sidebar niemals kleiner als Compact. Playback niemals kleiner als Standardhöhe. Top Bar immer identische Höhe. Right Sidebar niemals kleiner als Minimalbreite. Main Content erhält stets verbleibenden Platz.

---

# Resize Verhalten
Main Content wächst zuerst. Danach Abstand zwischen Komponenten. Sidebar/Playback/Top Bar verändern ihre Größe nicht.

---

# Renderingregeln
Layoutkomponenten werden nur einmal erzeugt. Navigation ersetzt ausschließlich Main Content + optional Right Sidebar. Sidebar/Playback/Top Bar werden niemals neu aufgebaut. Playerzustand, Queue, Scrollposition, Animationen, Wiedergabe bleiben erhalten.

---

# Layoutprinzipien
Alle Seiten verwenden dieselbe Struktur. Neue Ansichten ausschließlich im Main Content. Konsistentes Desktop-Erlebnis unabhängig von Playlist, Künstler, Suche, Bibliothek, Einstellungen oder Queue.
