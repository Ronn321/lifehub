# ADR-0005: Browser als eigenständiger Block-Typ (`browser_embed`)

## Status

Accepted (2026-07-10)

## Context

Das Architecture-Review (`docs/reviews/browser_block_review.md`) hat identifiziert, dass der Browser aktuell in **vier widersprüchlichen Formen** existiert:

| Modell | Beschreibung | Status im Code |
|--------|-------------|----------------|
| A: Block-Typ | `browser_embed` als Page-Block | ❌ Nur in Doku (`block_browser_embed.md`) |
| B: Research-Komponente | Browser als Sub-Tab des ResearchWorkspaceBlock | ✅ Implementiert (ResearchWorkspaceBlock.tsx) |
| C: Standalone-Seite | Browser als eigene Route `/browser` | ✅ Implementiert (browser/page.tsx) |
| D: Austauschbare UI | Browser nicht Teil der Architektur | ✅ In Doku (RESEARCH_WORKSPACE_ARCHITECTURE.md §8) |

Zielarchitektur fordert: Browser als **eigenständiger, modularer Block-Typ** mit eigener Session, Tabs, History, Cookies, Bookmarks und Settings pro Block. Vollständige Isolation zwischen Browser-Blöcken.

## Decision

Wir entscheiden uns für **Modell A: `browser_embed` als eigenständiger Block-Typ** im Pages-Block-System.

### Begründung

1. **"Everything is a Block"**: Konsistent mit der Pages-System-Philosophie (PAGE_SYSTEM_VISION.md)
2. **Multi-Browser pro Page**: Mehrere Browser-Blöcke auf einer Page möglich
3. **Vollständige Isolation**: Jeder Block hat eigene Session (Tabs, History, Cookies, Bookmarks)
4. **Erweiterbarkeit**: Block-System unterstützt Versionierung, Permissions, Templates
5. **Kombinierbarkeit**: Browser kann neben Text, Bildern, Tabellen etc. auf einer Page stehen
6. **Research-Workspace kann Browser referenzieren**: ResearchWorkspaceBlock nutzt `BrowserCore` als wiederverwendbare Komponente

### Abgrenzung zum Embed-Block (`embed`)

| Kriterium | `embed` | `browser_embed` |
|-----------|---------|-----------------|
| Zweck | Statisches Embed (YouTube, Maps, PDF) | Vollständiger Browser (Recherche, Web-Apps) |
| Navigation | Nein (feste URL) | Ja (Back, Forward, URL-Bar, Tabs) |
| Session-Persistenz | Nein | Ja (History, Cookies, Bookmarks) |
| JS-Ausführung | iframe nativ | Puppeteer (proxy-gerendert) |

## Consequences

### Positive

- Einheitliches Browser-Erlebnis als Block im Editor
- Mehrere isolierte Browser-Blöcke pro Page
- Konsistent mit Block-System-Philosophie
- Research-Workspace kann BrowserCore nutzen (kein Duplikat)
- Erweiterbar um Downloads, DevTools, Split View

### Negative

- Standalone `/browser`-Seite muss entfernt werden (Breaking Change für Bookmarks)
- `browser_tabs`-Tabelle muss von `research_sessions` auf `browser_sessions` migriert werden
- ResearchWorkspaceBlock muss refactored werden (Browser als ausgelagerte Komponente)
- Zusätzliche Komplexität: Session-Management, Cookie-Isolation

### Migration

1. Neue `browser_sessions`-Tabelle (FK → `page_blocks`)
2. `browser_tabs` von `research_sessions` auf `browser_sessions` migrieren
3. `BrowserBlock.tsx` als neue Block-Komponente
4. `ResearchWorkspaceBlock` nutzt `BrowserCore` statt eigenem Browser
5. `/browser`-Standalone-Seite entfernen
6. `proxy.controller.ts` in `browser.controller.ts` konsolidieren

## Alternatives Considered

### Modell B: Browser als Research-Komponente (Status Quo)
Verworfen — widerspricht "eigenständiger Blocktyp". Browser an Research-Session gekoppelt. Kein Multi-Browser pro Page.

### Modell C: Browser als Standalone-Seite (Status Quo)
Verworfen — ignoriert Block-System komplett. Keine Integration in Pages, keine Kombinierbarkeit mit anderen Blöcken.

### Modell D: Browser als austauschbare UI-Komponente
Verworfen — zu vage. Erlaubt keine Persistenz, keine Session-Isolation, keine Block-Features (Versionierung, Permissions).

## References

- Architektur-Review: `docs/reviews/browser_block_review.md`
- Zielarchitektur: `docs/01_Architecture/BROWSER_BLOCK_ARCHITECTURE.md`
- Block-System-Analyse: `docs/domains/pages/011_block_system_browser_embed_analysis.md`
- Sicherheitsanalyse: `docs/SECURITY_ANALYSIS_BROWSER.md`
- ADR-0004 (Pages Domain): `docs/01_Architecture/adr/ADR-0004-Pages-Domain.md`
- PAGE_SYSTEM_VISION: `docs/01_Architecture/PAGE_SYSTEM_VISION.md`
