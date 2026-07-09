# Playlist Page

Version 0.2

---

# Ziel

Die Playlistseite dient der Verwaltung und Wiedergabe beliebiger Musiksammlungen.

---

# Aufbau

Die Seite besteht aus

- Playlist Header
- Aktionsleiste
- Filter-Chips
- Songliste
- Zusatzinformationen

---

# Playlist Header

## Layout

```
+-----------------------------------------------------------+
                                                          |
 +----------+   Playlist                                  |
 |          |                                             |
 |  Cover   |   Lieblingssongs                            |
 | 232x232  |                                             |
 |          |   dasilva.robert468 • 2.197 Songs,          |
 +----------+   146 Std. 37 Min.                          |
                                                          |
               [▶ Play]  [⇄ Shuffle] [⤓ Download] [⋯]    |
                                                          |
+-----------------------------------------------------------+
 Rock  Rap  Klassik  Pop  Indie  Jazz  Blues  ...         |
+-----------------------------------------------------------+
 #  | Titel              | Album        | Hinzugefügt  |♥| Zeit |
+-----------------------------------------------------------+
```

## Header-Elemente

- Cover: 232x232 px, quadratisch, 4px Radius
- Typ-Label: "Playlist" — 12px, uppercase, secondary
- Titel: 28px, bold, weiß
- Beschreibung: 14px, secondary — "Besitzer • n Songs, X Std. Y Min."
- Header-Gradient: Farbverlauf aus Cover-Farbe → #121212

## Header-Gradient

Der Hintergrund des Headers nutzt einen Farbverlauf.

Die Farben werden aus dem Cover extrahiert (Canvas-API, dominante Farbe).

Übergang: Cover-Farbe (Top) → transparent → #121212 (Bottom).

Beim Scrollen wird der Gradient durch backdrop-filter: blur(12px) ersetzt.

---

# Header Aktionen

## Play-Button

Großer grüner Kreis (32px Durchmesser, Akzent-Farbe).

Startet Wiedergabe ab erstem Song.

Bei bereits spielender Playlist → Pause-Icon.

## Shuffle-Button

Akzentfarbe aktiv, wenn Shuffle an.

Startet Zufallswiedergabe.

## Download-Button

Lädt alle Songs der Playlist für Offline-Nutzung herunter.

Zeigt Fortschrittsbalken bei aktivem Download.

## More-Menü (⋯)

- Bearbeiten
- Teilen
- Zu Sammlung hinzufügen
- Als Smart Playlist speichern
- Duplizieren
- Löschen

---

# Filter-Chips

Unter dem Header befinden sich Genre-Filter-Chips.

Chips werden automatisch aus den Genres der Playlist-Songs generiert.

Beispiele: Rock, Rap, Klassik, Pop, Indie, Jazz, Blues, Electropop, Soundtrack.

- Aussehen: Pill-shaped, Hintergrund #2A2A2A, Text 12px weiß
- Aktiv: Hintergrund weiß, Text schwarz
- Mehrere Chips gleichzeitig aktivierbar (AND-Filter)

---

# Songliste

## Spaltenlayout

Spalte | Breite | Inhalt |
--------|--------|--------|
# | 40px | Index oder Play-Icon (Hover) oder Soundbar (Playing) |
Titel | flex (min 200px) | Cover 40x40 + Titel (bold) + Künstler (secondary) |
Album | 25% | Album-Name (klickbar) |
Hinzugefügt am | 120px | "vor X Tagen" oder Datum |
♥ | 40px | Favorit-Icon |
Dauer | 60px | m:ss Format |

## Hover-Verhalten

- Zeile: Hintergrund wird #2A2A2A
- Index-Zahl: wird zu Play-Icon (▶)
- Herz-Icon: erscheint (grau → grün bei Liked)
- More-Button (⋯): erscheint am Zeilenende

## Currently-Playing-Indikator

Wenn ein Song aus dieser Playlist aktuell spielt:

- Index-Zahl wird durch animierte Soundbar (3 Balken) ersetzt
- Titel wird in Akzentfarbe (Grün) dargestellt
- Pause-Icon bei pausierter Wiedergabe

---

# Aktionen pro Song

## Doppelklick

Startet Wiedergabe dieser Playlist ab diesem Song.

## Rechtsklick / Kontextmenü

- Abspielen
- Als nächstes abspielen
- Zur Queue hinzufügen
- Zur Playlist hinzufügen (Submenu)
- Zur Sammlung hinzufügen
- Favorit (Herz toggeln)
- Herunterladen
- Informationen anzeigen
- Teilen
- Zur Künstlerseite
- Zur Albumseite
- Aus Playlist entfernen

---

# Sortierung

Klick auf Spaltenüberschrift sortiert die Liste.

Spalte | Standard-Sortierung |
--------|-------------------|
# | Playlist-Reihenfolge (Default) |
Titel | Alphabetisch A→Z |
Album | Alphabetisch A→Z |
Hinzugefügt am | Neueste zuerst |
Dauer | Kurzeste zuerst |

Toggle bei erneutem Klick: ascending ↔ descending.

Sort-Indikator: Pfeil-Icon (▲ / ▼) in aktiver Spalte.

---

# Drag & Drop

Songs können innerhalb der Playlist neu angeordnet werden.

- Drag-Handle: gesamte Zeile ist draggable
- Ghost-Element folgt dem Mauszeiger
- Zielzeile zeigt Einfüge-Marker (Linie in Akzentfarbe)
- Bei Drop: API-Call an Jellyfin mit neuer Position

```
POST /Playlists/{id}/Items
{ "Id": "{songId}", "newPosition": N }
```

---

# Mehrfachauswahl

- Strg+Klick: einzelne Songs toggeln
- Shift+Klick: Bereich auswählen
- Strg+A: alle Songs auswählen
- Klick auf leeren Bereich: Auswahl aufheben

## Bulk-Aktionen bei Auswahl

- Ausgewählte abspielen
- Zur Queue hinzufügen
- Zur Playlist hinzufügen
- Herunterladen
- Aus Playlist entfernen
- Favorit toggeln

Auswahl-Leiste erscheint oben über der Songliste mit Anzahl und Aktionen.

---

# Playlisttypen

Typ | Badge | Quelle |
------|-------|--------|
Eigene Playlist | "Playlist" | LifeHub |
Jellyfin-Playlist | "Playlist" | Jellyfin |
Smart Playlist | "Smart" | LifeHub (regelbasiert) |
Geteilte Playlist | "Geteilt" | LifeHub (Multi-User) |
Importierte Playlist | "Importiert" | M3U/M3U8-Import |

---

# Smart Playlists

Regelbasierte, automatisch generierte Playlists.

Beispiele:

- "Zuletzt gespielt" (letzten 30 Tage)
- "Am meisten gehört" (Top 100)
- "Favoriten mit Genre: Rock"
- "Nie gehörte Songs aus Lieblingsalben"

Regel-Editor:

- Bedingungen: Genre, Künstler, Jahr, Favorit, PlayCount, DateAdded
- Operatoren: AND, OR, NOT
- Sortierung: Random, Newest, Most Played
- Auto-Update: Playlist aktualisiert sich bei Bibliotheksänderung

---

# Kollaborative Playlists

Mehrere LifeHub-User können eine Playlist gemeinsam bearbeiten.

- User-Verwaltung im Playlist-Edit-Dialog
- Hinzufügen/Entfernen von Songs wird allen Usern angezeigt
- Änderungen werden über WebSocket synchronisiert
- Aktivitäts-Log: "wer hat was wann hinzugefügt"

---

# Empty State

Wenn die Playlist keine Songs enthält:

```
Diese Playlist ist leer.
Suche nach Songs, um sie hinzuzufügen.

[ Songs durchsuchen ]
```

---

# Informationen

Optional im More-Menü unter "Informationen":

- Erstellungsdatum
- Änderungsdatum
- Gesamtanzahl Songs
- Gesamtdauer
- Tags
- Beschreibung
- Statistiken (am häufigsten gespielte Künstler, Genre-Verteilung)

---

# Jellyfin Integration

## API-Endpoints

```
GET    /Playlists/{id}/Items          # Playlist-Inhalt abrufen
POST   /Playlists                      # Neue Playlist erstellen
POST   /Playlists/{id}/Items           # Song hinzufügen
DELETE /Playlists/{id}/Items           # Song entfernen
POST   /Playlists/{id}/Items/{pos}     # Song verschieben
```

## Synchronisation

Jellyfin synchronisiert:

- Playlist-Inhalt
- Reihenfolge
- Cover
- Metadaten

LifeHub ergänzt:

- Notizen
- Bewertungen
- Kategorien
- Sammlungen
- Smart-Playlist-Regeln

---

# Animationen

- Header-Gradient: smooth Übergang beim Scrollen (backdrop-filter wird aktiviert bei scrollY > 232px)
- Songliste: Fade-In gestaffelt (stagger 20ms pro Zeile)
- Filter-Chips: Slide-In von oben (150ms)
- Currently-Playing-Soundbar: kontinuierliche Animation

---

# Zukünftige Erweiterungen

Dieses Dokument wird später detailliert beschreiben

- kollaborative Bearbeitung in Echtzeit (CRDT)
- Playlist-Analytics-Dashboard
- Playlist-Export (M3U, XSPF)
- automatische Playlist-Cleanup-Werkzeuge
