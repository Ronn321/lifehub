# Playback Player

Version 0.2

---

# Ziel

Der Playback Player ist das dauerhaft sichtbare Zentrum der Musikwiedergabe.

Er bleibt unabhängig von Navigation, Seitenwechseln oder Suchvorgängen permanent erhalten.

---

# Aufbau

Der Player besteht aus drei Hauptbereichen.

```
+-----------------------------------------------------------+
Left Section    |    Center Section    |    Right Section  |
(30% Cover+Info)| (Controls+Timeline) | (Volume+Extras)   |
+-----------------------------------------------------------+
                     90px hoch
```

- Left Section: 30% der Breite
- Center Section: 40% der Breite (max 600px)
- Right Section: 30% der Breite

Player-Bar Gesamthöhe: 90px.

---

# Left Section

Zeigt Informationen zum aktuell wiedergegebenen Titel.

```
+-----------------------------------------------------------+
[Cover] Songtitel                    [♥] [↗ Expand]      |
56x56px  Künstler                                     |
+-----------------------------------------------------------+
```

## Elemente

Element | Größe | Stil |
---------|-------|------|
Cover | 56x56 px | quadratisch, 4px Radius |
Songtitel | 14px | bold, weiß |
Künstler | 12px | sekundär (#B3B3B3) |
Like-Button | 20x20 px | Herz-Icon |
Expand-Button | 20x20 px | ↗-Icon, öffnet Now Playing View |

## Hover

- Like-Button erscheint bei Hover (oder ist sichtbar wenn geliked)
- Expand-Button erscheint bei Hover

## Klickverhalten

- Klick auf Cover: öffnet Albumseite
- Klick auf Titel: öffnet Albumseite
- Klick auf Künstler: öffnet Künstlerseite
- Klick auf Expand: öffnet Now Playing View (Right Sidebar oder Vollbild)

---

# Center Section

Steuert die Wiedergabe.

```
+-----------------------------------------------------------+
    [⇄] [⏮] [▶] [⏭] [↻]                                 |
                                                          |
 1:23  ████████░░░░░░░░░░░░░░░░  3:45                     |
+-----------------------------------------------------------+
```

## Controls

Button | Größe | Verhalten |
--------|-------|-----------|
Shuffle (⇄) | 20px Icon | Toggle: an=grün, aus=grau |
Previous (⏮) | 20px Icon | Springt zu vorherigem Track |
Play/Pause (▶/⏸) | 32px Kreis | Großer grüner Kreis, Instant-Icon-Swap |
Next (⏭) | 20px Icon | Springt zu nächstem Track |
Repeat (↻) | 20px Icon | Toggle: off→all→one (3 Zustände) |

Buttons zentriert mit 16px Abstand.

## Repeat-Zustände

Zustand | Icon-Farbe | Tooltip |
---------|-----------|---------|
off | grau (#B3B3B3) | "Wiederholen aus" |
all | grün (#1DB954) | "Alle wiederholen" |
one | grün + Badge "1" | "Einen wiederholen" |

---

# Timeline

Zeigt Fortschritt und Dauer.

## Elemente

Element | Wert |
---------|------|
Aktuelle Position | Format m:ss, links |
Gesamtdauer | Format m:ss, rechts |
Progress-Bar | 4px hoch, grün=abgespielt, grau=verbleibend |
Progress-Handle | 12px Kreis, erscheint bei Hover |

## Interaktion

Aktion | Verhalten |
--------|-----------|
Klick auf Bar | Springt zu Position |
Drag Handle | Scrubbing mit Tooltip (Zeit) |
Hover | Handle erscheint, Bar wird 6px hoch |

## Tooltip

Bei Hover/Drag erscheint Zeitstempel über dem Handle.

Format: "2:34".

---

# Right Section

```
+-----------------------------------------------------------+
[♫] [☰³] [📺] [🔊━━] [⛶] [⧉]                            |
+-----------------------------------------------------------+
```

Button | Funktion |
---------|----------|
Lyrics (♫) | Öffnet Lyrics-Tab in Now Playing |
Queue (☰) | Öffnet Queue, Badge mit Song-Anzahl |
Geräteauswahl (📺) | Öffnet Device-Picker |
Volume (🔊) | Slider + Mute-Toggle |
Fullscreen (⛶) | Now Playing Vollbildmodus |
Mini-Player (⧉) | Koppelt Mini-Player ab |

## Volume-Control

- Slider: horizontal, 100px breit
- Handle: 12px Kreis
- Mute-Toggle: Klick auf Icon toggelt mute/unmute
- Persistiert in localStorage (volume + mute)

---

# Player States

TypeScript Union Type für Player-Zustand.

```typescript
type PlayerState = 'idle' | 'loading' | 'playing' | 'paused' | 'error' | 'ended';
```

Zustand | Visuell |
---------|---------|
idle | Play-Icon grau, keine Queue |
loading | Spinner im Play-Button |
playing | Pause-Icon, Soundbar-Animation |
paused | Play-Icon |
error | Error-Icon + Toast |
ended | Play-Icon (Track zu Ende) |

---

# State Management

Zustand-Store für Player-State.

```typescript
interface PlayerStore {
 // Current track
 currentTrack: Song | null;
 currentState: PlayerState;
 position: number;          // Sekunden
 duration: number;          // Sekunden

 // Queue
 queue: Song[];
 queueType: 'manual' | 'album' | 'playlist';
 currentIndex: number;
 history: Song[];

 // Settings (persistiert)
 volume: number;            // 0.0 - 1.0
 isMuted: boolean;
 shuffle: boolean;
 repeatMode: 'off' | 'all' | 'one';

 // Actions
 play: () => void;
 pause: () => void;
 next: () => void;
 previous: () => void;
 seek: (position: number) => void;
 setVolume: (volume: number) => void;
 toggleShuffle: () => void;
 cycleRepeat: () => void;
 addToQueue: (song: Song) => void;
 removeFromQueue: (index: number) => void;
 playFromQueue: (index: number) => void;
}
```

Persistiert über Sessions: volume, isMuted, shuffle, repeatMode.

---

# Queue

Queue State.

```typescript
type QueueType = 'manual' | 'album' | 'playlist';
```

## Queue-Aktionen

- Reihenfolge anzeigen (in Now Playing Queue-Tab)
- Songs verschieben (Drag & Drop)
- Songs entfernen (✕ oder Entf)
- Queue speichern (als Playlist)
- Queue leeren

---

# Wiedergabemodi

Modus | Verhalten |
-------|-----------|
Normal | Songs in Reihenfolge, stoppt am Ende |
Shuffle | Zufällige Reihenfolge |
Repeat One | Aktueller Song wiederholt sich |
Repeat All | Queue wiederholt sich als Schleife |
Continuous | Automatisch ähnliche Songs am Ende (Radio) |

---

# Audioformate

Unterstützt (über Jellyfin Transkodierung falls nötig):

Format | Container | Hinweis |
--------|-----------|---------|
MP3 | mp3 | Universell |
FLAC | flac | Lossless, bevorzugt |
OGG | ogg | Open Source |
OPUS | opus | Effizient |
AAC | m4a | Apple |
WAV | wav | Uncompressed |

---

# Streaminglogik

## Preload

Nächster Track wird preloaded wenn aktueller Track > 80% abgespielt.

## Gapless Playback

Zwei Audio-Instanzen wechseln nahtlos.

- Instance A spielt aktuellen Track
- Instance B preloaded nächsten Track
- Bei Track-Ende: Cross-Fade oder Instant-Switch

## Buffering

- Min-Buffer: 10 Sekunden
- Bei langsamer Verbindung: größere Buffer
- Buffering-State zeigt Spinner im Play-Button

---

# Jellyfin Integration

## Stream-Endpoint

```
GET /Audio/{id}/stream
   ?static=true              (direkte Datei, kein Transcoding)
   | ?audioCodec=mp3&bitRate=320   (Transkodierung)
   &apiKey={token}
```

## Playback-Reporting

```
POST /Sessions/Playing
POST /Sessions/Playing/Progress
POST /Sessions/Playing/Stopped
```

## Verwendung

Der Player verwendet Jellyfin für:

- Streams (/Audio/{id}/stream)
- Metadaten (/Items/{id})
- Cover (/Items/{id}/Images/Primary)
- Wiedergabestatus (UserData, PlayCount)
- Playback-Reporting

LifeHub erweitert dies um:

- Verlauf (erweitert)
- Queue (Client-State)
- Favoriten
- Empfehlungen
- Statistiken

---

# Design Tokens

```css
:root {
 --player-bar-height: 90px;
 --player-cover-size: 56px;
 --player-icon-size: 20px;
 --player-play-button-size: 32px;
 --accent-color: #1DB954;
 --accent-hover: #1ED760;
 --progress-bar-height: 4px;
 --progress-bar-hover-height: 6px;
 --volume-slider-width: 100px;
}
```

---

# Accessibility

- Player-Bar: role="region", aria-label="Musikplayer"
- Play-Button: aria-label="Wiedergabe" / "Pause"
- Progress-Bar: role="slider", aria-valuenow, aria-valuemin=0, aria-valuemax
- Volume: role="slider"
- Shuffle: aria-pressed
- Repeat: aria-label mit aktuellem Modus

---

# React Komponenten

Komponente | Pfad |
------------|------|
PlayerBar | src/components/player/PlayerBar.tsx |
PlayerCover | src/components/player/PlayerCover.tsx |
PlayerTrackInfo | src/components/player/PlayerTrackInfo.tsx |
PlaybackControls | src/components/player/PlaybackControls.tsx |
PlayButton | src/components/player/PlayButton.tsx |
ProgressBar | src/components/player/ProgressBar.tsx |
VolumeControl | src/components/player/VolumeControl.tsx |
QueueButton | src/components/player/QueueButton.tsx |

---

# Performance

- Web Audio API für Audio-Playback
- requestAnimationFrame für Progress-Update (kein setInterval)
- Throttling auf 60fps für smooth Progress

---

# Keyboard Shortcuts

Taste | Aktion |
-------|--------|
Space | Play/Pause |
→ | Nächster Track |
← | Vorheriger Track |
Shift+→ | 10s Vorspulen |
Shift+← | 10s Zurückspulen |
+ / = | Lauter (+10%) |
- | Leiser (-10%) |
M | Stumm schalten |
F | Vollbildmodus |

---

# Fehlerzustände

Fehler | Anzeige |
--------|---------|
Keine Verbindung | Error-Icon + Toast "Keine Verbindung zum Server" |
Datei fehlt (404) | Error-Icon + Toast "Datei nicht gefunden" |
Codec nicht unterstützt | Error-Icon + Toast "Format wird nicht unterstützt" |
Stream-Timeout | Error-Icon + Toast "Stream abgebrochen" |

Bei Fehler: automatischer Skip zum nächsten Track nach 5 Sekunden.

---

# Lautstärke

- Slider: horizontal, 100px
- Stummschalten: Klick auf Icon toggelt mute
- Tastatur: +/- für Lauter/Leiser, M für Mute
- Persistierung: localStorage (volume + muted)

---

# Geräteauswahl

Anzeige aller verfügbaren Wiedergabegeräte.

Spätere Unterstützung:

- Jellyfin Clients (andere Sessions)
- Netzwerkgeräte (AirPlay, Chromecast, DLNA)
- Bluetooth-Geräte
- Lokale Audio-Geräte

---

# Zukünftige Erweiterungen

Dieses Dokument wird später detailliert beschreiben

- Equalizer und Audio-Effekte
- Cross-Fade Konfiguration
- ReplayGain
- Audio-Visualizer in Player-Bar
- AirPlay 2 Support
- Karaoke-Modus

---

# React Komponentenstruktur (v0.3)

```
<Player>
├── PlayerLeft: AlbumCover, SongInfo, ArtistLinks, FavoriteButton
├── PlayerCenter: ShuffleButton, PreviousButton, PlayButton, NextButton, RepeatButton, Timeline
└── PlayerRight: LyricsButton, QueueButton, DeviceButton, VolumeControl, FullscreenButton
```

Jede Player-Komponente liest ausschließlich globale Zustände aus dem Zustand-Store. Keine Player-Komponente besitzt eigenen Wiedergabezustand.

---

# Performance (v0.3)

- Player wird genau einmal erzeugt. Navigation führt niemals zum Neuaufbau.
- Albumcover gecacht pro Album-Id.
- Timeline GPU-beschleunigt (transform: translateX).
- Buttons nur bei Zustandsänderung neu gerendert (React.memo).
