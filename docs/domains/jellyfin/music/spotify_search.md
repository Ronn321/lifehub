# Search

Version 0.2

---

# Ziel

Die Suche ist ein zentraler Einstiegspunkt in die Music Domain.

Sie erlaubt das schnelle Auffinden von Songs, Künstlern, Alben, Playlists und Genres innerhalb der eigenen Bibliothek.

---

# Platzierung

Die Suchleiste ist permanent in der Top Bar sichtbar.

Sie bleibt unabhängig von der aktuell geöffneten Seite erreichbar.

Bei Klick öffnet sich die Search-Seite.

---

# Eingabefeld

Das Suchfeld enthält

- Lupen-Icon links
- Placeholder-Text: "Was möchtest du wiedergeben?"
- Clear-Button (✕) bei nicht-leerem Eingabe
- Auto-Focus beim Öffnen der Search-Seite
- Optional: Mikrofon-Icon für Voice Search (Web Speech API)

---

# Suchmodus

## Debounce

Die Suche startet 300 ms nach der letzten Eingabe.

Es wird keine manuelle Bestätigung benötigt.

Die Ergebnisse passen sich während des Tippens an.

## Autocomplete

Während des Tippens erscheinen bis zu 5 Vorschläge.

Vorschläge basieren auf

- Such-History
- exakten Titel-Treffern
- Künstler-Treffern

---

# Backend-Architektur

## Jellyfin Search

Für Bibliothekssuche.

```
GET /Search/Hints?searchTerm={query}&ItemTypes=Audio,MusicArtist,MusicAlbum,Playlist&Limit=20
GET /Items?searchTerm={query}&Recursive=true&IncludeItemTypes=Audio&Fields=BasicSyncs
```

## Meilisearch

Für erweiterte Suche mit Tags, Sammlungen und LifeHub-Metadaten.

```
POST /indexes/music/search
{ "q": "{query}", "limit": 20, "filterAttributes": [...] }
```

## Index-Struktur

```json
{
  "searchableAttributes": ["title", "artist", "album", "composer", "tags"],
  "rankingRules": ["words", "typo", "proximity", "attribute", "sort", "exactness"],
  "filterableAttributes": ["genre", "year", "artist", "album", "composer", "favorite", "tag"],
  "sortableAttributes": ["title", "artist", "album", "playCount", "dateAdded"]
}
```

---

# Ranking-Algorithmus

Die Gewichtung der Suchergebnisse folgt folgender Priorität.

1. Exakter Titel-Treffer (höchste Relevanz)
2. Künstler-Exakt-Treffer
3. Album-Exakt-Treffer
4. Popularität (PlayCount aus Jellyfin UserData)
5. Aktualität (zuletzt hinzugefügt oder gespielt)

## Fuzzy-Matching

Tippfehler werden toleriert.

- Levenshtein-Distanz bis 2 bei Wörtern ≤ 5 Zeichen
- Levenshtein-Distanz bis 3 bei Wörtern > 5 Zeichen
- Akzent-Insensitiv: é = e, ü = u, ñ = n
- Diakritika werden normalisiert
- Präfix-Matching wird bevorzugt

---

# Ergebnisse

Die Ergebnisse sind kategorisiert.

## Kategorien

- Top Ergebnis
- Songs
- Künstler
- Alben
- Playlists
- Genres

Jede Kategorie zeigt zunächst eine begrenzte Anzahl.

Ein "Alle anzeigen"-Link öffnet die vollständige Liste pro Kategorie.

## Ergebnis-Limits

| Kategorie | Maximal sichtbar | "Alle anzeigen"-Link |
|-----------|-----------------|---------------------|
| Top Ergebnis | 1 | – |
| Songs | 4 | ✓ |
| Künstler | 4 | ✓ |
| Alben | 4 | ✓ |
| Playlists | 4 | ✓ |
| Genres | 4 | ✓ |

---

# Top Ergebnis

Das relevanteste Ergebnis wird prominent dargestellt.

Enthält

- Cover (groß, 160x160 px)
- Titel
- Typ (Song, Album, Künstler, Playlist)
- Wiedergabe-Button (Hover)

---

# Song-Ergebnisse

Jeder Song-Eintrag enthält

- Titel
- Künstler
- Album
- Dauer
- Favoritenstatus (Herz)
- Wiedergabe-Button (bei Hover)

Doppelklick startet sofortige Wiedergabe.

---

# Künstler-Ergebnisse

Jeder Künstler-Eintrag enthält

- Künstlerbild oder Platzhalter
- Name
- Anzahl Alben

---

# Album-Ergebnisse

Jedes Album enthält

- Cover
- Titel
- Künstler
- Erscheinungsjahr

---

# Playlist-Ergebnisse

Jede Playlist enthält

- Cover
- Titel
- Besitzer
- Anzahl Songs

---

# Browse-Ansicht

Ohne Suchbegriff zeigt die Search-Seite eine Browse-Ansicht.

Diese enthält

- Highlight-Banner oben (optional, promotet Featured Content)
- Genres und Stimmungen als Card-Raster
- Kategorien (z. B. Pop, Rock, Hip-Hop, Electronic, Jazz, Classical)
- Neuerscheinungen (falls von Jellyfin bereitgestellt)

Jede Genre-Card zeigt einen Namen und einen Farbverlauf als Hintergrund.

---

# Filter

## Filter-Tabs

Unter der Suche befinden sich Toggle-Tabs.

- Alle (Standard)
- Musik
- Podcasts (falls in Jellyfin vorhanden)
- Hörbücher (falls in Jellyfin vorhanden)

## Erweiterte Filter-Chips

Zusätzlich verfügbare Filter als Chips.

- Genre
- Jahr
- Interpret
- Komponist
- Tag (LifeHub-spezifisch)

---

# Suchverhalten

Unterstützt

- Tippfehler-Toleranz (Fuzzy-Matching)
- Akzent-Insensitivität
- Teilwort-Treffer
- Suche in Metadaten
- Komponistensuche
- Tag-Suche

---

# Leere Ergebnisse

Zeigt einen Hinweis bei keinen Treffern.

```
Keine Ergebnisse für "XYZ" gefunden
Bitte überprüfe die Suchbegriffe oder entferne Filter.
```

Empfehlung alternativer Suchbegriffe möglich.

---

# Such-History

Zuletzt gesuchte Begriffe werden gespeichert.

- Speicherung in localStorage unter Key `lifehub:music:search-history`
- Maximum 20 Einträge
- Anzeige beim Fokussieren des leeren Suchfelds
- Klick auf Eintrag startet Suche erneut
- Einzelne Einträge können gelöscht werden (✕ pro Eintrag)
- "Zuletzt gesucht"-Bereich

---

# Vorschläge

Autocomplete während des Tippens.

- Bis zu 5 Vorschläge
- Basierend auf Such-History und Index
- Auswahl mit Pfeiltasten + Enter möglich
- Vorschläge erscheinen im Dropdown unter dem Suchfeld

---

# Resultat-Interaktionen

## Doppelklick

Startet sofortige Wiedergabe.

## Rechtsklick

Öffnet das Kontextmenü.

Aktionen identisch zu denen in Bibliothek und Playlist.

## Drag & Drop

Ergebnisse können direkt in die Sidebar auf eine Playlist gezogen werden.

Ergebnisse können in die Player-Bar gezogen werden für sofortige Wiedergabe.

---

# Performance

- Debounce 300 ms nach Eingabe
- Meilisearch für < 50 ms Antwortzeit
- Jellyfin /Search/Hints als Fallback
- Resultate werden mit TanStack Query gecacht (staleTime: 60 s)
- Cover werden lazy-loaded mit IntersectionObserver

---

# Jellyfin Integration

Die Suche durchsucht die Jellyfin-Bibliothek.

LifeHub erweitert die Suche um

- eigene Tags (in Meilisearch indexiert)
- Sammlungen
- Verlauf
- Favoriten
- Playlists

---

# Zukünftige Erweiterungen

Dieses Dokument wird später detailliert beschreiben

- erweiterte Query-Syntax (AND, OR, NOT)
- gespeicherte Suchen
- Suchergebnis-Export
- phonetische Suche (Soundex, Metaphone)
- Integration von Album-Reviews
