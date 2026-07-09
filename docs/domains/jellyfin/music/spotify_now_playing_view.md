# Now Playing View

Version 0.2

---

# Ziel

Die Now Playing View erweitert den Player um zusätzliche Informationen zum aktuell wiedergegebenen Titel.

Sie erscheint als rechte Seitenleiste, Vollbild oder Mini-Player.

---

# Modi

Die Now Playing View besitzt drei Modi.

## Modus 1: Right Sidebar (320px)

```
+---------------------------+
Now Playing | Lyrics |Queue|  ← Tabs
+---------------------------+
                          |
   +-----------------+    |
   |                 |    |
   |   Album-Cover   |    |
   |    (280x280)    |    |
   |                 |    |
   +-----------------+    |
                          |
   Songtitel              |
   Künstler • Album       |
                          |
   [Abspielen] [♥] [⋯]    |
                          |
+---------------------------+
  Right Sidebar, 320px
```

Sichtbar bei Fenster ≥ 1280px.

Toggle über Now-Playing-Icon in Player-Bar.

## Modus 2: Vollbild (F11)

```
+-----------------------------------------------------------+
                                                          |
                   +------------------+                   |
                   |                  |                   |
                   |  Album-Cover     |                   |
                   |   (400x400)      |                   |
                   |                  |                   |
                   +------------------+                   |
                                                          |
                  Songtitel (28px)                        |
                  Künstler • Album                        |
                                                          |
             ████████████░░░░░░░░░░  2:34 / 4:07          |
                                                          |
          [⇄] [⏮] [▶] [⏭] [↻]                            |
                                                          |
+-----------------------------------------------------------+
```

Background: vergrößertes, unscharfes Cover (Blur 60px, Opacity 30%).

## Modus 3: Mini-Player

```
+---------------------------+
[Cover] Songtitel     [×] |
         Künstler • [♥]   |
+---------------------------+
```

Abgekoppelter schwebender Player rechts unten.

Kleinste Variante (320x80px).

Kann unabhängig vom Hauptfenster positioniert werden.

---

# Aufbau

Die Ansicht besteht aus

- Tabs-Leiste
- Albumbereich
- Songinformationen
- Queue (Tab)
- Lyrics (Tab)
- Zusatzinformationen

---

# Tabs

Oben in der Now Playing View.

Tab | Inhalt |
-----|--------|
Now Playing | Cover, Track-Info, Controls |
Lyrics | Synchronisierte Liedtexte |
Queue | Warteschlange |

Aktiver Tab: Text weiß, Bottom-Border in Akzentfarbe.

Tab-Wechsel: Cross-Fade 150ms.

---

# Albumbereich

Zeigt

- großes Albumcover (280x280px Sidebar, 400x400px Vollbild)
- Titel (16px bold)
- Künstler (14px sekundär, klickbar → Künstlerseite)
- Album (14px sekundär, klickbar → Albumseite)

---

# Cover-Übergang

Beim Track-Wechsel: Cross-Fade Animation.

- Dauer: 300ms
- Easing: ease-in-out (cubic-bezier(0.4, 0, 0.2, 1))
- Altes Cover fade-out, neues Cover fade-in gleichzeitig
- Background-Gradient wechselt mit neuen Cover-Farben (500ms transition)

---

# Hintergrundeffekte

## Blur-Backdrop

Das Albumcover wird im Hintergrund vergrößert dargestellt.

```css
.np-background {
 background-image: url(cover-url);
 background-size: cover;
 filter: blur(60px);
 opacity: 0.3;
 transform: scale(1.2);
}
```

## Dynamischer Gradient

Die dominante Farbe des Covers wird extrahiert und als Hintergrund-Gradient verwendet.

Übergang: Cover-Farbe → transparent → #121212.

---

# Farbextraktion

Die dominante Farbe wird aus dem Cover extrahiert.

## Methode

```javascript
// Canvas-basierte Farbextraktion
const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');
canvas.width = 50;  // klein für Performance
canvas.height = 50;
ctx.drawImage(coverImg, 0, 0, 50, 50);
const data = ctx.getImageData(0, 0, 50, 50).data;

// Dominante Farbe via k-means oder Color Thief
const dominantColor = colorThief.getColor(coverImg);
// → [r, g, b]
```

Wird beim Track-Wechsel neu berechnet.

Gecacht pro Album-Id.

---

# Songinformationen

Anzeige unter dem Cover.

- Genre
- Erscheinungsjahr
- Dauer
- Bewertung (Sterne 1–5)
- Favoritenstatus (Herz)
- Wiedergabeanzahl

---

# Queue (Tab)

Zeigt die Warteschlange.

## Aufbau

```
+---------------------------+
AKTUELL                   |
▶ Song A   Künstler A  ♫  |  ← grün markiert
+---------------------------+
ALS NÄCHSTES              |
  Song B   Künstler B     |
  Song C   Künstler C     |
  Song D   Künstler D     |
+---------------------------+
ZULETZT GEHÖRT            |
  Song X   Künstler X     |  ← ausgegraut
  Song Y   Künstler Y     |
+---------------------------+
```

- Now Playing: grüne Textfarbe, Soundbar-Animation
- Next Up: normale Textfarbe
- History: ausgegraute Textfarbe

## Queue-Aktionen

Aktion | Wie |
--------|-----|
Verschieben | Drag & Drop |
Entfernen | ✕ bei Hover oder Entf-Taste |
Direkt abspielen | Doppelklick |
Leeren | Button oben |

Queue ist virtualisiert bei > 100 Einträgen.

---

# Lyrics

Optionales Modul als Tab oder Panel.

## Synchronisierte Liedtexte

- Aktuelle Zeile: hervorgehoben (größer, weiß, bold)
- Kommende Zeilen: sekundär, leicht ausgegraut
- Vergangene Zeilen: stark ausgegraut
- Auto-Scroll: folgt der aktuellen Zeile
- Manuelles Scrollen unterbricht Auto-Scroll für 5s

## Quelle

- Jellyfin: LRC-Dateien oder eingebettete Lyrics
- LifeHub: optionaler Fetch von externen Lyrics-APIs

## Fallback

Wenn keine synchronisierten Lyrics vorhanden:

- Plain-Text anzeigen (falls verfügbar)
- "Keine Lyrics verfügbar" mit Option zum manuellen Hinzufügen

---

# Ähnliche Musikvideos

Section unter dem Cover (wie auf Spotify-Screenshot zu sehen).

Horizontal scrollbare Card-Reihe.

Zeigt verwandte Musikvideos basierend auf:

- Selben Künstler
- Selben Album
- Ähnliche Songs

```
Ähnliche Musikvideos
+------+ +------+ +------+ +------+
Vid1 | | Vid2 | | Vid3 | | Vid4 |  →
+------+ +------+ +------+ +------+
```

Nur verfügbar wenn Video-Content in Jellyfin vorhanden.

---

# Künstlerinformationen

Optional im Now-Playing-Tab.

- Biografie (aus Jellyfin)
- Weitere Alben (Card-Reihe)
- Ähnliche Künstler (Card-Reihe)

---

# Albuminformationen

Optional.

- Trackliste des Albums (klickbar)
- Veröffentlichungsdatum
- Genre
- Cover

---

# Bedienung

Unterstützt

- Scrollen (eigenständiges Scrollen)
- Kontextmenüs (Rechtsklick auf Songs)
- Drag & Drop (Queue umsortieren)
- Tastatursteuerung (Pfeiltasten durch Queue)

---

# Accessibility

- role="region", aria-label="Aktuelle Wiedergabe"
- Tabs: role="tablist", role="tab" mit aria-selected
- Queue-Liste: role="list", role="listitem"
- Cover: alt-Text mit Album + Künstler
- Keyboard: Tab durch Tabs, Pfeiltasten durch Queue

---

# Performance

- Lyrics: Lazy-Loading erst bei Tab-Wechsel
- Queue: virtualisiert (@tanstack/react-virtual)
- Cover: gecacht pro Album-Id
- Debounce auf Tab-Wechsel (100ms)

---

# Jellyfin Integration

Lädt:

- Cover (/Items/{id}/Images/Primary)
- Metadaten (/Items/{id})
- Lyrics (eingebettet oder /Items/{id}/Lyrics)
- Queue (Client-State, nicht Jellyfin)
- Künstlerinformationen (/Artists/{id})

LifeHub ergänzt:

- Bewertungen
- Notizen
- Sammlungen
- Empfehlungen

---

# Zukünftige Erweiterungen

Dieses Dokument wird später detailliert beschreiben

- Karaoke-Modus (Instrumental + hervorgehobene Lyrics)
- Live-Audio-Visualizer im Vollbild
- 3D-Cover-Rotation
- Multi-Room-Audio-Synchronisation
- Overlays für Drittanbieter-Plugins


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

Bereich | Inhalt |
---------|--------|
Cover | 56×56px, abgerundet |
Track Info | Titel (bold), Künstler (secondary) |
Progress Bar | Schmale 2px Leiste |
Controls | Play/Pause (zentral), Prev/Next (klein) |
Extra | Volume (mini), Close-Button |

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

State | Verhalten |
-------|-----------|
Sichtbar | Zeigt aktuellen Track + Controls |
Versteckt | Normaler Playback Bar wird angezeigt |
Drag | Halbtransparent während des Ziehens |
Close | Zurück zum normalen Layout |

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
