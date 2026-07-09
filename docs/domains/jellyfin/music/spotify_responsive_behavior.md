1|# Responsive Behavior
2|
3|Version 0.2
4|
5|---
6|
7|# Ziel
8|
9|Dieses Dokument beschreibt das Verhalten der Music Domain bei unterschiedlichen Fenstergrößen.
10|
11|Die Anwendung ist Desktop-First, muss aber mit variablen Fenstergrößen umgehen.
12|
13|---
14|
15|# Breakpoints
16|
17|| Breakpoint | Breite | Sidebar | Right Panel | Card-Grid |
18||------------|--------|---------|-------------|-----------|
19|| Sehr breit | ≥ 1280px | 240px | sichtbar (320px) | 5–6 Spalten |
20|| Breit | 1024–1279px | 240px | ausgeblendet | 4–5 Spalten |
21|| Mittel | 768–1023px | 64px (Icons) | ausgeblendet | 3 Spalten |
22|| Klein | 500–767px | 64px (kompakt) | ausgeblendet | 2 Spalten |
23|| Sehr klein | < 500px | minimal | ausgeblendet | 1–2 Spalten |
24|
25|---
26|
27|# Grundsatz
28|
29|Bei großen Fenstern werden alle Bereiche angezeigt.
30|
31|Bei kleineren Fenstern werden Bereiche prioritär reduziert.
32|
33|Die Player-Bar bleibt immer sichtbar.
34|
35|Die Wiedergabe wird niemals unterbrochen.
36|
37|---
38|
39|# Collapse-Reihenfolge
40|
41|Bei sinkender Fensterbreite werden Elemente in dieser Reihenfolge ausgeblendet:
42|
43|1. Right Sidebar (bei < 1280px)
44|2. Sidebar Text-Labels → Icon-Only (bei < 1024px)
45|3. Card-Grid Spalten reduzieren (fortlaufend)
46|4. Player-Bar Volume-Slider → Mute-Toggle (bei < 768px)
47|5. Player-Bar Zusatz-Buttons (Lyrics, Devices) (bei < 600px)
48|6. Top-Bar Search → Icon (bei < 600px)
49|7. Sidebar → minimale Navigation (bei < 500px)
50|
51|---
52|
53|# Sidebar
54|
55|## Expanded (≥ 768px)
56|
57|- Breite: 240px
58|- Vollständige Text-Labels
59|- Playlist-Liste mit Cover + Titel + Metainfo
60|
61|## Collapsed (< 768px)
62|
63|- Breite: 64px
64|- Nur Icons
65|- Hover zeigt Tooltip mit Label
66|- Toggle über Hamburger-Icon
67|
68|## Hover-Expand (Icon-Modus)
69|
70|Bei Hover über Sidebar-Item im Icon-Modus:
71|
72|- Overlay mit Text-Label erscheint (Tooltip-Stil)
73|- Keine Breitenänderung der Sidebar
74|
75|---
76|
77|# Card-Grid Spaltenlogik
78|
79|```css
80|.card-grid {
81|  display: grid;
82|  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
83|  gap: 16px;
84|}
85|```
86|
87|### Berechnung
88|
89|Spaltenanzahl = floor((verfügbareBreite + gap) / (minItemWidth + gap))
90|
91|| Fensterbreite | Main Content | Spalten |
92||---------------|-------------|---------|
93|| 1920px | ~1640px | 9–10 |
94|| 1440px | ~1160px | 6–7 |
95|| 1280px | ~1000px | 5–6 |
96|| 1024px | ~744px | 4 |
97|| 768px | ~640px | 3 |
98|| 500px | ~424px | 2 |
99|
100|---
101|
102|# Right Sidebar
103|
104|| Fensterbreite | Status |
105||---------------|--------|
106|| ≥ 1280px | Sichtbar (320px), kann manuell geschlossen werden |
107|| 1024–1279px | Versteckt, über Button aufrufbar (als Overlay) |
108|| < 1024px | Versteckt, als Vollbild-Overlay aufrufbar |
109|
110|---
111|
112|# Top Bar
113|
114|## Sehr breit und breit (≥ 1024px)
115|
116|- Vollständige Search-Bar (min 200px)
117|- Alle Buttons sichtbar
118|- Window-Controls rechts
119|
120|## Mittel (768–1023px)
121|
122|- Suche bleibt sichtbar (schmaler)
123|- Notification-Bell in More-Menü
124|
125|## Klein (< 768px)
126|
127|- Suche wird zum Icon
128|- Klick öffnet Search als Vollbild-Overlay
129|- Nur Avatar + Window-Controls bleiben
130|
131|---
132|
133|# Player Bar
134|
135|## Standard (≥ 768px)
136|
137|- Cover 56x56px
138|- Titel + Künstler
139|- Alle Controls (Shuffle, Prev, Play, Next, Repeat)
140|- Progress-Bar mit Timestamps
141|- Volume-Slider (100px)
142|- Alle Zusatz-Buttons (Lyrics, Queue, Devices, Fullscreen)
143|
144|## Kompakt (500–767px)
145|
146|- Cover bleibt 56x56px
147|- Künstler ausgeblendet (nur Titel)
148|- Shuffle/Repeat ausgeblendet (nur Prev, Play, Next)
149|- Progress-Bar schmaler, Timestamps verkürzt
150|- Volume → Mute-Toggle
151|- Zusatz-Buttons in More-Menü
152|
153|## Minimal (< 500px)
154|
155|- Cover 40x40px
156|- Nur Titel
157|- Nur Play/Pause + Next
158|- Progress-Bar als dünne Linie oben auf der Player-Bar
159|- Keine Timestamps
160|- Kein Volume-Control
161|
162|---
163|
164|# Now Playing View
165|
166|## Vollbild (F11)
167|
168|- Cover zentriert (400x400px)
169|- Controls unten zentriert
170|- Lyrics optional rechts oder darunter
171|
172|## Fenster < 1024px
173|
174|- Cover auf 300x300px reduziert
175|- Lyrics als Overlay statt Side-by-Side
176|
177|## Fenster < 500px
178|
179|- Cover auf 200x200px reduziert
180|- Controls vertikal gestapelt
181|- Lyrics ausblenden
182|
183|---
184|
185|# Mini-Player
186|
187|Abgekoppelter schwebender Player.
188|
189|- Größe: 320x80px
190|- Position: rechts unten (verschiebbar)
191|- Cover 48x48px + Titel + Künstler + Like
192|- Unabhängig vom Hauptfenster
193|
194|---
195|
196|# Touch-Target-Größen
197|
198|Alle interaktiven Elemente auf Touch-Geräten:
199|
200|| Eigenschaft | Wert |
201||-------------|------|
202|| Mindestgröße | 44x44px |
203|| Abstand zwischen Targets | min 8px |
204|| Visuelle Größe | kann kleiner sein (mit Padding auf 44px) |
205|
206|---
207|
208|# High-DPI und Retina
209|
210|## Icon-Skalierung
211|
212|Icons werden als SVG gerendert (skalierungsfrei).
213|
214|Bei High-DPI: keine zusätzlichen Icon-Größen erforderlich.
215|
216|## Cover-Bildauflösungen
217|
218|| DPI | Cover-Auflösung |
219||-----|----------------|
220|| 1x (Standard) | 160x160px |
221|| 2x (Retina) | 320x320px |
222|| 3x (4K Mobile) | 480x480px |
223|
224|Jellyfin /Items/{id}/Images/Primary?fillWidth=320 liefert entsprechende Auflösung.
225|
226|---
227|
228|# Ultrawide
229|
230|Bei sehr breiten Monitoren (≥ 1920px):
231|
232|- Main Content wird zentriert
233|- Maximale Content-Breite: 1440px
234|- Verhindert übermäßig lange Zeilen
235|- Sidebar und Right Sidebar bleiben am Rand
236|
237|---
238|
239|# Multi-Window
240|
241|- Fenster kann auf mehrere Monitore gezogen werden
242|- Layout passt sich an den jeweiligen Monitor an
243|- Mini-Player kann abgekoppelt werden
244|
245|---
246|
247|# Multi-Monitor
248|
249|- Unterstützt mehrere Monitore
250|- Fenster auf verschiedenen Monitoren mit unterschiedlichen Größen
251|- DPI wird pro Monitor erkannt
252|
253|---
254|
255|# Fullscreen
256|
257|Vollbildmodus (F11 oder Button).
258|
259|- Cover zentriert
260|- Controls unten
261|- Lyrics optional
262|- ESC oder F11 zum Verlassen
263|
264|---
265|
266|# Fenster-Minimalgröße
267|
268|Minimale Fenstergröße: 320x400px.
269|
270|Darunter: Hinweis "Fenster zu klein" oder Mobile-Layout.
271|
272|---
273|
274|# Scrollbar-Verhalten
275|
276|- Custom Scrollbar (dünn, rund, dark)
277|- Track: transparent
278|- Thumb: #535353
279|- Hover-Thumb: #727272
280|- Breite: 12px
281|- Nur vertikal (horizontal mit Shift+Mausrad)
282|
283|---
284|
285|# Transitions
286|
287|Größenänderungen werden animiert.
288|
289|| Element | Dauer | Easing |
290||---------|-------|--------|
291|| Sidebar Width | 250ms | ease-in-out |
292|| Right Panel | 200ms | ease-out |
293|| Card-Grid Resize | 300ms | ease-out |
294|| Player Bar | 200ms | ease-out |
295|
296|Content springt nicht plötzlich.
297|
298|---
299|
300|# PWA-Verhalten
301|
302|Die Music Domain kann als PWA installiert werden.
303|
304|## Manifest
305|
306|```json
307|{
308|  "name": "LifeHub Music",
309|  "short_name": "Music",
310|  "display": "standalone",
311|  "background_color": "#121212",
312|  "theme_color": "#121212",
313|  "icons": [...]
314|}
315|```
316|
317|## Service Worker
318|
319|- Offline-Caching für zuletzt gehörte Songs
320|- Cache-First für Cover
321|- Network-First für Bibliotheksdaten
322|
323|## Offline-Modus
324|
325|- Heruntergeladene Songs sind offline abspielbar
326|- Bibliotheksdaten werden gecacht
327|- Queue bleibt erhalten
328|- Suche eingeschränkt (nur gecachte Daten)
329|
330|---
331|
332|# Zoom
333|
334|| Tastatur | Aktion |
335||----------|--------|
336|| Strg+Plus | Zoom erhöhen |
337|| Strg+Minus | Zoom verringern |
338|| Strg+0 | Standard-Zoom |
339|
340|---
341|
342|# Zukünftige Erweiterungen
343|
344|Dieses Dokument wird später detailliert beschreiben
345|
346|- Resizable Sidebar (per Drag)
347|- Tiling-Window-Support
348|- Snap-Layouts (Windows)
349|- Multiple Independent Player Windows
350|

---

# Responsive Behavior v0.2

## Ziel
Desktop First. Responsives Verhalten dient ausschließlich der optimalen Nutzung unterschiedlicher Desktopgrößen.

## Fenstergrößen
Small Desktop, Standard Desktop, Large Desktop, Ultrawide, Mehrere Monitore

## Sidebar
Kann Expanded, Compact oder Hidden sein.

## Right Sidebar
Bleibt sichtbar solange ausreichend Platz vorhanden ist. Bei kleineren Fenstern einklappbar.

## Tabellen
Spalten werden priorisiert. Unwichtige Spalten können ausgeblendet werden.

## Karten
Passen ihre Breite automatisch an. Anzahl der Karten pro Zeile verändert sich dynamisch.

## Albumcover
Werden proportional skaliert. Keine Verzerrung.

## Listen
Ausschließlich virtuelle Listen. Rendering unabhängig von Fenstergröße.

## Performance
Resize führt niemals zu vollständigem Neuaufbau. Nur betroffene Bereiche werden aktualisiert.

## State Management
Scrollposition, Filter, Sortierung, Auswahl, Queue bleiben beim Resize erhalten.

## Accessibility
Skalierung unterstützt 125%, 150%, 175%, 200% ohne Funktionsverlust.

## Erweiterung später
Breakpoint Definitionen, DPI Skalierung, Multi Monitor Verhalten, Fenster Snap Layouts, Performance Benchmarks
