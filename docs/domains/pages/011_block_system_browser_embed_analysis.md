# Block-System & Browser-Embed Analyse: Ist-Zustand, Inkonsistenzen und Empfehlungen

Analyse erstellt: 2026-07-10
Scope: Block-Registry (Code + Doku), Backend-Type-Definitionen, Architektur-Dokumente, existierender Code
Basis: 9 Dateien in Code + Doku, 2 Frontend-Komponenten, 1 Backend-Controller

---

## 1. IST-ZUSTAND (Vier unabhängige Block-Typ-Definitionen)

Es gibt **vier verschiedene Listen** von Block-Typen im Projekt, die alle voneinander abweichen:

### 1.1 Frontend BlockRegistry (Code) — `apps/frontend/src/lib/blockRegistry.ts`

**27 Typen** (Union `BlockTypeUnion` Zeile 10-16, Registrierung Zeile 77-298):

| Kategorie | Typen |
|-----------|-------|
| Basis | heading, text, todo, toggle, callout, quote, code |
| Medien | bookmark, image, gallery, file-list, embed, video, file, link |
| Struktur | divider, table, page-reference, checklist, timeline, map |
| Widgets | research_workspace, calendar_view, finance_widget, it_inventory_widget, jellyfin_player, **search** |

> **Abweichung von der Aufgabenstellung:** Der User nennt 26 Typen — tatsächlich sind es **27** (inkl. `search`). Kein `browser_embed`.

### 1.2 Backend Entity (Code) — `domains/pages/src/entities/pages.ts` Zeile 19-25

**26 Typen** (Union `BlockType`):

Gleiche Liste wie Frontend, **aber ohne `search`**. Auch kein `browser_embed`.

### 1.3 Backend DTO (Code) — `domains/pages/src/dtos/pages.dto.ts` Zeile 37-44

**26 Typen** (Array `blockTypes`):

Exakt identisch mit Backend Entity — ebenfalls ohne `search` und `browser_embed`.

### 1.4 Doku-Registries

**`docs/domains/pages/pages_block_registry.md`:**

| Kategorie | Typen |
|-----------|-------|
| Basic | text, heading, divider, quote, list |
| Structural | toggle_heading, page_link, callout |
| Media | image, file, embed |
| Data | table_simple, database_view |
| Advanced | spreadsheet, **browser_embed**, map, search_block, jellyfin_embed |

**`docs/domains/pages/pages_block_system.md`:** Gleiche Liste mit denselben 15 Typen in 5 Kategorien.

> **Problem:** Völlig andere Nomenklatur als der Code — z.B. `toggle_heading` vs. `toggle`, `page_link` vs. `page-reference`, `table_simple` vs. `table`, `database_view` vs. `checklist`, `spreadsheet` vs. `finance_widget`, `search_block` vs. `search`, `jellyfin_embed` vs. `jellyfin_player`. Die Doku-Typen wurden nie mit dem Code abgeglichen.

---

## 2. INKONSISTENZEN IM DETAIL

### 🔴 Widerspruch 1: Drei verschiedene Code-Registries (Frontend / Entity / DTO)

| Typ | Frontend (`blockRegistry.ts`) | Backend Entity (`pages.ts`) | Backend DTO (`pages.dto.ts`) |
|-----|:---:|:---:|:---:|
| `search` | ✅ | ❌ | ❌ |
| `browser_embed` | ❌ | ❌ | ❌ |

Die Frontend-Registry hat `search` als 27. Typ — aber das Backend validiert diesen Typ weder im Entity noch im DTO. Ein Block vom Typ `search` könnte also über die API gespeichert werden, da der DTO das Enum nicht kennt. **Fehlende Typ-Sicherheit in der API.**

### 🔴 Widerspruch 2: Doku-Registry vs. Code-Registry — komplett unterschiedliche Nomenklatur

| Code (Frontend) | Doku (Registry) | Problem |
|---|---|---|
| `toggle` | `toggle_heading` | Anderer Name, andere Semantik |
| `page-reference` | `page_link` | Unterschiedliche Konvention |
| `table` | `table_simple` | Doku hat eigene Namensgebung |
| `checklist` | `database_view` | Völlig anderer Begriff |
| `finance_widget` | `spreadsheet` | Anderes Konzept |
| `search` | `search_block` | Suffix-Konvention |
| `jellyfin_player` | `jellyfin_embed` | Player vs. Embed |
| `map` kommt in Code vor | `map` ebenfalls | ✅ Konsistent |
| ❌ existiert nicht | `list`, `browser_embed` | In Doku, nicht im Code |

**Kernerkenntnis:** Die Doku-Dateien `pages_block_registry.md` und `pages_block_system.md` beschreiben ein **anderes Block-System** als der Code implementiert. Sie sind nicht nur veraltet, sie wurden für ein anderes Design konzipiert.

### 🔴 Widerspruch 3: Architektur-Doku sagt "Browser ist nicht Bestandteil"

**`docs/01_Architecture/BLOCK_SYSTEM_ARCHITECTURE.md` §13:**
> "Nicht Bestandteil: Pages Domain, Research Workspace Logic, **Browser Implementation**, Storage Layer, Templates"

Dieses Dokument listet keine `browser_embed`-Block-Typ — weder in §4 (Core Blocks) noch in §4.2 (System Blocks) oder §4.3 (Future/Plugin Blocks).

**`docs/01_Architecture/RESEARCH_WORKSPACE_ARCHITECTURE.md` §8:**
> "Der Browser ist nur eine UI-Komponente. Er ist nicht Teil der Architektur. Er ist austauschbar."

**Implikation:** Die Architektur-Dokumente schließen den Browser explizit aus dem Block-System aus.

### 🔴 Widerspruch 4: `block_browser_embed.md` definiert einen vollständigen Block-Typ

**`docs/domains/pages/blocks/block_browser_embed.md`** definiert:

- `browser_embed` als Block-Typ mit Content-Schema `{url, title}`
- Props `{height, allow_navigation}`
- Vollständige Browser-Features: Navigation, Back, Forward, Reload, Address Bar, Zoom
- Sandbox, isolierter Storage
- Future Extensions: Tabs, Split View, Bookmarks, Annotation, Web Clipping

**Das ist ein direkter Widerspruch zu den Architektur-Dokumenten.** Die Block-Spec existiert, aber keine Architektur-Entscheidung hat sie autorisiert.

### 🟡 Widerspruch 5: `embed` vs. `browser_embed` — funktionale Überschneidung

| Aspekt | `block_embed.md` | `block_browser_embed.md` |
|--------|------------------|--------------------------|
| Content | `{url, provider}` | `{url, title}` |
| Rendering | iframe / native / provider-specific | "embedded browser component" |
| Navigation | ❌ Keine | ✅ Back, Forward, Reload, Address Bar |
| Nutzung | YouTube, Karten, PDF | Thingiverse, GitHub, Doku |
| Future | "live websites" | Tabs, Split View |

**Abgrenzungsproblem:** `block_embed.md` sagt "Any embeddable website" + Future "live websites". Ein Thingiverse-Viewer könnte sowohl `embed` als auch `browser_embed` sein. Es gibt keine scharfe Trennlinie.

### 🔴 Widerspruch 6: Existierender Code implementiert Browser — aber anders als alle Docs

Der Browser existiert im Code bereits in **drei Formen**:

| Form | Pfad | Status |
|------|------|--------|
| **Standalone Page** | `apps/frontend/src/app/(dashboard)/browser/page.tsx` | ✅ Vollständige UI mit URL-Bar, Navigation, Proxy |
| **In ResearchWorkspaceBlock** | `apps/frontend/src/.../blocks/ResearchWorkspaceBlock.tsx` | ✅ Tab-Management, History, Pin-as-Source |
| **Backend-Proxy** | `domains/pages/src/api/browser.controller.ts` | ✅ Puppeteer/Browserless-Proxy |
| **DB-Tabelle** | `browser_tabs` (FK → `research_sessions`) | ✅ Existiert in Migration 0009 |

**Der Code hat eine Browser-Integration, die:**

1. nicht als Block-Typ im BlockRegistry existiert
2. nicht als `browser_embed`-Block im Editor integriert ist
3. an Research Sessions hängt (nicht an Pages/PageBlocks)
4. aber dennoch in einer eigenen Standalone-Page existiert

---

## 3. PROBLEMANALYSE

### 3.1 Keine Single Source of Truth für Block-Typen

Das Projekt hat **vier konkurrierende Block-Typ-Listen** (Frontend-Code, Backend-Entity, Backend-DTO, Doku). Es gibt keine autoritative Liste. Jede Änderung muss an vier Stellen propagiert werden — und das passiert nicht.

### 3.2 Doku-Drift zwischen `docs/01_Architecture/` und `docs/domains/pages/blocks/`

Die Architektur-Dokumente in `01_Architecture/` wurden nicht aktualisiert, als die Block-Specs in `docs/domains/pages/blocks/` erstellt wurden. Die 40+ Block-Spec-Dateien dort sind nie mit den Architektur-Entscheidungen abgeglichen worden.

### 3.3 Browser hat keine Architektur-Entscheidung

Der Browser existiert im Code auf drei Arten, in den Docs auf zwei Arten, aber es gibt **keine dokumentierte Entscheidung**, welches Modell gilt:

| Modell | Beschreibung |
|--------|-------------|
| **A: Block-Typ** | `browser_embed` als eigenständiger Page-Block mit Content, Props, Editor |
| **B: Research-Komponente** | Browser als Sub-Komponente des ResearchWorkspaceBlock, Tabs an Sessions gebunden |
| **C: Standalone-Seite** | Browser als eigene Page/Route, außerhalb des Block-Systems |
| **D: Austauschbare UI** | Browser ist nicht Teil der Architektur, nur ein austauschbares UI-Element |

**Der existierende Code implementiert eine Mischung aus B und C**, während `block_browser_embed.md` Modell A definiert und die Architektur-Docs Modell D.

### 3.4 Fehlende Typ-Sicherheit durch inkonsistente Enums

Weil `search` zwar im Frontend-BlockRegistry, aber nicht im Backend-Entity und DTO definiert ist, könnte ein `search`-Block von der API validiert werden (der DTO lässt ihn nicht zu) oder umgekehrt vom Frontend gesendet werden (der DTO lehnt ihn ab). Dies ist ein potenzieller Runtime-Fehler.

### 3.5 Datenmodell für Browser-Isolation nicht definiert

`block_browser_embed.md` fordert "isolated storage" und "eigene Session/Tabs/History/Cookies" pro BrowserBlock — aber es gibt kein Datenmodell dafür. Die existierende `browser_tabs`-Tabelle ist an Research Sessions gebunden, nicht an Pages oder PageBlocks. Für das Ziel "jeder BrowserBlock hat eigene Session" müsste das DB-Schema erweitert werden (FK zu `page_blocks` statt oder zusätzlich zu `research_sessions`).

---

## 4. SOLL-ZUSTAND (Laut Zielarchitektur)

Die Anforderungen aus der Aufgabenstellung und `block_browser_embed.md` definieren:

### 4.1 Browser als eigenständiger Blocktyp

- `browser_embed` ist ein regulärer Block im Pages-Block-System
- Verhält sich "wie jeder andere Block im Editor"
- Kann auf jeder Page platziert, umsortiert, dupliziert werden

### 4.2 Jeder BrowserBlock hat eigene Session

- Eigene Tabs
- Eigene Verlaufs-History
- Eigene Cookies / isolierter Storage
- Unabhängig von anderen BrowserBlöcken auf derselben Page

### 4.3 Später erweiterbar

- Downloads-Verwaltung
- Extensions / Plugins
- DevTools
- Split View / Multi-Browser-Layout
- Bookmarks
- Annotation / Web Clipping

### 4.4 Technisch

- Sandbox-basiert (kein DOM-Zugriff auf LifeHub)
- Proxy-basiert (wie aktuell mit Puppeteer/Browserless)
- Session-Persistenz (auch nach Neuladen der Page)

---

## 5. EMPFEHLUNGEN

### 5.1 Architekturentscheidung treffen (P0 — sofort)

Ein ADR (Architecture Decision Record) muss das Browser-Modell verbindlich festlegen. Nur drei Optionen sind sinnvoll:

| Option | Bewertung | Begründung |
|--------|-----------|------------|
| **A: `browser_embed` als Page-Block** | ⭐ Empfohlen | Erfüllt alle Ziel-Anforderungen, konsistent mit Block-System-Philosophie "Everything is a block". Ermöglicht mehrere Browser auf einer Page, Unabhängigkeit, zukünftige Erweiterungen. |
| **B: Browser als Research-Komponente** | ❌ Nicht empfohlen | Widerspricht "eigenständiger Blocktyp", erzeugt Kopplung an ResearchWorkspace, kein Multi-Browser pro Page. Ist aber der aktuelle Code-Status (Tabellen-Struktur). |
| **C: Browser als Standalone-Seite** | ❌ Nicht empfohlen | Ignoriert das Block-System komplett, keine Integration in Pages, keine Kombinierbarkeit. Ist aber ebenfalls im aktuellen Code vorhanden. |

**Empfehlung: Entscheidung für Option A** — `browser_embed` als Page-Block. Dies erfordert:

- Migration der `browser_tabs`-Tabelle von FK `research_sessions` auf FK `page_blocks` (zusätzlich oder alternativ)
- Aufnahme in BlockType-Union (Code: Frontend + Backend Entity + Backend DTO)
- Aufnahme in Frontend-BlockRegistry
- Update der Architektur-Dokumente (§13 in BLOCK_SYSTEM_ARCHITECTURE.md streichen, §8 in RESEARCH_WORKSPACE_ARCHITECTURE.md aktualisieren)

### 5.2 Block-Registry als Single Source of Truth etablieren (P0 — sofort)

Eine einzelne autoritative Block-Liste einführen — entweder:

- **Variante A:** Den Code (`blockRegistry.ts` + Entity `BlockType` + DTO `blockTypes`) als Source of Truth definieren und alle Doks darauf ausrichten
- **Variante B:** Eine neue `BLOCK_REGISTRY.md` als Master-Dokument, die Code und Doku gleichermaßen referenziert (empfohlen von der bestehenden Analyse `010_browser_doc_consistency_analysis.md`)

Egal welche Variante: **Zentraler Schritt** ist die einmalige Synchronisation aller vier Listen (Frontend-Code, Backend-Entity, Backend-DTO, Doku) auf einen gemeinsamen Stand.

### 5.3 Code-konsistente Block-Liste definieren (P1 — nach ADR)

Die Code-Block-Liste (27 Typen in Frontend, 26 in Backend) sollte die Basis sein. Alle Typen, die in der Doku, aber nicht im Code sind:

| Doku-Typ | Code-Äquivalent | Aktion |
|----------|----------------|--------|
| `browser_embed` | ❌ Neu | Hinzufügen (nach ADR-Entscheidung) |
| `toggle_heading` | `toggle` | Doku auf Code-Namen aktualisieren |
| `page_link` | `page-reference` | Doku auf Code-Namen aktualisieren |
| `table_simple` | `table` | Doku auf Code-Namen aktualisieren |
| `database_view` | `checklist` | Prüfen: gleiche Funktionalität? |
| `spreadsheet` | `finance_widget` | Prüfen: gleiche Funktionalität? |
| `search_block` | `search` | Doku auf Code-Namen aktualisieren |
| `jellyfin_embed` | `jellyfin_player` | Doku auf Code-Namen aktualisieren |
| `list` | ❌ Kein Äquivalent | Prüfen: neuer Block-Typ oder deprecated? |

### 5.4 Frontend-Code und Backend-Code synchronisieren (P1 — nach ADR)

Aktuell:
- **Frontend hat `search`** — Backend nicht → Backend Entity + DTO erweitern um `search`
- **Backend hat kein `browser_embed`** — nach ADR-Entscheidung ggf. hinzufügen
- **Backend Entity und DTO sind konsistent** untereinander (26 Typen) — das ist gut, aber Frontend weicht ab

### 5.5 `embed` vs. `browser_embed` Abgrenzung dokumentieren (P2)

Nach der ADR-Entscheidung muss die funktionale Abgrenzung zwischen `embed` (passiv, statisch, Provider-spezifisch) und `browser_embed` (aktiv, navigierbar, voller Browser) dokumentiert werden. Ein Thingiverse-Viewer mit Navigation wäre `browser_embed`, ein eingebettetes YouTube-Video wäre `embed`.

### 5.6 Bestehende Analyse integrieren (P1)

Die Datei `010_browser_doc_consistency_analysis.md` (vom 2026-07-09) überschneidet sich inhaltlich mit dieser Analyse, hat aber einen anderen Fokus (10 Markdown-Dokumente). Beide Analysen sollten konsolidiert werden, um Widersprüche in den Empfehlungen zu vermeiden.

---

## 6. ZUSAMMENFASSUNG

| Aspekt | Befund | Schwere |
|--------|--------|:-------:|
| Frontend- vs. Backend-Code-Registry | Frontend hat `search` (27 Typen), Backend nicht (26 Typen) | 🔴 |
| Doku- vs. Code-Registry | Völlig andere Nomenklatur, Doku beschreibt anderes Block-System | 🔴 |
| Architektur-Doku vs. Block-Specs | Architektur sagt "Browser nicht Bestandteil", Spec sagt "vollwertiger Block" | 🔴 |
| Embed vs. Browser-Embed | Funktionale Überschneidung ohne klare Abgrenzung | 🟡 |
| Existierender Code vs. alle Docs | Drei Browser-Implementierungen, keine deckungsgleich mit Docs | 🔴 |
| Fehlende Architektur-Entscheidung | Keine ADR, welches Browser-Modell gilt | 🔴 |
| Keine Single Source of Truth | Vier Block-Listen ohne autoritative Referenz | 🔴 |

**Dringendste Maßnahmen:**
1. ADR zum Browser-Modell (Block-Typ vs. Research-Komponente)
2. Block-Registry konsolidieren (eine Quelle für alle Typen)
3. Code-Registries synchronisieren (Frontend ↔ Backend)
4. Architektur-Dokumente anpassen (Widersprüche auflösen)

**Nächste Schritte nach ADR:**
5. `browser_embed` in BlockType-Union aufnehmen (sofern ADR für Block-Modell)
6. `browser_tabs`-Datenmodell auf PageBlock-Referenz umstellen
7. Frontend-Komponente für `browser_embed`-Block implementieren
8. Standalone-Browser-Page als dedizierten Block umbauen oder entfernen
