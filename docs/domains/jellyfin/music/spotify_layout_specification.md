# Layout Specification

Version 0.2

---

# Grundaufbau

Der Player besitzt dauerhaft fünf Hauptbereiche.

```
+-------------------------------------------------------+
Top Bar (64px)                                        |
+--------+----------------------------------------------+
       |                                              |
Sidebar |           Main Content                       |
(240px) |           (fluide, max 1440px)               |
       |                                              |
       |                              Right Sidebar   |
       |                              (320px, opt.)   |
+--------+----------------------------------------------+
Playback Bar (90px)                                   |
+-------------------------------------------------------+
```

---

# Pixelmaße

## Hauptbereiche

Bereich | Breite/Höhe | Verhalten |
---------|-------------|-----------|
Top Bar | 64px hoch | Immer sichtbar |
Sidebar | 240px (expanded), 64px (collapsed) | Immer sichtbar |
Main Content | fluide | Min 320px, Max 1440px |
Right Sidebar | 320px | Optional, ab ≥1280px |
Playback Bar | 90px hoch | Immer sichtbar |

## Gesamthöhe

```
Window Height = Top Bar (64) + Main Content (flex) + Player Bar (90)
```

Main Content erhält den restlichen vertikalen Platz.

---

# Sidebar

Position: Links.

Immer sichtbar.

Enthält ausschließlich Navigation.

## Interne Struktur

```
Sidebar (240px)
├── Nav-Buttons (Home, Suche) — 48px hoch
├── Bibliotheks-Header (Tabs + Sort) — 48px hoch
├── Playlist-Liste (scrollbar, flex-1)
└── Create-Button — 48px hoch
```

---

# Top Bar

## Aufbau

```
+-------------------------------------------------------+
[⬅] [➡] [🏠] [🔍 Suche...........] [🔔] [👤] [- □ ×] |
+-------------------------------------------------------+
  64px hoch
```

Element | Breite | Funktion |
---------|--------|----------|
Back-Button | 32px | Vorherige Seite |
Forward-Button | 32px | Nächste Seite |
Home-Button | 32px | Startseite |
Search-Bar | flex (min 200px) | Suche |
Notification | 32px | Benachrichtigungen |
Avatar | 32px | User-Menu |
Window-Controls | 120px | Min/Max/Close |

Enthält: Navigation, Suche, Benutzerprofil, Aktionen.

---

# Main Content

Größter Bereich.

Zeigt: Home, Playlist, Künstler, Album, Bibliothek.

## Grid-System

```css
.main-content {
 display: grid;
 grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
 gap: 16px;
 padding: 24px;
}
```

### Card-Raster

Fensterbreite | Spalten |
---------------|---------|
≥ 1400px | 5–6 |
1200–1399px | 4–5 |
1000–1199px | 4 |
700–999px | 3 |
< 700px | 2 |

### Song-Listen

Song-Listen bleiben immer volle Breite (keine Spalten-Anpassung).

---

# Right Sidebar

Optional.

Kann anzeigen: Queue, Songinformationen, Lyrics, ähnliche Musik, Albumdetails.

## Sichtbarkeit

Fensterbreite | Status |
---------------|--------|
≥ 1280px | Sichtbar (kann manuell geöffnet/geschlossen werden) |
< 1280px | Versteckt (Inhalte über Now-Playing-Button aufrufbar) |

## Übergang

Toggle-Animation: Slide-In/Slide-Out 200ms ease-out.

---

# Playback Bar

Immer sichtbar.

Darf niemals verschwinden.

```
+-------------------------------------------------------+
[Cover] Titel   |  [⇄][⏮][▶][⏭][↻]  | [♫][☰][🔊][⛶] |
56x56   Künstler|  Progress-Bar      |                 |
+-------------------------------------------------------+
```

Sektion | Breite | Inhalt |
---------|--------|--------|
Left | 30% | Cover, Titel, Künstler, Like |
Center | 40% (max 600px) | Controls + Timeline |
Right | 30% | Volume, Queue, Lyrics, Devices, Fullscreen |

---

# Scrollverhalten

Bereich | Scrollen |
---------|----------|
Sidebar | Eigenständig, vertikal |
Main Content | Eigenständig, vertikal |
Right Sidebar | Eigenständig, vertikal |
Playback Bar | Nie scrollbar |

Jeder Bereich scrollt unabhängig.

---

# Layer

Ebene | Zweck | z-index |
-------|-------|---------|
1 | Grundlayout | 0 |
2 | Content | 10 |
3 | Hover / Sticky Headers | 100 |
4 | Dialoge / Modals | 1000 |
5 | Kontextmenüs | 2000 |
6 | Toasts / Overlays | 3000 |

---

# Padding und Margin

## 4er-System

Alle Abstände sind Vielfache von 4px.

Token | Wert |
-------|------|
xs | 4px |
sm | 8px |
md | 16px |
lg | 24px |
xl | 32px |

## Main Content

- Padding: 24px links, rechts, unten
- Padding: 0 oben (Header ist absolut/ sticky)

## Listen

- Zeilenhöhe: 56px (Song-Row)
- Zeilen-Padding: 16px links/rechts

## Sidebar

- Padding: 8px links/rechts
- Item-Abstand: 4px vertikal

---

# Breakpoints

Breakpoint | Breite | Verhalten |
------------|--------|-----------|
Voll | ≥ 1280px | Alle Bereiche, Right Sidebar sichtbar |
Reduziert | 1024–1279px | Sidebar voll, Right Sidebar versteckt |
Kompakt | 768–1023px | Sidebar Icons-only (64px) |
Klein | 500–767px | Sidebar kompakt, Controls reduziert |
Minimal | < 500px | Minimale UI, nur Essentielles |

→ siehe spotify_responsive_behavior.md für Details.

---

# Animationsverhalten bei Layout-Übergängen

## Sidebar Collapse

- Breite: 240px → 64px
- Dauer: 250ms
- Easing: ease-in-out (cubic-bezier(0.4, 0, 0.2, 1))
- Text-Labels: Fade-Out 100ms vor Breiten-Animation

## Right Panel Toggle

- Slide-In/Out: 200ms ease-out
- Content-Reflow: 200ms

## Page Transitions

- Fade-In: 150ms
- Slide von rechts: 200ms (neue Seite)
- Slide nach links: 200ms (Back)

---

# Blur-Effekte

## Player Bar

```css
.player-bar {
 background: rgba(18, 18, 18, 0.95);
 backdrop-filter: blur(16px);
}
```

## Sticky Header (beim Scrollen)

```css
.page-header--scrolled {
 background: rgba(18, 18, 18, 0.8);
 backdrop-filter: blur(12px);
}
```

## Now Playing Background

```css
.np-background {
 filter: blur(60px);
 opacity: 0.3;
}
```

---

# Transparenzen

Layer | Hintergrund |
-------|-------------|
Basis | #121212 (solid) |
Player Bar | rgba(18, 18, 18, 0.95) |
Sticky Header | rgba(18, 18, 18, 0.8) |
Modal-Overlay | rgba(0, 0, 0, 0.7) |
Toast | rgba(18, 18, 18, 0.98) |

---

# Farbverläufe

## Header-Gradient

```css
.page-header {
 background: linear-gradient(
   to bottom,
   var(--cover-dominant-color, #1E1E1E) 0%,
   transparent 40%,
   var(--bg-base) 100%
 );
}
```

Farben werden aus dem Cover extrahiert (Canvas-API, dominante Farbe).

---

# Fensterverhalten

Unterstützt:

- Maximiert
- Fenstermodus
- Ultrawide (Content wird zentriert, max 1440px)
- Mehrere Monitore

---

# Layoutregeln

Navigation bleibt konstant.

Nur Main Content wird ersetzt.

Playback bleibt erhalten.

Right Sidebar ist optional.

---

# Zukünftige Erweiterungen

Dieses Dokument wird später detailliert beschreiben

- Resizable Panels (Sidebar-Breite per Drag änderbar)
- Dockable Right Sidebar (verschiebbare Position)
- Custom Layout Presets
- Picture-in-Picture Layout

---

# Anhang: LifeHub-Integration

Die Music-Shell wird nicht standalone betrieben, sondern in die LifeHub-Oberfläche eingebettet:

```
LifeHub-Fenster
+-----+------------------------------------------------------+
LH   | LifeHub Content Area (padding: 24-32px)               |
Side | +--------------------------------------------------+ |
bar  | | MusicPage                                        | |
256px| | +--- -m-6 ----+                                  | |
    | | | MusicAppShell (flex: sidebar | content)       | |
    | | | + Sidebar 240px | Main Content (scrollbar)   | |
    | | +--------------+                               | |
    | | + PlayerBar (flex-shrink-0, w-full)             | |
    | +--------------------------------------------------+ |
+-----+------------------------------------------------------+
```

**Wichtige Layout-Prinzipien:**

1. **Negative Margins:** Music-Seite verwendet `-m-6 lg:-m-8` um `p-6 lg:p-8` des LifeHub `<main>`-Containers auszugleichen. Vermeidet schwarze Ränder.
2. **Player außerhalb von AppShell:** `MusicPlayerWrapper` wird NACH `MusicAppShell` gerendert. AppShell hat keine `playerBar`/`showPlayerBar` Props.
3. **Seitenhöhe:** Außen `height: calc(100% + 48px)`. Inhalt `flex-1 overflow-y-auto`. Player `flex-shrink-0` (90px).
4. **Sidebar fixiert:** `position: sticky; top: 0; align-self: start;` — scrollt nicht mit.
5. **Player-Bar:** `w-full` (kein `fixed`). Breite durch flex-container bestimmt (startet nach LifeHub-Sidebar).

---

# Renderingregeln

Layoutkomponenten werden nur einmal erzeugt. Navigation ersetzt ausschließlich Main Content + optional Right Sidebar. Sidebar/Playback/Top Bar werden niemals neu aufgebaut. Playerzustand, Queue, Scrollposition, Animationen, Wiedergabe bleiben erhalten.

---

# Scroll-Restoration

Jede Seite speichert ihre letzte Scrollposition. Beim Zurücknavigieren wird die vorherige Position wiederhergestellt.

---

# Größenregeln

Sidebar niemals kleiner als Compact (64px). Playback niemals kleiner als Standardhöhe (90px). Top Bar immer identische Höhe (64px). Right Sidebar niemals kleiner als Minimalbreite (320px). Main Content erhält stets verbleibenden Platz.
