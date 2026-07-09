1|# Visual Language
2|
3|Version 0.2
4|
5|---
6|
7|# Ziel
8|
9|Dieses Dokument definiert die visuelle Sprache der Music Domain.
10|
11|Es beschreibt Farben, Typografie, Icons, Abstände, Schatten und Animationen.
12|
13|---
14|
15|# Designphilosophie
16|
17|Die Oberfläche ist dunkel, content-first und ruhig.
18|
19|Sie nutzt Farbe sparsam und gezielt als Akzent.
20|
21|Musikcover sind die Hauptquelle für Farbe im Interface.
22|
23|---
24|
25|# Farben
26|
27|## Hintergrund
28|
29|| Farbe | HEX | Verwendung |
30||-------|-----|------------|
31|| Basis | #121212 | Seitenhintergrund |
32|| Erhöht | #181818 | Sidebar, Player-Bar |
33|| Karte | #242424 | Cards, Listen-Hover |
34|| Hover | #2A2A2A | Aktive Hover-Zeilen |
35|| Hell | #282828 | Modals, Dropdowns |
36|
37|## Text
38|
39|| Farbe | HEX | Kontrast zu Basis | Verwendung |
40||-------|-----|-------------------|------------|
41|| Primär | #FFFFFF | 21:1 | Überschriften, aktive Elemente |
42|| Sekundär | #B3B3B3 | 7.2:1 | Künstler, Beschreibungen |
43|| Tertiär | #727272 | 4.5:1 | Timestamps, Metadaten |
44|| Deaktiviert | #535353 | 2.6:1 | Disabled-Buttons (nur dekorativ) |
45|
46|## Akzent
47|
48|| Farbe | HEX | Verwendung |
49||-------|-----|------------|
50|| Akzent | #1DB954 | Play-Button, Aktiv-Zustände |
51|| Akzent Hover | #1ED760 | Hover über Akzent-Elementen |
52|| Akzent Gedrückt | #169C46 | Active/Pressed-Zustand |
53|
54|Standardmäßig Grün (Spotify-Referenz).
55|
56|LifeHub kann diesen Akzent in den Einstellungen konfigurierbar machen.
57|
58|## Statusfarben
59|
60|| Farbe | HEX | Verwendung |
61||-------|-----|------------|
62|| Fehler | #E91429 | Fehlermeldungen, Error-Icons |
63|| Warnung | #FFA42B | Hinweise, Warnings |
64|| Erfolg | #1DB954 | Erfolg, Bestätigungen |
65|| Explicit | #A0A0A0 | Explicit-Badge |
66|
67|## Dynamische Farben
68|
69|Die Player-Bar und Header übernehmen Farben vom aktuellen Albumcover.
70|
71|Dies erzeugt einen zusammenhängenden visuellen Eindruck.
72|
73|Methode: Canvas-API Farbextraktion → dominante Farbe als HSL.
74|
75|---
76|
77|# Design Tokens
78|
79|Alle Farben und Werte sind als CSS Custom Properties definiert.
80|
81|## CSS Custom Properties
82|
83|```css
84|:root {
85|  /* Backgrounds */
86|  --bg-base: #121212;
87|  --bg-elevated: #181818;
88|  --bg-card: #242424;
89|  --bg-hover: #2A2A2A;
90|  --bg-modal: #282828;
91|
92|  /* Text */
93|  --text-primary: #FFFFFF;
94|  --text-secondary: #B3B3B3;
95|  --text-tertiary: #727272;
96|  --text-disabled: #535353;
97|
98|  /* Accent */
99|  --accent: #1DB954;
100|  --accent-hover: #1ED760;
101|  --accent-pressed: #169C46;
102|
103|  /* Status */
104|  --error: #E91429;
105|  --warning: #FFA42B;
106|  --success: #1DB954;
107|  --explicit: #A0A0A0;
108|
109|  /* Layout */
110|  --sidebar-width: 240px;
111|  --sidebar-collapsed-width: 64px;
112|  --topbar-height: 64px;
113|  --player-bar-height: 90px;
114|  --right-sidebar-width: 320px;
115|
116|  /* Spacing */
117|  --space-xs: 4px;
118|  --space-sm: 8px;
119|  --space-md: 16px;
120|  --space-lg: 24px;
121|  --space-xl: 32px;
122|}
123|```
124|
125|## Tailwind Config
126|
127|```javascript
128|// tailwind.config.ts
129|colors: {
130|  bg: {
131|    base: '#121212',
132|    elevated: '#181818',
133|    card: '#242424',
134|    hover: '#2A2A2A',
135|    modal: '#282828',
136|  },
137|  text: {
138|    primary: '#FFFFFF',
139|    secondary: '#B3B3B3',
140|    tertiary: '#727272',
141|    disabled: '#535353',
142|  },
143|  accent: {
144|    DEFAULT: '#1DB954',
145|    hover: '#1ED760',
146|    pressed: '#169C46',
147|  },
148|}
149|```
150|
151|---
152|
153|# Typografie
154|
155|## Font-Stack
156|
157|```css
158|font-family: 'Inter', -apple-system, BlinkMacSystemFont,
159|             'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
160|```
161|
162|Keine proprietären Schriften (Spotify Circular nicht frei verfügbar).
163|
164|Primary-Empfehlung: **Inter** (Google Fonts, OFL-Lizenz).
165|
166|Monospace nur für Timestamps (optional).
167|
168|## Schriftgrößen
169|
170|| Element | Größe | Weight | Letter-Spacing |
171||---------|-------|--------|----------------|
172|| Seitentitel (h1) | 28px | Bold (700) | -0.02em |
173|| Section-Header (h2) | 20px | Bold (700) | -0.01em |
174|| Sub-Header (h3) | 14px | Bold (700) | 0.1em (uppercase) |
175|| Track-Name (Liste) | 14px | Normal (400) | 0 |
176|| Künstler-Name | 12px | Normal (400) | 0 |
177|| Card-Titel | 14px | Bold (700) | 0 |
178|| Card-Subtext | 12px | Normal (400) | 0 |
179|| Timestamp | 11px | Normal (400) | 0 |
180|| Button-Label | 12px | Bold (700) | 0.1em (uppercase) |
181|
182|---
183|
184|# Abstände
185|
186|## Basiseinheit
187|
188|Alle Abstände basieren auf einem Vielfachen von 4 Pixeln.
189|
190|## Spacing-Skala
191|
192|| Token | Wert |
193||-------|------|
194|| xs | 4px |
195|| sm | 8px |
196|| md | 16px |
197|| lg | 24px |
198|| xl | 32px |
199|| 2xl | 48px |
200|
201|## Card-Grid
202|
203|Cards haben einen Abstand von 16 px zueinander.
204|
205|## Abschnitte
206|
207|Zwischen vertikalen Abschnitten liegen 24 px.
208|
209|## Innenabstände
210|
211|| Bereich | Padding |
212||---------|---------|
213|| Main Content | 24px links/rechts |
214|| Listenzeile | 16px |
215|| Sidebar | 8px links/rechts |
216|| Card-Inhalt | 16px |
217|
218|---
219|
220|# Eckenradien
221|
222|| Element | Radius |
223||---------|--------|
224|| Karten | 8px |
225|| Buttons (rechteckig) | 4px |
226|| Play-Button | 50% (Kreis) |
227|| Modals | 12px |
228|| Eingabefelder | 4px |
229|| Thumbnails | 4px |
230|| Playlist-Cover | 4px |
231|| Filter-Chips | 16px (Pill) |
232|
233|---
234|
235|# Icons
236|
237|## Bibliothek
238|
239|Empfehlung: **Lucide React** (lucide.dev)
240|
241|- Lizenz: ISC (freie Nutzung)
242|- Stil: Outline, 1.5px stroke, rund
243|- Verfügbar als React-Komponenten
244|- Baum-shakable
245|
246|Alternative: Phosphor Icons, Heroicons.
247|
248|## Größen
249|
250|| Verwendung | Größe |
251||------------|-------|
252|| Standard | 16px |
253|| Mittel | 20px |
254|| Groß | 24px |
255|| Play-Button | 32px |
256|| Now Playing View | 24px |
257|
258|## Farben
259|
260|Icons erben die Textfarbe.
261|
262|- Standard: --text-secondary (#B3B3B3)
263|- Aktiv: --text-primary (#FFFFFF) oder --accent (#1DB954)
264|- Hover: --text-primary (#FFFFFF)
265|
266|---
267|
268|# Schatten
269|
270|| Ebene | Wert |
271||-------|------|
272|| Cards | 0 2px 8px rgba(0,0,0,0.3) |
273|| Player Bar | 0 -2px 8px rgba(0,0,0,0.5) |
274|| Modals | 0 8px 32px rgba(0,0,0,0.5) |
275|| Kontextmenü | 0 4px 16px rgba(0,0,0,0.4) |
276|| Cover Glow (Now Playing) | 0 0 30px rgba(var(--cover-dominant), 0.4) |
277|
278|---
279|
280|# Animationen
281|
282|## Grundsätze
283|
284|Animationen sind kurz und supportiv.
285|
286|Sie lenken nicht ab.
287|
288|Sie unterstützen räumliches Verständnis.
289|
290|## Easing-Funktionen
291|
292|```css
293|--ease-out: cubic-bezier(0, 0, 0.2, 1);
294|--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
295|--ease-linear: linear;
296|```
297|
298|## Standard-Animationen
299|
300|| Element | Animation | Dauer | Easing |
301||---------|-----------|-------|--------|
302|| Hover (Card) | Scale 1.0 → 1.02 | 200ms | ease-out |
303|| Hover (Liste) | Background-Fade | 150ms | ease-out |
304|| Play/Pause | Instant Icon-Swap | 0ms | – |
305|| Like (Herz) | Pop (Scale + Color) | 300ms | ease-in-out |
306|| Sidebar Collapse | Width-Transition | 250ms | ease-in-out |
307|| Context Menu | Fade + Slide | 150ms | ease-out |
308|| Modal | Fade + Scale | 200ms | ease-out |
309|| Progress-Bar | Continuous | linear | linear |
310|| Toast | Slide-In | 200ms | ease-out |
311|
312|## Keyframes
313|
314|```css
315|@keyframes fadeIn {
316|  from { opacity: 0; transform: translateY(8px); }
317|  to   { opacity: 1; transform: translateY(0); }
318|}
319|
320|@keyframes shimmer {
321|  0%   { background-position: -200% 0; }
322|  100% { background-position: 200% 0; }
323|}
324|
325|@keyframes soundbar {
326|  0%, 100% { height: 4px; }
327|  50%      { height: 16px; }
328|}
329|```
330|
331|---
332|
333|# Scrollbar
334|
335|Eigene dezente Scrollbar.
336|
337|```css
338|::-webkit-scrollbar {
339|  width: 12px;
340|}
341|::-webkit-scrollbar-track {
342|  background: transparent;
343|}
344|::-webkit-scrollbar-thumb {
345|  background: #535353;
346|  border-radius: 6px;
347|  border: 3px solid transparent;
348|  background-clip: content-box;
349|}
350|::-webkit-scrollbar-thumb:hover {
351|  background: #727272;
352|}
353|```
354|
355|- Track: transparent
356|- Thumb: dunkles Grau (#535353)
357|- Hover-Thumb: helleres Grau (#727272)
358|- Breite: 12px
359|- Nur vertikal
360|
361|---
362|
363|# Transparenz und Blur
364|
365|## Player-Bar
366|
367|```css
368|.player-bar {
369|  background: rgba(18, 18, 18, 0.95);
370|  backdrop-filter: blur(16px);
371|}
372|```
373|
374|## Header beim Scrollen
375|
376|```css
377|.page-header--scrolled {
378|  background: rgba(18, 18, 18, 0.8);
379|  backdrop-filter: blur(12px);
380|}
381|```
382|
383|## Now Playing Background
384|
385|```css
386|.np-background {
387|  filter: blur(60px);
388|  opacity: 0.3;
389|  transform: scale(1.2);
390|}
391|```
392|
393|---
394|
395|# Cover-Behandlung
396|
397|Cover sind quadratisch.
398|
399|Cover sind die primäre visuelle Informationsquelle.
400|
401|Cover dominieren das Farbbild der Oberfläche.
402|
403|---
404|
405|# Header-Verläufe
406|
407|Playlist- und Album-Header verwenden Farbverläufe.
408|
409|```css
410|.playlist-header {
411|  background: linear-gradient(
412|    to bottom,
413|    var(--cover-dominant-color) 0%,
414|    transparent 40%,
415|    var(--bg-base) 100%
416|  );
417|}
418|```
419|
420|Die Farben werden aus dem Cover extrahiert (Canvas-API).
421|
422|Sie erzeugen einen weichen Übergang zum dunklen Hintergrund.
423|
424|---
425|
426|# Accessibility-Kontrastwerte
427|
428|Alle Text/Hintergrund-Kombinationen entsprechen WCAG 2.1 AA.
429|
430|| Vordergrund | Hintergrund | Kontrast | AA (Normal) | AA (Large) |
431||-------------|-------------|----------|-------------|------------|
432|| #FFFFFF (Primär) | #121212 (Basis) | 21:1 | ✓ | ✓ |
433|| #B3B3B3 (Sekundär) | #121212 (Basis) | 7.2:1 | ✓ | ✓ |
434|| #727272 (Tertiär) | #121212 (Basis) | 4.5:1 | ✓ | ✓ |
435|| #FFFFFF (Primär) | #1DB954 (Akzent) | 3.1:1 | ✗ | ✓ |
436|| #121212 (Basis) | #1DB954 (Akzent) | 6.7:1 | ✓ | ✓ |
437|| #B3B3B3 (Sekundär) | #242424 (Karte) | 5.9:1 | ✓ | ✓ |
438|
439|Hinweis: Weißer Text auf Akzent-Grün nur für große Schrift (≥ 18px) oder fett ≥ 14px.
440|
441|---
442|
443|# Dark Mode
444|
445|Die Music Domain ist ausschließlich als Dark Mode konzipiert.
446|
447|Es ist kein separater Light Mode geplant.
448|
449|Alle Werte sind für dunkle Hintergründe optimiert.
450|
451|---
452|
453|# Zukünftige Erweiterungen
454|
455|Dieses Dokument wird später detailliert beschreiben
456|
457|- High-Contrast-Modus (Accessibility)
458|- Custom-Theme-Editor für User
459|- Seasonal Themes (Weihnachten, Halloween)
460|- Cover-basierte dynamische Themes
461|
---

# Visual Language v0.2
Ziel: Moderne Desktopoberfläche. Fokus auf Inhalt statt Dekoration.

## Designprinzipien
Hoher Kontrast, Große Cover, Ruhige Farbpalette, Konsistente Abstände, Klare Hierarchie

## Farben
Background, Surface, Surface Elevated, Accent, Primary/Secondary Text, Disabled, Border, Selection, Hover, Success, Warning, Error

## Farbregeln
Eine dominante Akzentfarbe. Keine übermäßigen Farbverläufe. Albumcover liefern Farbakzente.

## Typografie
Display, Heading, Subheading, Body, Caption, Metadata, Button

## Schriftregeln
Linksbündig, klare Gewichtsunterschiede, keine dekorativen Schriftarten.

## Icons
Einheitlich linienbasiert, konsistente Größen.

## Cover
Quadratisch, abgerundete Ecken, hohe Qualität.

## Karten
Header, Content, Footer, Optional Actions

## Schatten
Dezente Tiefenwirkung. Dialoge höhere Elevation.

## Hover/Focus/Active
Leichte Hervorhebung, kontrastreich, Akzentfarbe.

## Design Tokens
Color, Spacing, Radius, Typography, Animation, Shadow, Layer

## Animationen
Kurz, flüssig, nicht ablenkend.

## Erweiterung später
Farbpalette, Tokendefinitionen, Radius-/Schatten-/Schrift-/Icongrößen, Animationskurven
