1|1|# Playback Player
2|2|
3|3|Version 0.2
4|4|
5|5|---
6|6|
7|7|# Ziel
8|8|
9|9|Der Playback Player ist das dauerhaft sichtbare Zentrum der Musikwiedergabe.
10|10|
11|11|Er bleibt unabhängig von Navigation, Seitenwechseln oder Suchvorgängen permanent erhalten.
12|12|
13|13|---
14|14|
15|15|# Aufbau
16|16|
17|17|Der Player besteht aus drei Hauptbereichen.
18|18|
19|19|```
20|20|+-----------------------------------------------------------+
21|21|| Left Section    |    Center Section    |    Right Section  |
22|22|| (30% Cover+Info)| (Controls+Timeline) | (Volume+Extras)   |
23|23|+-----------------------------------------------------------+
24|24|                      90px hoch
25|25|```
26|26|
27|27|- Left Section: 30% der Breite
28|28|- Center Section: 40% der Breite (max 600px)
29|29|- Right Section: 30% der Breite
30|30|
31|31|Player-Bar Gesamthöhe: 90px.
32|32|
33|33|---
34|34|
35|35|# Left Section
36|36|
37|37|Zeigt Informationen zum aktuell wiedergegebenen Titel.
38|38|
39|39|```
40|40|+-----------------------------------------------------------+
41|41|| [Cover] Songtitel                    [♥] [↗ Expand]      |
42|42|| 56x56px  Künstler                                     |
43|43|+-----------------------------------------------------------+
44|44|```
45|45|
46|46|## Elemente
47|47|
48|48|| Element | Größe | Stil |
49|49||---------|-------|------|
50|50|| Cover | 56x56 px | quadratisch, 4px Radius |
51|51|| Songtitel | 14px | bold, weiß |
52|52|| Künstler | 12px | sekundär (#B3B3B3) |
53|53|| Like-Button | 20x20 px | Herz-Icon |
54|54|| Expand-Button | 20x20 px | ↗-Icon, öffnet Now Playing View |
55|55|
56|56|## Hover
57|57|
58|58|- Like-Button erscheint bei Hover (oder ist sichtbar wenn geliked)
59|59|- Expand-Button erscheint bei Hover
60|60|
61|61|## Klickverhalten
62|62|
63|63|- Klick auf Cover: öffnet Albumseite
64|64|- Klick auf Titel: öffnet Albumseite
65|65|- Klick auf Künstler: öffnet Künstlerseite
66|66|- Klick auf Expand: öffnet Now Playing View (Right Sidebar oder Vollbild)
67|67|
68|68|---
69|69|
70|70|# Center Section
71|71|
72|72|Steuert die Wiedergabe.
73|73|
74|74|```
75|75|+-----------------------------------------------------------+
76|76||     [⇄] [⏮] [▶] [⏭] [↻]                                 |
77|77||                                                           |
78|78||  1:23  ████████░░░░░░░░░░░░░░░░  3:45                     |
79|79|+-----------------------------------------------------------+
80|80|```
81|81|
82|82|## Controls
83|83|
84|84|| Button | Größe | Verhalten |
85|85||--------|-------|-----------|
86|86|| Shuffle (⇄) | 20px Icon | Toggle: an=grün, aus=grau |
87|87|| Previous (⏮) | 20px Icon | Springt zu vorherigem Track |
88|88|| Play/Pause (▶/⏸) | 32px Kreis | Großer grüner Kreis, Instant-Icon-Swap |
89|89|| Next (⏭) | 20px Icon | Springt zu nächstem Track |
90|90|| Repeat (↻) | 20px Icon | Toggle: off→all→one (3 Zustände) |
91|91|
92|92|Buttons zentriert mit 16px Abstand.
93|93|
94|94|## Repeat-Zustände
95|95|
96|96|| Zustand | Icon-Farbe | Tooltip |
97|97||---------|-----------|---------|
98|98|| off | grau (#B3B3B3) | "Wiederholen aus" |
99|99|| all | grün (#1DB954) | "Alle wiederholen" |
100|100|| one | grün + Badge "1" | "Einen wiederholen" |
101|101|
102|102|---
103|103|
104|104|# Timeline
105|105|
106|106|Zeigt Fortschritt und Dauer.
107|107|
108|108|## Elemente
109|109|
110|110|| Element | Wert |
111|111||---------|------|
112|112|| Aktuelle Position | Format m:ss, links |
113|113|| Gesamtdauer | Format m:ss, rechts |
114|114|| Progress-Bar | 4px hoch, grün=abgespielt, grau=verbleibend |
115|115|| Progress-Handle | 12px Kreis, erscheint bei Hover |
116|116|
117|117|## Interaktion
118|118|
119|119|| Aktion | Verhalten |
120|120||--------|-----------|
121|121|| Klick auf Bar | Springt zu Position |
122|122|| Drag Handle | Scrubbing mit Tooltip (Zeit) |
123|123|| Hover | Handle erscheint, Bar wird 6px hoch |
124|124|
125|125|## Tooltip
126|126|
127|127|Bei Hover/Drag erscheint Zeitstempel über dem Handle.
128|128|
129|129|Format: "2:34".
130|130|
131|131|---
132|132|
133|133|# Right Section
134|134|
135|135|```
136|136|+-----------------------------------------------------------+
137|137|| [♫] [☰³] [📺] [🔊━━] [⛶] [⧉]                            |
138|138|+-----------------------------------------------------------+
139|139|```
140|140|
141|141|| Button | Funktion |
142|142||---------|----------|
143|143|| Lyrics (♫) | Öffnet Lyrics-Tab in Now Playing |
144|144|| Queue (☰) | Öffnet Queue, Badge mit Song-Anzahl |
145|145|| Geräteauswahl (📺) | Öffnet Device-Picker |
146|146|| Volume (🔊) | Slider + Mute-Toggle |
147|147|| Fullscreen (⛶) | Now Playing Vollbildmodus |
148|148|| Mini-Player (⧉) | Koppelt Mini-Player ab |
149|149|
150|150|## Volume-Control
151|151|
152|152|- Slider: horizontal, 100px breit
153|153|- Handle: 12px Kreis
154|154|- Mute-Toggle: Klick auf Icon toggelt mute/unmute
155|155|- Persistiert in localStorage (volume + mute)
156|156|
157|157|---
158|158|
159|159|# Player States
160|160|
161|161|TypeScript Union Type für Player-Zustand.
162|162|
163|163|```typescript
164|164|type PlayerState = 'idle' | 'loading' | 'playing' | 'paused' | 'error' | 'ended';
165|165|```
166|166|
167|167|| Zustand | Visuell |
168|168||---------|---------|
169|169|| idle | Play-Icon grau, keine Queue |
170|170|| loading | Spinner im Play-Button |
171|171|| playing | Pause-Icon, Soundbar-Animation |
172|172|| paused | Play-Icon |
173|173|| error | Error-Icon + Toast |
174|174|| ended | Play-Icon (Track zu Ende) |
175|175|
176|176|---
177|177|
178|178|# State Management
179|179|
180|180|Zustand-Store für Player-State.
181|181|
182|182|```typescript
183|183|interface PlayerStore {
184|184|  // Current track
185|185|  currentTrack: Song | null;
186|186|  currentState: PlayerState;
187|187|  position: number;          // Sekunden
188|188|  duration: number;          // Sekunden
189|189|
190|190|  // Queue
191|191|  queue: Song[];
192|192|  queueType: 'manual' | 'album' | 'playlist';
193|193|  currentIndex: number;
194|194|  history: Song[];
195|195|
196|196|  // Settings (persistiert)
197|197|  volume: number;            // 0.0 - 1.0
198|198|  isMuted: boolean;
199|199|  shuffle: boolean;
200|200|  repeatMode: 'off' | 'all' | 'one';
201|201|
202|202|  // Actions
203|203|  play: () => void;
204|204|  pause: () => void;
205|205|  next: () => void;
206|206|  previous: () => void;
207|207|  seek: (position: number) => void;
208|208|  setVolume: (volume: number) => void;
209|209|  toggleShuffle: () => void;
210|210|  cycleRepeat: () => void;
211|211|  addToQueue: (song: Song) => void;
212|212|  removeFromQueue: (index: number) => void;
213|213|  playFromQueue: (index: number) => void;
214|214|}
215|215|```
216|216|
217|217|Persistiert über Sessions: volume, isMuted, shuffle, repeatMode.
218|218|
219|219|---
220|220|
221|221|# Queue
222|222|
223|223|Queue State.
224|224|
225|225|```typescript
226|226|type QueueType = 'manual' | 'album' | 'playlist';
227|227|```
228|228|
229|229|## Queue-Aktionen
230|230|
231|231|- Reihenfolge anzeigen (in Now Playing Queue-Tab)
232|232|- Songs verschieben (Drag & Drop)
233|233|- Songs entfernen (✕ oder Entf)
234|234|- Queue speichern (als Playlist)
235|235|- Queue leeren
236|236|
237|237|---
238|238|
239|239|# Wiedergabemodi
240|240|
241|241|| Modus | Verhalten |
242|242||-------|-----------|
243|243|| Normal | Songs in Reihenfolge, stoppt am Ende |
244|244|| Shuffle | Zufällige Reihenfolge |
245|245|| Repeat One | Aktueller Song wiederholt sich |
246|246|| Repeat All | Queue wiederholt sich als Schleife |
247|247|| Continuous | Automatisch ähnliche Songs am Ende (Radio) |
248|248|
249|249|---
250|250|
251|251|# Audioformate
252|252|
253|253|Unterstützt (über Jellyfin Transkodierung falls nötig):
254|254|
255|255|| Format | Container | Hinweis |
256|256||--------|-----------|---------|
257|257|| MP3 | mp3 | Universell |
258|258|| FLAC | flac | Lossless, bevorzugt |
259|259|| OGG | ogg | Open Source |
260|260|| OPUS | opus | Effizient |
261|261|| AAC | m4a | Apple |
262|262|| WAV | wav | Uncompressed |
263|263|
264|264|---
265|265|
266|266|# Streaminglogik
267|267|
268|268|## Preload
269|269|
270|270|Nächster Track wird preloaded wenn aktueller Track > 80% abgespielt.
271|271|
272|272|## Gapless Playback
273|273|
274|274|Zwei Audio-Instanzen wechseln nahtlos.
275|275|
276|276|- Instance A spielt aktuellen Track
277|277|- Instance B preloaded nächsten Track
278|278|- Bei Track-Ende: Cross-Fade oder Instant-Switch
279|279|
280|280|## Buffering
281|281|
282|282|- Min-Buffer: 10 Sekunden
283|283|- Bei langsamer Verbindung: größere Buffer
284|284|- Buffering-State zeigt Spinner im Play-Button
285|285|
286|286|---
287|287|
288|288|# Jellyfin Integration
289|289|
290|290|## Stream-Endpoint
291|291|
292|292|```
293|293|GET /Audio/{id}/stream
294|294|    ?static=true              (direkte Datei, kein Transcoding)
295|295|    | ?audioCodec=mp3&bitRate=320   (Transkodierung)
296|296|    &apiKey={token}
297|297|```
298|298|
299|299|## Playback-Reporting
300|300|
301|301|```
302|302|POST /Sessions/Playing
303|303|POST /Sessions/Playing/Progress
304|304|POST /Sessions/Playing/Stopped
305|305|```
306|306|
307|307|## Verwendung
308|308|
309|309|Der Player verwendet Jellyfin für:
310|310|
311|311|- Streams (/Audio/{id}/stream)
312|312|- Metadaten (/Items/{id})
313|313|- Cover (/Items/{id}/Images/Primary)
314|314|- Wiedergabestatus (UserData, PlayCount)
315|315|- Playback-Reporting
316|316|
317|317|LifeHub erweitert dies um:
318|318|
319|319|- Verlauf (erweitert)
320|320|- Queue (Client-State)
321|321|- Favoriten
322|322|- Empfehlungen
323|323|- Statistiken
324|324|
325|325|---
326|326|
327|327|# Design Tokens
328|328|
329|329|```css
330|330|:root {
331|331|  --player-bar-height: 90px;
332|332|  --player-cover-size: 56px;
333|333|  --player-icon-size: 20px;
334|334|  --player-play-button-size: 32px;
335|335|  --accent-color: #1DB954;
336|336|  --accent-hover: #1ED760;
337|337|  --progress-bar-height: 4px;
338|338|  --progress-bar-hover-height: 6px;
339|339|  --volume-slider-width: 100px;
340|340|}
341|341|```
342|342|
343|343|---
344|344|
345|345|# Accessibility
346|346|
347|347|- Player-Bar: role="region", aria-label="Musikplayer"
348|348|- Play-Button: aria-label="Wiedergabe" / "Pause"
349|349|- Progress-Bar: role="slider", aria-valuenow, aria-valuemin=0, aria-valuemax
350|350|- Volume: role="slider"
351|351|- Shuffle: aria-pressed
352|352|- Repeat: aria-label mit aktuellem Modus
353|353|
354|354|---
355|355|
356|356|# React Komponenten
357|357|
358|358|| Komponente | Pfad |
359|359||------------|------|
360|360|| PlayerBar | src/components/player/PlayerBar.tsx |
361|361|| PlayerCover | src/components/player/PlayerCover.tsx |
362|362|| PlayerTrackInfo | src/components/player/PlayerTrackInfo.tsx |
363|363|| PlaybackControls | src/components/player/PlaybackControls.tsx |
364|364|| PlayButton | src/components/player/PlayButton.tsx |
365|365|| ProgressBar | src/components/player/ProgressBar.tsx |
366|366|| VolumeControl | src/components/player/VolumeControl.tsx |
367|367|| QueueButton | src/components/player/QueueButton.tsx |
368|368|
369|369|---
370|370|
371|371|# Performance
372|372|
373|373|- Web Audio API für Audio-Playback
374|374|- requestAnimationFrame für Progress-Update (kein setInterval)
375|375|- Throttling auf 60fps für smooth Progress
376|376|
377|377|---
378|378|
379|379|# Keyboard Shortcuts
380|380|
381|381|| Taste | Aktion |
382|382||-------|--------|
383|383|| Space | Play/Pause |
384|384|| → | Nächster Track |
385|385|| ← | Vorheriger Track |
386|386|| Shift+→ | 10s Vorspulen |
387|387|| Shift+← | 10s Zurückspulen |
388|388|| + / = | Lauter (+10%) |
389|389|| - | Leiser (-10%) |
390|390|| M | Stumm schalten |
391|391|| F | Vollbildmodus |
392|392|
393|393|---
394|394|
395|395|# Fehlerzustände
396|396|
397|397|| Fehler | Anzeige |
398|398||--------|---------|
399|399|| Keine Verbindung | Error-Icon + Toast "Keine Verbindung zum Server" |
400|400|| Datei fehlt (404) | Error-Icon + Toast "Datei nicht gefunden" |
401|401|| Codec nicht unterstützt | Error-Icon + Toast "Format wird nicht unterstützt" |
402|402|| Stream-Timeout | Error-Icon + Toast "Stream abgebrochen" |
403|403|
404|404|Bei Fehler: automatischer Skip zum nächsten Track nach 5 Sekunden.
405|405|
406|406|---
407|407|
408|408|# Lautstärke
409|409|
410|410|- Slider: horizontal, 100px
411|411|- Stummschalten: Klick auf Icon toggelt mute
412|412|- Tastatur: +/- für Lauter/Leiser, M für Mute
413|413|- Persistierung: localStorage (volume + muted)
414|414|
415|415|---
416|416|
417|417|# Geräteauswahl
418|418|
419|419|Anzeige aller verfügbaren Wiedergabegeräte.
420|420|
421|421|Spätere Unterstützung:
422|422|
423|423|- Jellyfin Clients (andere Sessions)
424|424|- Netzwerkgeräte (AirPlay, Chromecast, DLNA)
425|425|- Bluetooth-Geräte
426|426|- Lokale Audio-Geräte
427|427|
428|428|---
429|429|
430|430|# Zukünftige Erweiterungen
431|431|
432|432|Dieses Dokument wird später detailliert beschreiben
433|433|
434|434|- Equalizer und Audio-Effekte
435|435|- Cross-Fade Konfiguration
436|436|- ReplayGain
437|437|- Audio-Visualizer in Player-Bar
438|438|- AirPlay 2 Support
439|439|- Karaoke-Modus
440|440|
441|
442|---
443|
444|# Player States
445|
446|Der Player arbeitet als zustandsbasierte Komponente. Alle UI-Komponenten reagieren ausschließlich auf den aktuellen Player State.
447|
448|---
449|
450|# Hauptzustände
451|
452|Uninitialized: Player wurde noch nicht gestartet.
453|Loading: Titel wird geladen.
454|Ready: Titel ist geladen.
455|Playing: Aktive Wiedergabe.
456|Paused: Wiedergabe pausiert.
457|Buffering: Daten werden nachgeladen.
458|Seeking: Benutzer verändert die Position.
459|Finished: Titel vollständig abgespielt.
460|Error: Fehler beim Laden.
461|
462|---
463|
464|# Zustandsübergänge
465|Loading > Ready > Playing > Paused > Playing > Finished > Next Song
466|
467|---
468|
469|# Queue Management
470|
471|Die Queue ist unabhängig von Playlists. Eigene Zustände: Current Song, Bereits gespielt, Als Nächstes, Manuell/Automatisch hinzugefügt.
472|
473|---
474|
475|# Queue Aktionen
476|Song verschieben/entfernen, Mehrere markieren, Queue speichern/laden/löschen/neu erzeugen
477|
478|---
479|
480|# Queue Verhalten
481|Beim Öffnen einer Playlist wird Queue erzeugt. Manuell hinzugefügte Titel bleiben erhalten. Shuffle verändert ausschließlich die Queue. Playlistreihenfolge unverändert.
482|
483|---
484|
485|# Device Selection
486|Lokaler Computer, Jellyfin Client, Webbrowser, Bluetooth, Netzwerkgeräte
487|
488|---
489|
490|# Geräteinformationen
491|Name, Status, Aktiver Stream, Verbindungsstatus, Lautstärke, Synchronisation
492|
493|---
494|
495|# Lyrics (optional)
496|Synchronisierte/Unsynchronisierte Lyrics, Zeitmarken, Automatisches Scrollen, Sprung zu Textzeile
497|
498|---
499|
500|# Cover Darstellung
501|Mini, Player, Now Playing, Playlist Header, Albumseite, Bibliothek — identische Bildquellen
502|
503|---
504|
505|# Playback Regeln
506|Nur ein aktiver Player. Nur eine Queue. Alle Seiten greifen auf denselben Zustand zu.
507|
508|---
509|
510|# Jellyfin Datenmodell
511|Audio Stream, Playback Position/Session, Cover, Metadata, Playback Device, Queue, History
512|
513|---
514|
515|# Virtualisierung
516|Queue verwendet virtuelle Listen. Nur sichtbare Songs werden gerendert.
517|
518|---
519|
520|# Erweiterung später
521|Streaminglogik, Crossfade, Gapless Playback, Equalizer, Audioformate, Playback Cache, Offline, Synchronisierte Geräte
522|

---

# Desktop Player Specification v0.3

# Ziel

Der Player ist das wichtigste UI-Element der Music Domain. Er ist permanent sichtbar, unabhängig von Navigation oder Seitenwechseln, und bildet den zentralen Einstiegspunkt für sämtliche Wiedergabefunktionen. Alle Seiten der Music Domain greifen auf genau eine globale Player-Instanz zu.

---

# Grundaufbau

Der Player besteht aus drei logisch getrennten Bereichen:
Left Section (Cover, Song, Artist, Favorite) | Center Section (Shuffle, Previous, Play/Pause, Next, Repeat, Timeline) | Right Section (Queue, Devices, Lyrics, Volume, Fullscreen)

---

# Player Prinzipien
- Verschwindet niemals
- Besitzt immer dieselbe Höhe
- Verändert niemals seine Position
- Bleibt während Navigation erhalten
- Besitzt nur eine aktive Wiedergabe
- Besitzt nur eine Queue

---

# Left Section
Anzeige des aktuell wiedergegebenen Mediums. Inhalte: Albumcover (quadratisch, Klick=Album, Doppelklick=Now Playing), Songtitel (Klick=Info, Doppelklick=Album), Interpret (Klick=Künstlerseite, mehrere=kommagetrennte Links), Favorit (Toggle, sofort sync).

# Center Section
Mittelpunkt des Players. Reihenfolge: Shuffle > Previous > Play/Pause (größter Button, Spinner bei Loading) > Next > Repeat > Timeline.

# Timeline
Aktuelle Zeit + Fortschrittsbalken + Drag Handle + Gesamtdauer. Hover: Handle erscheint. Drag: Seek. Loslassen: Neue Position. Während Seek läuft Audio weiter.

# Repeat & Shuffle
Repeat: Off > All > One (zyklisch). Shuffle: Off > On (Queue wird neu gemischt, Playlist unverändert).

# Right Section
Reihenfolge: Lyrics > Queue > Devices > Volume (Slider 0-100%, Mausrad) > Fullscreen. Mute merkt sich letzte Lautstärke.

# Queue
Unabhängig von Playlist, Album, Suche, Bibliothek. Aktionen: Entfernen, Verschieben, Überspringen, Speichern, Löschen, Shuffle.

# Kontextmenüs
Albumcover, Songtitel, Interpret, Timeline, Queue, Lyrics, Devices — alle mit eigenen Menüs.

# Tastatur
Play/Pause, Next, Previous, Mute, Volume, Seek, Shuffle, Repeat, Queue, Lyrics — vollständig per Tastatur.

# Animationen
Play/Pause: 100-150ms, Hover: 80-120ms, Timeline: kontinuierlich, Volume: direkt, Dialoge: 150-200ms.

# Accessibility
Alle Buttons mit ARIA Label, Tooltip, Keyboard Fokus, Screenreader Text, Kontrastprüfung.

# Performance
Player wird genau einmal erzeugt. Navigation führt niemals zum Neuaufbau. Albumcover gecacht. Timeline GPU-beschleunigt. Buttons nur bei Zustandsänderung neu gerendert.

# React Komponentenstruktur
```
<Player>
├── PlayerLeft: AlbumCover, SongInfo, ArtistLinks, FavoriteButton
├── PlayerCenter: ShuffleButton, PreviousButton, PlayButton, NextButton, RepeatButton, Timeline
└── PlayerRight: LyricsButton, QueueButton, DeviceButton, VolumeControl, FullscreenButton
```

# Zustandsverwaltung
Globale Player States: Current Track, Playback Position, Queue, Volume, Repeat Mode, Shuffle Mode, Playback Device, Lyrics State, Now Playing State. Alle Komponenten lesen ausschließlich diese globalen Zustände — keine Player-Komponente besitzt eigenen Wiedergabezustand.
