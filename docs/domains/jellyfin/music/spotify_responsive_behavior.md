# Responsive Behavior

Version 0.2

---

# Ziel

Dieses Dokument beschreibt das Verhalten der Music Domain bei unterschiedlichen Fenstergrößen.

Die Anwendung ist Desktop-First, muss aber mit variablen Fenstergrößen umgehen.

---

# Breakpoints

| Breakpoint | Breite | Sidebar | Right Panel | Card-Grid |
|------------|--------|---------|-------------|-----------|
| Sehr breit | ≥ 1280px | 240px | sichtbar (320px) | 5–6 Spalten |
| Breit | 1024–1279px | 240px | ausgeblendet | 4–5 Spalten |
| Mittel | 768–1023px | 64px (Icons) | ausgeblendet | 3 Spalten |
| Klein | 500–767px | 64px (kompakt) | ausgeblendet | 2 Spalten |
| Sehr klein | < 500px | minimal | ausgeblendet | 1–2 Spalten |

---

# Grundsatz

Bei großen Fenstern werden alle Bereiche angezeigt.

Bei kleineren Fenstern werden Bereiche prioritär reduziert.

Die Player-Bar bleibt immer sichtbar.

Die Wiedergabe wird niemals unterbrochen.

---

# Collapse-Reihenfolge

Bei sinkender Fensterbreite werden Elemente in dieser Reihenfolge ausgeblendet:

1. Right Sidebar (bei < 1280px)
2. Sidebar Text-Labels → Icon-Only (bei < 1024px)
3. Card-Grid Spalten reduzieren (fortlaufend)
4. Player-Bar Volume-Slider → Mute-Toggle (bei < 768px)
5. Player-Bar Zusatz-Buttons (Lyrics, Devices) (bei < 600px)
6. Top-Bar Search → Icon (bei < 600px)
7. Sidebar → minimale Navigation (bei < 500px)

---

# Sidebar

## Expanded (≥ 768px)

- Breite: 240px
- Vollständige Text-Labels
- Playlist-Liste mit Cover + Titel + Metainfo

## Collapsed (< 768px)

- Breite: 64px
- Nur Icons
- Hover zeigt Tooltip mit Label
- Toggle über Hamburger-Icon

## Hover-Expand (Icon-Modus)

Bei Hover über Sidebar-Item im Icon-Modus:

- Overlay mit Text-Label erscheint (Tooltip-Stil)
- Keine Breitenänderung der Sidebar

---

# Card-Grid Spaltenlogik

```css
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 16px;
}
```

### Berechnung

Spaltenanzahl = floor((verfügbareBreite + gap) / (minItemWidth + gap))

| Fensterbreite | Main Content | Spalten |
|---------------|-------------|---------|
| 1920px | ~1640px | 9–10 |
| 1440px | ~1160px | 6–7 |
| 1280px | ~1000px | 5–6 |
| 1024px | ~744px | 4 |
| 768px | ~640px | 3 |
| 500px | ~424px | 2 |

---

# Right Sidebar

| Fensterbreite | Status |
|---------------|--------|
| ≥ 1280px | Sichtbar (320px), kann manuell geschlossen werden |
| 1024–1279px | Versteckt, über Button aufrufbar (als Overlay) |
| < 1024px | Versteckt, als Vollbild-Overlay aufrufbar |

---

# Top Bar

## Sehr breit und breit (≥ 1024px)

- Vollständige Search-Bar (min 200px)
- Alle Buttons sichtbar
- Window-Controls rechts

## Mittel (768–1023px)

- Suche bleibt sichtbar (schmaler)
- Notification-Bell in More-Menü

## Klein (< 768px)

- Suche wird zum Icon
- Klick öffnet Search als Vollbild-Overlay
- Nur Avatar + Window-Controls bleiben

---

# Player Bar

## Standard (≥ 768px)

- Cover 56x56px
- Titel + Künstler
- Alle Controls (Shuffle, Prev, Play, Next, Repeat)
- Progress-Bar mit Timestamps
- Volume-Slider (100px)
- Alle Zusatz-Buttons (Lyrics, Queue, Devices, Fullscreen)

## Kompakt (500–767px)

- Cover bleibt 56x56px
- Künstler ausgeblendet (nur Titel)
- Shuffle/Repeat ausgeblendet (nur Prev, Play, Next)
- Progress-Bar schmaler, Timestamps verkürzt
- Volume → Mute-Toggle
- Zusatz-Buttons in More-Menü

## Minimal (< 500px)

- Cover 40x40px
- Nur Titel
- Nur Play/Pause + Next
- Progress-Bar als dünne Linie oben auf der Player-Bar
- Keine Timestamps
- Kein Volume-Control

---

# Now Playing View

## Vollbild (F11)

- Cover zentriert (400x400px)
- Controls unten zentriert
- Lyrics optional rechts oder darunter

## Fenster < 1024px

- Cover auf 300x300px reduziert
- Lyrics als Overlay statt Side-by-Side

## Fenster < 500px

- Cover auf 200x200px reduziert
- Controls vertikal gestapelt
- Lyrics ausblenden

---

# Mini-Player

Abgekoppelter schwebender Player.

- Größe: 320x80px
- Position: rechts unten (verschiebbar)
- Cover 48x48px + Titel + Künstler + Like
- Unabhängig vom Hauptfenster

---

# Touch-Target-Größen

Alle interaktiven Elemente auf Touch-Geräten:

| Eigenschaft | Wert |
|-------------|------|
| Mindestgröße | 44x44px |
| Abstand zwischen Targets | min 8px |
| Visuelle Größe | kann kleiner sein (mit Padding auf 44px) |

---

# High-DPI und Retina

## Icon-Skalierung

Icons werden als SVG gerendert (skalierungsfrei).

Bei High-DPI: keine zusätzlichen Icon-Größen erforderlich.

## Cover-Bildauflösungen

| DPI | Cover-Auflösung |
|-----|----------------|
| 1x (Standard) | 160x160px |
| 2x (Retina) | 320x320px |
| 3x (4K Mobile) | 480x480px |

Jellyfin /Items/{id}/Images/Primary?fillWidth=320 liefert entsprechende Auflösung.

---

# Ultrawide

Bei sehr breiten Monitoren (≥ 1920px):

- Main Content wird zentriert
- Maximale Content-Breite: 1440px
- Verhindert übermäßig lange Zeilen
- Sidebar und Right Sidebar bleiben am Rand

---

# Multi-Window

- Fenster kann auf mehrere Monitore gezogen werden
- Layout passt sich an den jeweiligen Monitor an
- Mini-Player kann abgekoppelt werden

---

# Multi-Monitor

- Unterstützt mehrere Monitore
- Fenster auf verschiedenen Monitoren mit unterschiedlichen Größen
- DPI wird pro Monitor erkannt

---

# Fullscreen

Vollbildmodus (F11 oder Button).

- Cover zentriert
- Controls unten
- Lyrics optional
- ESC oder F11 zum Verlassen

---

# Fenster-Minimalgröße

Minimale Fenstergröße: 320x400px.

Darunter: Hinweis "Fenster zu klein" oder Mobile-Layout.

---

# Scrollbar-Verhalten

- Custom Scrollbar (dünn, rund, dark)
- Track: transparent
- Thumb: #535353
- Hover-Thumb: #727272
- Breite: 12px
- Nur vertikal (horizontal mit Shift+Mausrad)

---

# Transitions

Größenänderungen werden animiert.

| Element | Dauer | Easing |
|---------|-------|--------|
| Sidebar Width | 250ms | ease-in-out |
| Right Panel | 200ms | ease-out |
| Card-Grid Resize | 300ms | ease-out |
| Player Bar | 200ms | ease-out |

Content springt nicht plötzlich.

---

# PWA-Verhalten

Die Music Domain kann als PWA installiert werden.

## Manifest

```json
{
  "name": "LifeHub Music",
  "short_name": "Music",
  "display": "standalone",
  "background_color": "#121212",
  "theme_color": "#121212",
  "icons": [...]
}
```

## Service Worker

- Offline-Caching für zuletzt gehörte Songs
- Cache-First für Cover
- Network-First für Bibliotheksdaten

## Offline-Modus

- Heruntergeladene Songs sind offline abspielbar
- Bibliotheksdaten werden gecacht
- Queue bleibt erhalten
- Suche eingeschränkt (nur gecachte Daten)

---

# Zoom

| Tastatur | Aktion |
|----------|--------|
| Strg+Plus | Zoom erhöhen |
| Strg+Minus | Zoom verringern |
| Strg+0 | Standard-Zoom |

---

# Zukünftige Erweiterungen

Dieses Dokument wird später detailliert beschreiben

- Resizable Sidebar (per Drag)
- Tiling-Window-Support
- Snap-Layouts (Windows)
- Multiple Independent Player Windows
