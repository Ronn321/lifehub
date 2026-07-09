1|# Interactions
2|
3|Version 0.2
4|
5|---
6|
7|# Ziel
8|
9|Dieses Dokument beschreibt sämtliche Interaktionsmuster der Music Domain.
10|
11|Es umfasst Maus, Tastatur, Drag & Drop, Kontextmenüs und Touch.
12|
13|---
14|
15|# Maus-Interaktionen
16|
17|## Standard-Klicktargets
18|
19|Alle klickbaren Elemente sind mindestens 32x32 px groß.
20|
21|## Linksklick
22|
23|Startet Aktionen wie:
24|
25|- Wiedergabe
26|- Navigation
27|- Auswahl
28|- Button-Aktivierung
29|
30|## Doppelklick
31|
32|Startet sofortige Wiedergabe.
33|
34|Doppelklick-Timeout: 300 ms.
35|
36|Bei Songs in Listen: Doppelklick spielt Song und setzt Queue auf Kontext.
37|
38|## Rechtsklick
39|
40|Öffnet Kontextmenü.
41|
42|Funktioniert auf fast allen Elementen: Songs, Playlists, Alben, Künstler, Ordner.
43|
44|## Hover
45|
46|Zeigt zusätzliche Informationen oder Aktionen.
47|
48|| Element | Hover-Effekt |
49||---------|-------------|
50|| Song-Zeile | Hintergrund → #2A2A2A, Nummer → Play-Icon, Herz erscheint |
51|| Card | Scale 1.02, Play-Overlay erscheint |
52|| Sidebar-Eintrag | Hintergrund → #1A1A1A |
53|| Button | Farbe → heller |
54|
55|Hover-Verzögerung: 0 ms (instant).
56|
57|Hover-Animation: 150 ms ease-out.
58|
59|## Drag
60|
61|Verschiebt Elemente.
62|
63|Funktioniert für Songs, Playlists und Ordner.
64|
65|---
66|
67|# Cursor-Zustände
68|
69|| Element-Typ | Cursor |
70||-------------|--------|
71|| Klickbar (Button, Link, Card) | pointer |
72|| Draggable (Song, Playlist) | grab / grabbing |
73|| Text-Eingabe | text |
74|| Slider (Volume, Progress) | ns-resize |
75|| Normaler Inhalt | default |
76|
77|---
78|
79|# Drag & Drop
80|
81|## Flow
82|
83|1. mousedown auf Element
84|2. 5 px Threshold muss überschritten werden
85|3. Ghost-Element erscheint nach 50 ms
86|4. cursor → grabbing
87|5. dragover: Zielbereiche werden hervorgehoben (Akzent-Rahmen)
88|6. drop: API-Call wird ausgelöst
89|7. Erfolg: Toast-Benachrichtigung + UI-Update
90|8. Misserfolg: Fehler-Toast + Ghost kehrt zurück
91|
92|## unterstützte Drag-Ziele
93|
94|| Quelle | Ziel | Ergebnis |
95||--------|------|----------|
96|| Song | Playlist-Icon (Sidebar) | Song zu Playlist hinzufügen |
97|| Song | Queue-Panel | Song zur Queue hinzufügen |
98|| Song | Player-Bar | Song sofort abspielen |
99|| Playlist | Sidebar-Position | Playlist umsortieren |
100|| Playlist | Ordner | Playlist in Ordner verschieben |
101|| Album | Playlist-Icon | Alle Album-Songs zur Playlist |
102|| Song | Playlist-Position | Song an Position einfügen |
103|
104|Ghost-Element zeigt Cover + Titel + Anzahl (bei Mehrfachauswahl).
105|
106|---
107|
108|# Kontextmenüs
109|
110|Jedes interaktive Element besitzt ein Kontextmenü.
111|
112|## Auslöser
113|
114|- Rechtsklick
115|- Kontextmenü-Taste der Tastatur
116|
117|## Position
118|
119|Erscheint an Cursor-Position.
120|
121|Bei Randnähe: verschiebt sich in den Viewport.
122|
123|## Schließen
124|
125|- Klick außerhalb
126|- Escape-Taste
127|- Blur (Fokusverlust)
128|
129|## Animation
130|
131|- Einblenden: Fade + Slide (150 ms ease-out)
132|- Ausblenden: Fade (100 ms)
133|
134|## Song-Kontextmenü
135|
136|- Abspielen
137|- Als nächstes abspielen
138|- Zur Queue hinzufügen
139|- Zur Playlist hinzufügen (Submenu)
140|- Zur Sammlung hinzufügen
141|- Favorit (Herz toggeln)
142|- Herunterladen
143|- Informationen anzeigen
144|- Teilen
145|- Ähnliche Songs
146|- Zur Künstlerseite
147|- Zur Albumseite
148|
149|## Playlist-Kontextmenü
150|
151|- Abspielen
152|- Zufallswiedergabe
153|- Zur Queue hinzufügen
154|- Bearbeiten
155|- Herunterladen
156|- Teilen
157|- Duplizieren
158|- Zu Ordner verschieben
159|- Anheften / Loslösen
160|- Löschen
161|
162|## Album-Kontextmenü
163|
164|- Abspielen
165|- Zufallswiedergabe
166|- Zur Queue hinzufügen
167|- Zur Playlist hinzufügen
168|- Herunterladen
169|- Favorit
170|- Informationen anzeigen
171|
172|## Künstler-Kontextmenü
173|
174|- Abfolgen
175|- Abspielen
176|- Zufallswiedergabe
177|- Favorit
178|- Herunterladen
179|
180|---
181|
182|# Selection Model
183|
184|| Aktion | Ergebnis |
185||--------|----------|
186|| Single Click | Zeile auswählen (visuell hervorheben) |
187|| Double Click | Song abspielen |
188|| Strg+Click | Einzelne Songs toggeln |
189|| Shift+Click | Bereich auswählen |
190|| Strg+A | Alle auswählen |
191|| Klick außerhalb | Auswahl aufheben |
192|
193|Ausgewählte Zeilen: Hintergrund #1A1A1A.
194|
195|---
196|
197|# Tastatur-Interaktionen
198|
199|## Wiedergabe
200|
201|| Taste | Aktion |
202||-------|--------|
203|| Space | Play/Pause (nur wenn kein Input fokussiert) |
204|| → | Nächster Track |
205|| ← | Vorheriger Track / Track-Neustart |
206|| Shift+→ | 10s Vorspulen |
207|| Shift+← | 10s Zurückspulen |
208|| M | Stumm (Mute) |
209|| + / = | Lauter (+10%) |
210|| - | Leiser (-10%) |
211|| F | Vollbild umschalten |
212|
213|## Navigation
214|
215|| Taste | Aktion |
216||-------|--------|
217|| Strg+L | Suchfeld fokussieren |
218|| Alt+← | Vorherige Seite (Browser-Back) |
219|| Alt+→ | Nächste Seite (Browser-Forward) |
220|| Strg+↑ | Zum Seitenanfang |
221|| Strg+↓ | Zum Seitenende |
222|| Esc | Modal/Overlay/Kontextmenü schließen |
223|
224|## Playlist / Bibliothek
225|
226|| Taste | Aktion |
227||-------|--------|
228|| Strg+N | Neue Playlist |
229|| Entf | Ausgewählte Songs entfernen |
230|| Strg+A | Alle Songs auswählen |
231|| Strg+C | Song-Link kopieren |
232|
233|## Auswahl in Listen
234|
235|| Taste | Aktion |
236||-------|--------|
237|| Pfeil oben/unten | Durch Liste navigieren |
238|| Shift+Pfeil | Bereich auswählen |
239|| Enter | Ausgewählten Song abspielen |
240|| Space | Song zur Queue hinzufügen |
241|
242|## Ansicht
243|
244|| Taste | Aktion |
245||-------|--------|
246|| F | Vollbild |
247|| Q | Queue ein-/ausblenden |
248|
249|## Shortcut-Konfliktvermeidung
250|
251|- Space nur aktiv wenn kein Input/Textarea fokussiert
252|- Keine Konflikte mit Browser-Shortcuts (Strg+T, Strg+W etc.)
253|- Keine Konflikte mit OS-Shortcuts
254|- Tailscale-Overlay-Shortcuts werden respektiert
255|
256|---
257|
258|# Touch-Interaktionen
259|
260|Unterstützt für Touchscreens und Hybridgetäte.
261|
262|| Geste | Aktion |
263||-------|--------|
264|| Tap | = Linksklick |
265|| Doppel-Tap | = Doppelklick (Abspielen) |
266|| Long Press (500ms) | = Rechtsklick (Kontextmenü) |
267|| Swipe Left | Nächster Track (Now Playing View) |
268|| Swipe Right | Vorheriger Track (Now Playing View) |
269|| Swipe Down | Player Bar schließen / Ansicht zurück |
270|| Swipe Left/Right (Liste) | Song Favorit toggeln |
271|| Pinch | Layout-Änderung (List/Grid) |
272|| Two-Finger Swipe | Queue öffnen |
273|
274|---
275|
276|# Focus-Indikatoren
277|
278|## Keyboard-Focus
279|
280|```css
281|:focus-visible {
282|  outline: 2px solid var(--accent-green);
283|  outline-offset: 2px;
284|}
285|```
286|
287|Nur bei :focus-visible (nicht bei Maus-Klick).
288|
289|Focus-Reihenfolge ist logisch (top-to-bottom, left-to-right).
290|
291|---
292|
293|# Accessibility
294|
295|## Regeln
296|
297|- WCAG 2.1 AA konform
298|- Focus-Reihenfolge folgt visueller Reihenfolge
299|- Focus-Trap in Modals (Tab bleibt im Dialog)
300|- ARIA-live="polite" für Toast-Updates
301|- ARIA-live="assertive" für Fehlermeldungen
302|- Keine tastaturfalle (jedes Element per Tab erreichbar)
303|- Skip-to-Content-Link am Seitenanfang
304|
305|---
306|
307|# Scroll-Behavior
308|
309|- Smooth Scrolling innerhalb aller Bereiche
310|- Mausrad: vertikales Scrollen
311|- Shift+Mausrad: horizontales Scrollen in Card-Reihen
312|- Infinite Scroll: IntersectionObserver für große Listen
313|- Scroll-Restoration: Position wird bei Route-Wechsel gespeichert
314|
315|---
316|
317|# Undo / Redo
318|
319|## Undo-Stack
320|
321|| Aktion | Undo-möglich |
322||--------|-------------|
323|| Song aus Playlist entfernt | ✓ (5s Window) |
324|| Playlist gelöscht | ✓ (30 Tage Papierkorb) |
325|| Queue geändert | ✓ (sofort rückgängig) |
326|| Songs verschoben | ✓ (sofort rückgängig) |
327|
328|Shortcuts:
329|
330|- Strg+Z: Undo
331|- Strg+Shift+Z: Redo
332|
333|Maximum 50 Actions im Stack.
334|
335|---
336|
337|# Visuelles Feedback
338|
339|## Animationszeiten
340|
341|| Aktion | Dauer | Easing |
342||--------|-------|--------|
343|| Hover (Card) | 200ms | ease-out (cubic-bezier(0,0,0.2,1)) |
344|| Hover (Liste) | 150ms | ease-out |
345|| Play/Pause | 0ms | instant |
346|| Like (Herz) | 300ms | ease-in-out (cubic-bezier(0.4,0,0.2,1)) |
347|| Sidebar Collapse | 250ms | ease-in-out |
348|| Context Menu | 150ms | ease-out |
349|| Modal | 200ms | ease-out |
350|| Toast | 200ms | ease-out |
351|| Progress-Bar | kontinuierlich | linear |
352|
353|## Easing-Funktionen
354|
355|```css
356|--ease-out: cubic-bezier(0, 0, 0.2, 1);
357|--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
358|--ease-linear: linear;
359|```
360|
361|## Feedback-Typen
362|
363|- Button-Klick: Instant 0.1s Scale-Down (scale 0.95)
364|- Like: Pop-Animation (scale 0→1.2→1.0)
365|- Play/Pause: Instant Icon-Swap
366|- Progress-Scrubbing: Tooltip mit Timestamp
367|- Toast: Slide-In von oben-rechts (200ms)
368|
369|---
370|
371|# Multi-Touch (Zukunft)
372|
373|- Pinch-zoom für Cover (Vollbild)
374|- Two-finger swipe für Queue
375|- Drei-Finger-Tap für zufällige Playlist
376|
377|---
378|
379|# Gesten-Editor (Zukunft)
380|
381|User kann eigene Gesten definieren.
382|
383|Einstellungen → Touch → Gesten.
384|
385|Jede Geste kann mit einer Aktion verknüpft werden.
386|
387|---
388|
389|# Zukünftige Erweiterungen
390|
391|Dieses Dokument wird später detailliert beschreiben
392|
393|- Mausgesten (Mouse Trails)
394|- Gamepad-Support
395|- MIDI-Controller-Integration
396|- Voice Commands (erweitert)
397|- Eye-Tracking
398|

---

# User Interactions v0.2

## Keyboard Shortcuts (Global)
Play/Pause, Next, Previous, Shuffle, Repeat, Mute, Volume, Search, Home, Library, Queue, Now Playing

## Tastaturnavigation
Alle interaktiven Komponenten besitzen einen Fokuszustand. Navigation erfolgt vollständig ohne Maus.

## Drag & Drop
Unterstützt: Songs, Alben, Playlists, Ordner, Sammlungen, Mehrfachauswahl
Drag Ziele: Playlist, Queue, Bibliothek, Ordner, Collection

## Mehrfachauswahl
Ctrl-Auswahl, Shift-Auswahl, Bereichsauswahl, Alles auswählen, Auswahl aufheben

## Kontextmenüs
Werden durch Rechtsklick, Kontexttaste oder Touchpad Gesture geöffnet.

## Hover Verhalten
Hover verändert niemals das Layout. Nur Farbe, Transparenz, Elevation dürfen angepasst werden.

## Animationen
Kurze Übergänge. Keine blockierenden Animationen. Animationen dürfen Eingaben niemals verzögern.

## Transitionen
Seitenwechsel, Dialoge, Sidebar, Now Playing, Kontextmenüs verwenden konsistente Übergänge.

## Accessibility
Keyboard First, ARIA Labels, Screenreader Unterstützung, Hohe Kontraste, Große Klickflächen, Fokusindikatoren

## Erweiterung später
Vollständige Shortcutliste, Mausgesten, Touchpadgesten, Drag Animationen, Accessibility Matrix
