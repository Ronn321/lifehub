# Interactions

Version 0.2

---

# Ziel

Dieses Dokument beschreibt sämtliche Interaktionsmuster der Music Domain.

Es umfasst Maus, Tastatur, Drag & Drop, Kontextmenüs und Touch.

---

# Maus-Interaktionen

## Standard-Klicktargets

Alle klickbaren Elemente sind mindestens 32x32 px groß.

## Linksklick

Startet Aktionen wie:

- Wiedergabe
- Navigation
- Auswahl
- Button-Aktivierung

## Doppelklick

Startet sofortige Wiedergabe.

Doppelklick-Timeout: 300 ms.

Bei Songs in Listen: Doppelklick spielt Song und setzt Queue auf Kontext.

## Rechtsklick

Öffnet Kontextmenü.

Funktioniert auf fast allen Elementen: Songs, Playlists, Alben, Künstler, Ordner.

## Hover

Zeigt zusätzliche Informationen oder Aktionen.

Element | Hover-Effekt |
---------|-------------|
Song-Zeile | Hintergrund → #2A2A2A, Nummer → Play-Icon, Herz erscheint |
Card | Scale 1.02, Play-Overlay erscheint |
Sidebar-Eintrag | Hintergrund → #1A1A1A |
Button | Farbe → heller |

Hover-Verzögerung: 0 ms (instant).

Hover-Animation: 150 ms ease-out.

## Drag

Verschiebt Elemente.

Funktioniert für Songs, Playlists und Ordner.

---

# Cursor-Zustände

Element-Typ | Cursor |
-------------|--------|
Klickbar (Button, Link, Card) | pointer |
Draggable (Song, Playlist) | grab / grabbing |
Text-Eingabe | text |
Slider (Volume, Progress) | ns-resize |
Normaler Inhalt | default |

---

# Drag & Drop

## Flow

1. mousedown auf Element
2. 5 px Threshold muss überschritten werden
3. Ghost-Element erscheint nach 50 ms
4. cursor → grabbing
5. dragover: Zielbereiche werden hervorgehoben (Akzent-Rahmen)
6. drop: API-Call wird ausgelöst
7. Erfolg: Toast-Benachrichtigung + UI-Update
8. Misserfolg: Fehler-Toast + Ghost kehrt zurück

## unterstützte Drag-Ziele

Quelle | Ziel | Ergebnis |
--------|------|----------|
Song | Playlist-Icon (Sidebar) | Song zu Playlist hinzufügen |
Song | Queue-Panel | Song zur Queue hinzufügen |
Song | Player-Bar | Song sofort abspielen |
Playlist | Sidebar-Position | Playlist umsortieren |
Playlist | Ordner | Playlist in Ordner verschieben |
Album | Playlist-Icon | Alle Album-Songs zur Playlist |
Song | Playlist-Position | Song an Position einfügen |

Ghost-Element zeigt Cover + Titel + Anzahl (bei Mehrfachauswahl).

---

# Kontextmenüs

Jedes interaktive Element besitzt ein Kontextmenü.

## Auslöser

- Rechtsklick
- Kontextmenü-Taste der Tastatur

## Position

Erscheint an Cursor-Position.

Bei Randnähe: verschiebt sich in den Viewport.

## Schließen

- Klick außerhalb
- Escape-Taste
- Blur (Fokusverlust)

## Animation

- Einblenden: Fade + Slide (150 ms ease-out)
- Ausblenden: Fade (100 ms)

## Song-Kontextmenü

- Abspielen
- Als nächstes abspielen
- Zur Queue hinzufügen
- Zur Playlist hinzufügen (Submenu)
- Zur Sammlung hinzufügen
- Favorit (Herz toggeln)
- Herunterladen
- Informationen anzeigen
- Teilen
- Ähnliche Songs
- Zur Künstlerseite
- Zur Albumseite

## Playlist-Kontextmenü

- Abspielen
- Zufallswiedergabe
- Zur Queue hinzufügen
- Bearbeiten
- Herunterladen
- Teilen
- Duplizieren
- Zu Ordner verschieben
- Anheften / Loslösen
- Löschen

## Album-Kontextmenü

- Abspielen
- Zufallswiedergabe
- Zur Queue hinzufügen
- Zur Playlist hinzufügen
- Herunterladen
- Favorit
- Informationen anzeigen

## Künstler-Kontextmenü

- Abfolgen
- Abspielen
- Zufallswiedergabe
- Favorit
- Herunterladen

---

# Selection Model

Aktion | Ergebnis |
--------|----------|
Single Click | Zeile auswählen (visuell hervorheben) |
Double Click | Song abspielen |
Strg+Click | Einzelne Songs toggeln |
Shift+Click | Bereich auswählen |
Strg+A | Alle auswählen |
Klick außerhalb | Auswahl aufheben |

Ausgewählte Zeilen: Hintergrund #1A1A1A.

---

# Tastatur-Interaktionen

## Wiedergabe

Taste | Aktion |
-------|--------|
Space | Play/Pause (nur wenn kein Input fokussiert) |
→ | Nächster Track |
← | Vorheriger Track / Track-Neustart |
Shift+→ | 10s Vorspulen |
Shift+← | 10s Zurückspulen |
M | Stumm (Mute) |
+ / = | Lauter (+10%) |
- | Leiser (-10%) |
F | Vollbild umschalten |

## Navigation

Taste | Aktion |
-------|--------|
Strg+L | Suchfeld fokussieren |
Alt+← | Vorherige Seite (Browser-Back) |
Alt+→ | Nächste Seite (Browser-Forward) |
Strg+↑ | Zum Seitenanfang |
Strg+↓ | Zum Seitenende |
Esc | Modal/Overlay/Kontextmenü schließen |

## Playlist / Bibliothek

Taste | Aktion |
-------|--------|
Strg+N | Neue Playlist |
Entf | Ausgewählte Songs entfernen |
Strg+A | Alle Songs auswählen |
Strg+C | Song-Link kopieren |

## Auswahl in Listen

Taste | Aktion |
-------|--------|
Pfeil oben/unten | Durch Liste navigieren |
Shift+Pfeil | Bereich auswählen |
Enter | Ausgewählten Song abspielen |
Space | Song zur Queue hinzufügen |

## Ansicht

Taste | Aktion |
-------|--------|
F | Vollbild |
Q | Queue ein-/ausblenden |

## Shortcut-Konfliktvermeidung

- Space nur aktiv wenn kein Input/Textarea fokussiert
- Keine Konflikte mit Browser-Shortcuts (Strg+T, Strg+W etc.)
- Keine Konflikte mit OS-Shortcuts
- Tailscale-Overlay-Shortcuts werden respektiert

---

# Touch-Interaktionen

Unterstützt für Touchscreens und Hybridgetäte.

Geste | Aktion |
-------|--------|
Tap | = Linksklick |
Doppel-Tap | = Doppelklick (Abspielen) |
Long Press (500ms) | = Rechtsklick (Kontextmenü) |
Swipe Left | Nächster Track (Now Playing View) |
Swipe Right | Vorheriger Track (Now Playing View) |
Swipe Down | Player Bar schließen / Ansicht zurück |
Swipe Left/Right (Liste) | Song Favorit toggeln |
Pinch | Layout-Änderung (List/Grid) |
Two-Finger Swipe | Queue öffnen |

---

# Focus-Indikatoren

## Keyboard-Focus

```css
:focus-visible {
 outline: 2px solid var(--accent-green);
 outline-offset: 2px;
}
```

Nur bei :focus-visible (nicht bei Maus-Klick).

Focus-Reihenfolge ist logisch (top-to-bottom, left-to-right).

---

# Accessibility

## Regeln

- WCAG 2.1 AA konform
- Focus-Reihenfolge folgt visueller Reihenfolge
- Focus-Trap in Modals (Tab bleibt im Dialog)
- ARIA-live="polite" für Toast-Updates
- ARIA-live="assertive" für Fehlermeldungen
- Keine tastaturfalle (jedes Element per Tab erreichbar)
- Skip-to-Content-Link am Seitenanfang

---

# Scroll-Behavior

- Smooth Scrolling innerhalb aller Bereiche
- Mausrad: vertikales Scrollen
- Shift+Mausrad: horizontales Scrollen in Card-Reihen
- Infinite Scroll: IntersectionObserver für große Listen
- Scroll-Restoration: Position wird bei Route-Wechsel gespeichert

---

# Undo / Redo

## Undo-Stack

Aktion | Undo-möglich |
--------|-------------|
Song aus Playlist entfernt | ✓ (5s Window) |
Playlist gelöscht | ✓ (30 Tage Papierkorb) |
Queue geändert | ✓ (sofort rückgängig) |
Songs verschoben | ✓ (sofort rückgängig) |

Shortcuts:

- Strg+Z: Undo
- Strg+Shift+Z: Redo

Maximum 50 Actions im Stack.

---

# Visuelles Feedback

## Animationszeiten

Aktion | Dauer | Easing |
--------|-------|--------|
Hover (Card) | 200ms | ease-out (cubic-bezier(0,0,0.2,1)) |
Hover (Liste) | 150ms | ease-out |
Play/Pause | 0ms | instant |
Like (Herz) | 300ms | ease-in-out (cubic-bezier(0.4,0,0.2,1)) |
Sidebar Collapse | 250ms | ease-in-out |
Context Menu | 150ms | ease-out |
Modal | 200ms | ease-out |
Toast | 200ms | ease-out |
Progress-Bar | kontinuierlich | linear |

## Easing-Funktionen

```css
--ease-out: cubic-bezier(0, 0, 0.2, 1);
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
--ease-linear: linear;
```

## Feedback-Typen

- Button-Klick: Instant 0.1s Scale-Down (scale 0.95)
- Like: Pop-Animation (scale 0→1.2→1.0)
- Play/Pause: Instant Icon-Swap
- Progress-Scrubbing: Tooltip mit Timestamp
- Toast: Slide-In von oben-rechts (200ms)

---

# Multi-Touch (Zukunft)

- Pinch-zoom für Cover (Vollbild)
- Two-finger swipe für Queue
- Drei-Finger-Tap für zufällige Playlist

---

# Gesten-Editor (Zukunft)

User kann eigene Gesten definieren.

Einstellungen → Touch → Gesten.

Jede Geste kann mit einer Aktion verknüpft werden.

---

# Zukünftige Erweiterungen

Dieses Dokument wird später detailliert beschreiben

- Mausgesten (Mouse Trails)
- Gamepad-Support
- MIDI-Controller-Integration
- Voice Commands (erweitert)
- Eye-Tracking
