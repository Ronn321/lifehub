# Navigation

Version 0.2

---

# Ziel

Navigation soll jederzeit erreichbar sein.

---

# Sidebar-Struktur

```
+---------------------------+
|  ⬅ ➡                      |
|                           |
|  🏠  Home                 |
|  🔍  Suche                |
|                           |
|  +--- Bibliothek ---------+
|  | Playlists | Künstler | |
|  | Alben     | Podcasts | |
|  | [🔍] [Zuletzt ▾]      | |
|  |                       | |
|  | ❤️ Lieblingssongs      | |
|  |    Playlist • 2.197   | |
|  | 📑 Deine Folgen        | |
|  | 🎵 2026 Q2             | |
|  | 🎵 Abbey Road          | |
|  | 🎵 This Is Alligatoah  | |
|  | ... (scrollbar)        | |
|  +-----------------------+
|                           |
|  📂 +  Neue Playlist      |
+---------------------------+
   240px expanded
```

## Kollabiert (Icon-Only)

```
+----+
| ⬅  |
|    |
| 🏠 |
| 🔍 |
|    |
| ❤️ |
| 📑 |
| 🎵 |
| 🎵 |
+----+
 64px
```

Bei Hover im kollabierten Zustand: Tooltip mit Playlist-Name.

---

# Sidebar-Breiten

| Modus | Breite | Bedingung |
|-------|--------|-----------|
| Expanded | 240px | Fenster ≥ 768px (Default) |
| Collapsed | 64px | Fenster < 768px oder manuell umgeschaltet |
| Toggle | — | Hamburger-Icon oben links |

---

# Hauptnavigation

Dauerhaft oben in der Sidebar.

| Eintrag | Icon | Ziel |
|---------|------|------|
| Home | Haus-Icon | Startseite |
| Suche | Lupe | Search-Seite |

---

# Bibliotheksbereich

Unterhalb der Hauptnavigation.

## Filter-Tabs

Toggle-Tabs: Playlists (Default) | Künstler | Alben | Podcasts (optional).

Aktiver Tab: Textfarbe weiß.
Inaktiver Tab: Textfarbe sekundär (#B3B3B3).

## Sortierungs-Dropdown

Default: "Zuletzt" (kürzlich verwendete zuerst).

Optionen:

- Zuletzt
- Alphabetisch
- Kürzlich gespielt
- Zuletzt erstellt

## Suche innerhalb der Sidebar

Kleinenes Suchfeld (🔍) filtert die Playlist-Liste live.

---

# Bibliotheksliste

Jeder Eintrag zeigt:

- Icon/Cover (32x32 px, quadratisch)
- Titel (14px, weiß)
- Typ und Metainfo (12px, sekundär)
- Kontextindikator (grüner Haken bei heruntergeladenen)

Beispiel: `❤️ Lieblingssongs — Playlist • 2.197 Songs`

## Eintragstypen

| Typ | Icon-Style | Metainfo |
|------|-----------|----------|
| Playlist | Herz / Cover | `Playlist • n Songs` |
| Album | Cover | `Album • Künstler` |
| Künstler | Foto | `Künstler` |
| Ordner | Ordner-Icon | `Ordner • n Elemente` |
| Sammlung | Tag-Icon | `Sammlung • n Songs` |

---

# Pinned Bereiche

Angeheftete Elemente erscheinen oben in der Liste.

Standard-Pins:

- Lieblingssongs (Favoriten)
- Downloads
- Zuletzt gehört
- Eigene Sammlungen

User kann jeden Eintrag anpinnen (Kontextmenü → Anheften).

---

# Custom Reihenfolge

Playlists können per Drag & Drop umsortiert werden.

- Drag-Handle: gesamte Zeile
- Ghost-Element beim Ziehen
- Einfüge-Marker an Zielposition
- Reihenfolge wird in LifeHub-DB gespeichert (nicht in Jellyfin)

---

# Bibliotheksaktionen

Oben im Bibliotheksbereich.

| Aktion | Icon | Ergebnis |
|--------|------|----------|
| Neue Playlist | + | Öffnet Dialog zum Erstellen |
| Neuer Ordner | 📂+ | Erstellt Ordner in Sidebar |
| Importieren | ⬆ | M3U/JSON Import-Dialog |
| Sortieren | ▾ | Öffnet Sortierungs-Dropdown |
| Filtern | 🔍 | Öffnet Sidebar-Suche |

---

# Navigation History

In der Top Bar.

| Button | Aktion |
|--------|--------|
| ⬅ Zurück | Vorherige Seite (Browser-Back) |
| ➡ Vor | Nächste Seite (Browser-Forward) |

History wird als Stack verwaltet.

Chronik-Menü (optional): zeigt letzte 10 besuchte Seiten.

---

# Suchleiste

Permanent in der Top Bar.

→ siehe spotify_search.md für Details.

---

# Benutzerbereich

Oben rechts in der Top Bar.

| Element | Funktion |
|---------|----------|
| Profil-Avatar | Öffnet User-Menu |
| User-Menu | Einstellungen, Profil, Abmelden |
| Notification-Bell | Zeigt Benachrichtigungen |
| Window-Controls | Minimieren, Maximieren, Schließen |

---

# Hover States

| Element | Hover-Verhalten |
|---------|-----------------|
| Sidebar-Item | Hintergrund → #1A1A1A |
| Aktives Sidebar-Item | Hintergrund → #282828, Text weiß |
| Tab | Textfarbe → weiß |
| Button | Farbe → heller |
| Link | Unterstrich oder Farbe → Akzent |

Hover-Verzögerung: 0 ms (instant).

---

# Selection States

Aktive Elemente werden deutlich markiert.

| Element | Aktiv-Indikator |
|---------|-----------------|
| Sidebar-Item | Hintergrund #282828, Text weiß |
| Aktive Seite (Home/Suche) | Text weiß, Icon weiß |
| Aktiver Tab | Text weiß, Bottom-Border Akzent |
| Playlist spielt gerade | Grüner Text, Soundbar-Icon |

---

# Collapse Animation

Sidebar einklappen: Breite 240px → 64px.

- Dauer: 250 ms
- Easing: ease-in-out (cubic-bezier(0.4, 0, 0.2, 1))
- Text-Labels: Fade-Out 100 ms vor Breiten-Animation
- Icons: bleiben sichtbar, leicht skaliert

---

# Kontextmenüs

Alle Navigationselemente besitzen Kontextmenüs (Rechtsklick).

## Playlist-Kontextmenü

- Abspielen
- Zufallswiedergabe
- Zur Queue hinzufügen
- Umbenennen
- Bearbeiten
- Teilen
- Herunterladen
- Duplizieren
- Zu Ordner verschieben
- Anheften / Loslösen
- Löschen

## Ordner-Kontextmenü

- Umbenennen
- Duplizieren
- Exportieren
- Löschen

---

# Drag & Drop

| Quelle | Ziel | Ergebnis |
|--------|------|----------|
| Song (aus Liste) | Playlist-Icon in Sidebar | Song zu Playlist hinzufügen |
| Song (aus Liste) | Queue in Now Playing | Song zur Queue hinzufügen |
| Playlist | Position in Liste | Playlist umsortieren |
| Playlist | Ordner | Playlist in Ordner verschieben |
| Album | Playlist-Icon | Alle Album-Songs zur Playlist |

Drag-Threshold: 5 px bevor Drag startet.

Ghost-Element erscheint nach 50 ms.

---

# Keyboard-Navigation

| Taste | Aktion |
|-------|--------|
| Pfeil oben/unten | Durch Sidebar-Liste navigieren |
| Enter | Ausgewählte Playlist öffnen |
| Kontextmenü-Taste | Kontextmenü öffnen |
| Strg+N | Neue Playlist erstellen |
| Esc | Auswahl aufheben / Menü schließen |

---

# Workspace Integration

Die Music Domain ist eine Domain innerhalb von LifeHub.

Integration erfolgt über:

- Globale Top-Bar von LifeHub (Domänen-Switcher)
- Music Domain hat eigene Sidebar und Player-Bar
- Player bleibt aktiv auch beim Wechsel zu anderen LifeHub-Domains
- Musik spielt im Hintergrund weiter

---

# Zukünftige Erweiterungen

Dieses Dokument wird später detailliert beschreiben

- Custom-Sortierung mit Drag-Presets
- Mehrere Sidebar-Filter gleichzeitig
- Dynamic Folders (Smart-Ordner)
- Lebenslauf-Navigation (visuelle History)
- Kontextsensitive Vorschläge
