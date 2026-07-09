# Visual Language

Version 0.2

---

# Ziel

Dieses Dokument definiert die visuelle Sprache der Music Domain.

Es beschreibt Farben, Typografie, Icons, Abstände, Schatten und Animationen.

---

# Designphilosophie

Die Oberfläche ist dunkel, content-first und ruhig.

Sie nutzt Farbe sparsam und gezielt als Akzent.

Musikcover sind die Hauptquelle für Farbe im Interface.

---

# Farben

## Hintergrund

Farbe | HEX | Verwendung |
-------|-----|------------|
Basis | #121212 | Seitenhintergrund |
Erhöht | #181818 | Sidebar, Player-Bar |
Karte | #242424 | Cards, Listen-Hover |
Hover | #2A2A2A | Aktive Hover-Zeilen |
Hell | #282828 | Modals, Dropdowns |

## Text

Farbe | HEX | Kontrast zu Basis | Verwendung |
-------|-----|-------------------|------------|
Primär | #FFFFFF | 21:1 | Überschriften, aktive Elemente |
Sekundär | #B3B3B3 | 7.2:1 | Künstler, Beschreibungen |
Tertiär | #727272 | 4.5:1 | Timestamps, Metadaten |
Deaktiviert | #535353 | 2.6:1 | Disabled-Buttons (nur dekorativ) |

## Akzent

Farbe | HEX | Verwendung |
-------|-----|------------|
Akzent | #1DB954 | Play-Button, Aktiv-Zustände |
Akzent Hover | #1ED760 | Hover über Akzent-Elementen |
Akzent Gedrückt | #169C46 | Active/Pressed-Zustand |

Standardmäßig Grün (Spotify-Referenz).

LifeHub kann diesen Akzent in den Einstellungen konfigurierbar machen.

## Statusfarben

Farbe | HEX | Verwendung |
-------|-----|------------|
Fehler | #E91429 | Fehlermeldungen, Error-Icons |
Warnung | #FFA42B | Hinweise, Warnings |
Erfolg | #1DB954 | Erfolg, Bestätigungen |
Explicit | #A0A0A0 | Explicit-Badge |

## Dynamische Farben

Die Player-Bar und Header übernehmen Farben vom aktuellen Albumcover.

Dies erzeugt einen zusammenhängenden visuellen Eindruck.

Methode: Canvas-API Farbextraktion → dominante Farbe als HSL.

---

# Design Tokens

Alle Farben und Werte sind als CSS Custom Properties definiert.

## CSS Custom Properties

```css
:root {
 /* Backgrounds */
 --bg-base: #121212;
 --bg-elevated: #181818;
 --bg-card: #242424;
 --bg-hover: #2A2A2A;
 --bg-modal: #282828;

 /* Text */
 --text-primary: #FFFFFF;
 --text-secondary: #B3B3B3;
 --text-tertiary: #727272;
 --text-disabled: #535353;

 /* Accent */
 --accent: #1DB954;
 --accent-hover: #1ED760;
 --accent-pressed: #169C46;

 /* Status */
 --error: #E91429;
 --warning: #FFA42B;
 --success: #1DB954;
 --explicit: #A0A0A0;

 /* Layout */
 --sidebar-width: 240px;
 --sidebar-collapsed-width: 64px;
 --topbar-height: 64px;
 --player-bar-height: 90px;
 --right-sidebar-width: 320px;

 /* Spacing */
 --space-xs: 4px;
 --space-sm: 8px;
 --space-md: 16px;
 --space-lg: 24px;
 --space-xl: 32px;
}
```

## Tailwind Config

```javascript
// tailwind.config.ts
colors: {
 bg: {
   base: '#121212',
   elevated: '#181818',
   card: '#242424',
   hover: '#2A2A2A',
   modal: '#282828',
 },
 text: {
   primary: '#FFFFFF',
   secondary: '#B3B3B3',
   tertiary: '#727272',
   disabled: '#535353',
 },
 accent: {
   DEFAULT: '#1DB954',
   hover: '#1ED760',
   pressed: '#169C46',
 },
}
```

---

# Typografie

## Font-Stack

```css
font-family: 'Inter', -apple-system, BlinkMacSystemFont,
            'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
```

Keine proprietären Schriften (Spotify Circular nicht frei verfügbar).

Primary-Empfehlung: **Inter** (Google Fonts, OFL-Lizenz).

Monospace nur für Timestamps (optional).

## Schriftgrößen

Element | Größe | Weight | Letter-Spacing |
---------|-------|--------|----------------|
Seitentitel (h1) | 28px | Bold (700) | -0.02em |
Section-Header (h2) | 20px | Bold (700) | -0.01em |
Sub-Header (h3) | 14px | Bold (700) | 0.1em (uppercase) |
Track-Name (Liste) | 14px | Normal (400) | 0 |
Künstler-Name | 12px | Normal (400) | 0 |
Card-Titel | 14px | Bold (700) | 0 |
Card-Subtext | 12px | Normal (400) | 0 |
Timestamp | 11px | Normal (400) | 0 |
Button-Label | 12px | Bold (700) | 0.1em (uppercase) |

---

# Abstände

## Basiseinheit

Alle Abstände basieren auf einem Vielfachen von 4 Pixeln.

## Spacing-Skala

Token | Wert |
-------|------|
xs | 4px |
sm | 8px |
md | 16px |
lg | 24px |
xl | 32px |
2xl | 48px |

## Card-Grid

Cards haben einen Abstand von 16 px zueinander.

## Abschnitte

Zwischen vertikalen Abschnitten liegen 24 px.

## Innenabstände

Bereich | Padding |
---------|---------|
Main Content | 24px links/rechts |
Listenzeile | 16px |
Sidebar | 8px links/rechts |
Card-Inhalt | 16px |

---

# Eckenradien

Element | Radius |
---------|--------|
Karten | 8px |
Buttons (rechteckig) | 4px |
Play-Button | 50% (Kreis) |
Modals | 12px |
Eingabefelder | 4px |
Thumbnails | 4px |
Playlist-Cover | 4px |
Filter-Chips | 16px (Pill) |

---

# Icons

## Bibliothek

Empfehlung: **Lucide React** (lucide.dev)

- Lizenz: ISC (freie Nutzung)
- Stil: Outline, 1.5px stroke, rund
- Verfügbar als React-Komponenten
- Baum-shakable

Alternative: Phosphor Icons, Heroicons.

## Größen

Verwendung | Größe |
------------|-------|
Standard | 16px |
Mittel | 20px |
Groß | 24px |
Play-Button | 32px |
Now Playing View | 24px |

## Farben

Icons erben die Textfarbe.

- Standard: --text-secondary (#B3B3B3)
- Aktiv: --text-primary (#FFFFFF) oder --accent (#1DB954)
- Hover: --text-primary (#FFFFFF)

---

# Schatten

Ebene | Wert |
-------|------|
Cards | 0 2px 8px rgba(0,0,0,0.3) |
Player Bar | 0 -2px 8px rgba(0,0,0,0.5) |
Modals | 0 8px 32px rgba(0,0,0,0.5) |
Kontextmenü | 0 4px 16px rgba(0,0,0,0.4) |
Cover Glow (Now Playing) | 0 0 30px rgba(var(--cover-dominant), 0.4) |

---

# Animationen

## Grundsätze

Animationen sind kurz und supportiv.

Sie lenken nicht ab.

Sie unterstützen räumliches Verständnis.

## Easing-Funktionen

```css
--ease-out: cubic-bezier(0, 0, 0.2, 1);
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
--ease-linear: linear;
```

## Standard-Animationen

Element | Animation | Dauer | Easing |
---------|-----------|-------|--------|
Hover (Card) | Scale 1.0 → 1.02 | 200ms | ease-out |
Hover (Liste) | Background-Fade | 150ms | ease-out |
Play/Pause | Instant Icon-Swap | 0ms | – |
Like (Herz) | Pop (Scale + Color) | 300ms | ease-in-out |
Sidebar Collapse | Width-Transition | 250ms | ease-in-out |
Context Menu | Fade + Slide | 150ms | ease-out |
Modal | Fade + Scale | 200ms | ease-out |
Progress-Bar | Continuous | linear | linear |
Toast | Slide-In | 200ms | ease-out |

## Keyframes

```css
@keyframes fadeIn {
 from { opacity: 0; transform: translateY(8px); }
 to   { opacity: 1; transform: translateY(0); }
}

@keyframes shimmer {
 0%   { background-position: -200% 0; }
 100% { background-position: 200% 0; }
}

@keyframes soundbar {
 0%, 100% { height: 4px; }
 50%      { height: 16px; }
}
```

---

# Scrollbar

Eigene dezente Scrollbar.

```css
::-webkit-scrollbar {
 width: 12px;
}
::-webkit-scrollbar-track {
 background: transparent;
}
::-webkit-scrollbar-thumb {
 background: #535353;
 border-radius: 6px;
 border: 3px solid transparent;
 background-clip: content-box;
}
::-webkit-scrollbar-thumb:hover {
 background: #727272;
}
```

- Track: transparent
- Thumb: dunkles Grau (#535353)
- Hover-Thumb: helleres Grau (#727272)
- Breite: 12px
- Nur vertikal

---

# Transparenz und Blur

## Player-Bar

```css
.player-bar {
 background: rgba(18, 18, 18, 0.95);
 backdrop-filter: blur(16px);
}
```

## Header beim Scrollen

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
 transform: scale(1.2);
}
```

---

# Cover-Behandlung

Cover sind quadratisch.

Cover sind die primäre visuelle Informationsquelle.

Cover dominieren das Farbbild der Oberfläche.

---

# Header-Verläufe

Playlist- und Album-Header verwenden Farbverläufe.

```css
.playlist-header {
 background: linear-gradient(
   to bottom,
   var(--cover-dominant-color) 0%,
   transparent 40%,
   var(--bg-base) 100%
 );
}
```

Die Farben werden aus dem Cover extrahiert (Canvas-API).

Sie erzeugen einen weichen Übergang zum dunklen Hintergrund.

---

# Accessibility-Kontrastwerte

Alle Text/Hintergrund-Kombinationen entsprechen WCAG 2.1 AA.

Vordergrund | Hintergrund | Kontrast | AA (Normal) | AA (Large) |
-------------|-------------|----------|-------------|------------|
#FFFFFF (Primär) | #121212 (Basis) | 21:1 | ✓ | ✓ |
#B3B3B3 (Sekundär) | #121212 (Basis) | 7.2:1 | ✓ | ✓ |
#727272 (Tertiär) | #121212 (Basis) | 4.5:1 | ✓ | ✓ |
#FFFFFF (Primär) | #1DB954 (Akzent) | 3.1:1 | ✗ | ✓ |
#121212 (Basis) | #1DB954 (Akzent) | 6.7:1 | ✓ | ✓ |
#B3B3B3 (Sekundär) | #242424 (Karte) | 5.9:1 | ✓ | ✓ |

Hinweis: Weißer Text auf Akzent-Grün nur für große Schrift (≥ 18px) oder fett ≥ 14px.

---

# Dark Mode

Die Music Domain ist ausschließlich als Dark Mode konzipiert.

Es ist kein separater Light Mode geplant.

Alle Werte sind für dunkle Hintergründe optimiert.

---

# Zukünftige Erweiterungen

Dieses Dokument wird später detailliert beschreiben

- High-Contrast-Modus (Accessibility)
- Custom-Theme-Editor für User
- Seasonal Themes (Weihnachten, Halloween)
- Cover-basierte dynamische Themes
