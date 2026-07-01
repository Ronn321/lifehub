# ADR-0004: Pages Domain

## Status

Accepted (2026-06-28)

## Context

LifeHub hat 16 etablierte Domains mit jeweils eigener UI. Dies führt zu:

- duplizierten UI-Komponenten (Upload, Gallery, Table, Notes)
- inkonsistentem User-Erlebnis
- hohem Aufwand für neue Features (müssen pro Domain gebaut werden)

Die `PAGE_SYSTEM_VISION.md` (siehe `docs/01_Architecture/PAGE_SYSTEM_VISION.md`) skizziert eine Lösung: ein universelles Seitensystem, das alle Inhalte darstellen kann.

## Decision

Wir führen die **Pages Domain** als 17. Domain ein, basierend auf:

1. **Block-basiertes Seitensystem** — jede Seite besteht aus frei anordenbaren Blöcken
2. **TipTap (ProseMirror)** als Rich-Text-Engine für Text-Blöcke
3. **JSONB-Speicherung** — Block-Content wird als JSON in der DB gespeichert
4. **Keine Migration bestehender Domains** — Pages läuft parallel
5. **5 MVP Block-Typen:** heading, text, image, gallery, file-list

### Warum TipTap?

- Baut auf ProseMirror auf (ausgereift, erweiterbar)
- JSON-Speicherformat → direkt in JSONB speicherbar
- Schema-basiert (validierbar, typsicher)
- Aktive Community, React-First-API
- Erweiterbar für spätere Block-Typen (table, code, embed)

### Warum JSONB?

- Flexibel für verschiedene Block-Typen ohne Schema-Änderung
- TipTap produziert nativ JSON
- Keine Extra-Serialisierung/Deserialisierung nötig
- PostgreSQL JSONB-Index für Volltext-Suche (später)

### Warum eigene Domain vs. Erweiterung bestehender?

- Klare Trennung der Concerns (Pages = Darstellung, Domains = Logik)
- Vertikaler Slice möglich (eigene Entities, API, UI)
- Vereinfacht spätere Migration bestehender Domains
- Plugin-freundlich (neue Block-Typen als Plugins)

## Consequences

### Positive

- Einheitliches UI für alle Inhalte
- Neue Inhalts-Typen ohne neue UI-Komponenten
- Plugin-System für Block-Typen möglich
- Reduziert UI-Code-Duplizierung langfristig

### Negative

- Zusätzliche Komplexität (neue Domain + Block-System)
- Zusätzlicher Lernaufwand (TipTap, Block-Architektur)
- Performance-Overhead durch JSONB-Parsing (vernachlässigbar)

### Neutral

- Bestehende Domains bleiben unverändert
- Pages Domain ist optional — Domains können weiterhin eigene UIs haben
- Umstellung bestehender Domains ist ein separater, späterer Schritt

## Alternatives Considered

### Kein Pages-System — Status Quo beibehalten
Verworfen wegen wachsender UI-Duplizierung und Wartbarkeitsproblemen.

### Notion-ähnliches Block-System mit eigenem Rendering
Verworfen — zu hoher Aufwand. TipTap baut auf ProseMirror auf und spart Jahre Entwicklung.

### Markdown-basiertes Pages-System (Obsidian-Stil)
Verworfen — zu unflexibel für Block-basierte Layouts (Gallery, File-List, spätere Typen).

## References

- `docs/01_Architecture/PAGE_SYSTEM_VISION.md`
- `features/pages.feature.md`
- `features/pages.AGENTS.md`
- TipTap: https://tiptap.dev
