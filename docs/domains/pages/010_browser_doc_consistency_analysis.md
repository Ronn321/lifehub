# Browser-Dokumentation: Konsistenz- und Architekturanalyse (v1)

> ⚠️ **DEPRECATED (2026-07-10):** Diese Analyse enthält Fehler.
> Sie behauptet fälschlicherweise, dass ResearchWorkspaceBlock-Frontend und
> Block-Registry nicht existieren — beide existieren jedoch (672 Zeilen TSX,
> 27 Registry-Typen). Bitte nutzen Sie stattdessen:
> - `011_browser_doc_consistency_analysis_v2.md` (korrigierte Analyse)
> - `docs/reviews/browser_block_review.md` (vollständiges Review)
> - `011_block_system_browser_embed_analysis.md` (Block-System-Analyse)

Analyse erstellt:
Scope: 10 Markdown-Dokumente + existierender Code (DB, Controller)

---

## 1. Dokumenten-Übersicht und Status

| # | Dokument | Pfad | Status | Browser-Erwähnung |
|---|----------|------|--------|-------------------|
| 1 | `block_browser_embed.md` | `docs/domains/pages/blocks/` | 🔴 Spec ohne Code | Vollständiger Block-Entwurf |
| 2 | `RESEARCH_WORKSPACE_ARCHITECTURE.md` | `docs/01_Architecture/` | 🟢 Aktiv | §8: Browser ist nur UI-Komponente |
| 3 | `BLOCK_SYSTEM_ARCHITECTURE.md` | `docs/01_Architecture/` | 🟡 Veraltet | §13: „Nicht Bestandteil" |
| 4 | `PAGE_ARCHITECTURE.md` | `docs/01_Architecture/` | 🟢 Aktiv | Nur ResearchWorkspaceBlock |
| 5 | `PAGES_NOTION_REDESIGN_PLAN.md` | `docs/01_Architecture/` | 🟢 Aktiv | ❌ Keine Erwähnung |
| 6 | `pages_overview.md` | `docs/domains/pages/` | 🟢 Aktiv | Phase 4: "browser, maps, plugins" |
| 7 | `pages.feature.md` | `features/` | 🟡 Veraltet (MVP) | ❌ Keine Erwähnung |
| 8 | `pages.AGENTS.md` | `features/` | 🟡 Veraltet (MVP) | ❌ Keine Erwähnung |
| 9 | `block_embed.md` | `docs/domains/pages/blocks/` | 🟢 Aktiv | Überschneidung mit browser_embed |
| 10 | `PAGE_SYSTEM_VISION.md` | `docs/01_Architecture/` | 🟢 Aktiv | ❌ Keine Erwähnung |

### Code-Realität (implements):
- `domains/pages/src/api/browser.controller.ts` — Puppeteer/Browserless-Proxy (GET/POST proxy + screenshot)
- `apps/backend/drizzle/0009_pages_slugs_browser.sql` — `browser_tabs`-Tabelle (FK → `research_sessions`)
- **Kein** `browser_embed`-Block im Frontend (Block-Registry existiert nicht)
- **Kein** `ResearchWorkspaceBlock`-Frontend-Komponent

### Block-Specs im Widerspruch:
Es existieren **40+ Block-Dateien** in `docs/domains/pages/blocks/`, aber die offizielle Block-Registry in `PAGES_NOTION_REDESIGN_PLAN.md` (Zeile 448–463) listet nur 13 Typen. Die Architektur-Dokumente (`BLOCK_SYSTEM_ARCHITECTURE.md`) listen 16 Typen. Keine der beiden Listen enthält `browser_embed`.

---

## 2. Identifizierte Widersprüche

### 🔴 Widerspruch A: Browser als Block vs. Browser als Research-Session-Komponente

| Dokument | Aussage |
|----------|---------|
| `block_browser_embed.md` | `browser_embed` ist ein eigenständiger **Block-Typ** im Pages-Block-System. Content-Schema: `{url, title}`, Props: `{height, allow_navigation}`. |
| `RESEARCH_WORKSPACE_ARCHITECTURE.md` §8 | „Der Browser ist nur eine UI-Komponente. Er ist nicht Teil der Architektur. Er ist austauschbar." |
| `RESEARCH_WORKSPACE_ARCHITECTURE.md` §4 | Browser-Tabs sind **Teil der Research Session** („offene Tabs, Tab-Reihenfolge, aktive Quelle") |
| DB-Schema `0009_pages_slugs_browser.sql` | `browser_tabs` hat **FK zu `research_sessions`**, nicht zu `pages` oder `page_blocks` |

**Problem:** Drei widersprüchliche Modelle:
1. **Block-Modell**: Browser ist ein `browser_embed`-Block auf einer beliebigen Page
2. **Research-Komponenten-Modell**: Browser-Tabs sind Teil einer Research Session innerhalb eines `ResearchWorkspaceBlock`
3. **Austauschbarkeit**: Browser ist nur UI, kein Architektur-Bestandteil

**Konsequenz:** Unklar, ob der Browser als eigener Block-Typ in Pages, als Sub-Komponente des ResearchWorkspace oder als komplett separate UI (außerhalb des Block-Systems) existieren soll. Die DB-Schema sagt deutlich: `browser_tabs → research_sessions`.

---

### 🟡 Widerspruch B: Offizielle Block-Registry ignoriert `browser_embed`

| Dokument | Enthaltene Block-Typen | browser_embed |
|----------|----------------------|:---:|
| `BLOCK_SYSTEM_ARCHITECTURE.md` §4 | 16 Core/System/Future Blocks (z.B. `markdown`, `embed`, `research_workspace`) | ❌ |
| `PAGES_NOTION_REDESIGN_PLAN.md` Z.448-463 | 13 Block-Typen (heading, text, image, gallery, ... page-reference) | ❌ |
| `pages.feature.md` | 6 MVP-Block-Typen | ❌ |
| `pages.AGENTS.md` §2 | „heading, text, image, gallery, file-list, divider" | ❌ |
| `docs/domains/pages/blocks/` | **40+** Block-Spec-Dateien (inkl. browser_embed) | ✅ |

**Problem:** Die Doku-Abteilung `docs/domains/pages/blocks/` hat eigenständig 40+ Block-Specs definiert, die in **keiner** offiziellen Registry-Auflistung vorkommen. Die Architektur-Dokumente wurden nie nachgeführt.

---

### 🟡 Widerspruch C: embed vs. browser_embed — funktionale Überschneidung

| Aspekt | `block_embed.md` | `block_browser_embed.md` |
|--------|------------------|--------------------------|
| Content | `{url, provider}` | `{url, title}` |
| Props | `{height, interactive}` | `{height, allow_navigation}` |
| Rendering | iframe / native / provider-specific | „embedded browser component" |
| Navigation | ❌ Keine (nur Reload) | Back, Forward, Reload, Address Bar |
| Sicherheit | Sandbox, keine Cookies, CSP | Sandbox, isolated storage |
| User Actions | Open externally, Reload, Resize | Navigation, Back, Forward, Reload, Address Bar, Zoom, Open external |
| Future | custom providers, authenticated embeds, **live websites** | tabs, split view, bookmarks, annotation |

**Analyse:** Der `embed`-Block zielt auf **passive Einbettung** (YouTube, Karten, PDF). Der `browser_embed`-Block zielt auf **aktives Browsen** (Navigation, Adressleiste). ABER: `block_embed.md` sagt „Any embeddable website" und Future „live websites" — das schneidet sich funktional mit dem Browser-Block.

**Frage:** Ist ein passives Embed einer Website (z.B. Thingiverse-Viewer) ein `embed`- oder ein `browser_embed`-Block? Die Abgrenzung ist nicht scharf definiert.

---

### 🔴 Widerspruch D: Existierender Code vs. Dokumentation

| Komponente | Code | Dokumentation |
|-----------|------|---------------|
| Puppeteer-Proxy | `browser.controller.ts` (GET/POST proxy, screenshot) | ❌ Nirgendwo dokumentiert |
| `browser_tabs`-Tabelle | In Migration 0009, FK → `research_sessions` | ❌ Nicht in Block-Spec erwähnt |
| `browser_embed`-Block | ❌ Nicht implementiert | `block_browser_embed.md` als Spec |
| ResearchWorkspace-Block | ❌ Nicht implementiert | `RESEARCH_WORKSPACE_ARCHITECTURE.md` dokumentiert |
| Browser als UI-Komponente | Proxy + Tabelle existieren | §8 sagt „austauschbar" |

**Problem:** Der existierende Browser-Code (Puppeteer-Proxy + Tab-Management) entspricht **keinem** der dokumentierten Modelle genau:
- Er ist ein **Backend-Proxy**, kein Block-Typ
- Er speichert Tabs in einer `research_sessions`-gebundenen Tabelle, aber `research_sessions` ist als Feature nicht dokumentiert (kein `research.feature.md`)
- Er hat Embedding-Funktionen (CSP-Header, URL-Rewriting), die in keinem Block-Spec erwähnt werden

---

## 3. Fehlende Spezifikationen

### Kritisch (muss vor Implementation geklärt werden)

| Fehlende Spec | Betroffene Dateien | Beschreibung |
|---------------|-------------------|--------------|
| **Architekturentscheidung: Browser-Modell** | alle | Verbindliche Entscheidung: Block-Typ? Research-Workspace-Subkomponente? Separater Service? Das bestimmt alles Weitere. |
| **browser_embed Block Registry** | `PAGES_NOTION_REDESIGN_PLAN.md`, `BLOCK_SYSTEM_ARCHITECTURE.md` | Keine Registry existiert. `browser_embed` muss in die Block-Registry aufgenommen werden — oder die Spec-Datei gelöscht. |
| **Browser-Block API** | `pages.feature.md` | Es gibt keine API-Endpoints für Browser-Blöcke (CRUD für browser-spezifische Props, Navigation State, History) |

### Mittel

| Fehlende Spec | Beschreibung |
|---------------|--------------|
| **Session-Management** | Wie wird eine Browser-Session erzeugt/verwaltet? Gibt es eine Session pro Block, pro Page, pro User? Wie lange lebt sie? |
| **Cookie-/Storage-Isolation** | `block_browser_embed.md` sagt „isolated storage" — aber wie? Pro Tab? Pro Block? Pro User? |
| **Tab-Management-API** | `browser_tabs`-Tabelle existiert, aber es gibt keine API-Spec für Tab-CRUD |
| **Downloads** | `RESEARCH_WORKSPACE_ARCHITECTURE.md` §10 erwähnt Downloads, aber kein API-Endpoint, kein Storage-Modell |
| **Bookmarks / Lesezeichen** | In `block_browser_embed.md` als Future genannt, aber kein Datenmodell |

### Niedrig (Phase 4+)

| Fehlende Spec | Beschreibung |
|---------------|--------------|
| **Research History** | Verlaufsspeicherung pro Session |
| **Annotation / Web Clipping** | Markierungs-Features |
| **Split View / Tab Groups** | Multi-Browser-Layout |

---

## 4. Doppelte und überlappende Definitionen

| Duplikat | Beschreibung |
|----------|--------------|
| **embed ↔ browser_embed** | Beide: URL-basierte Einbettung, iframe, Sandbox. Unterschied: Navigation vs. statisch. Abgrenzung unscharf bei „Any embeddable website" + Future „live websites" im embed-Block. |
| **BLOCK_SYSTEM_ARCHITECTURE.md §4 vs. PAGES_NOTION_REDESIGN_PLAN.md Z.448-463** | Zwei verschiedene Block-Listen, inkonsistent. Keine referenziert die andere. |
| **pages_overview.md Phase 4 vs. block_browser_embed.md** | Phase-Says: Browser kommt in Phase 4. Spec-Says: Browser ist jetzt als Block spezifiziert. |
| **features/ Specs vs. docs/domains/pages/blocks/ Specs** | `pages.feature.md` listet 6 MVP-Typen, aber `docs/domains/pages/blocks/` enthält 40+ Specs für Blöcke, die nie ins Feature-Dokument übernommen wurden. |

---

## 5. Lücken zwischen Zielarchitektur und Code

| Ziel (Doku) | Code-Realität | Lücke |
|-------------|--------------|-------|
| `browser_embed` als Page-Block | ❌ Nicht als Block implementiert | Keine Block-Komponente im Frontend, keine Block-Registry-Eintragung |
| ResearchWorkspaceBlock | ❌ Nicht implementiert | `research_sessions`-Tabelle existiert, aber kein Frontend |
| Browser mit Navigation (Back/Forward/Reload/Address Bar) | ✅ Puppeteer-Proxy existiert | Aber nur als Backend-Dienst, ohne Frontend-UI |
| Isolierte Storage (Sandbox, keine Cookies) | ❌ Nicht spezifiziert | Proxy gibt alle Antworten mit `http: https:` in CSP — keine echte Isolation |
| Tabs als Teil der Research Session | ✅ `browser_tabs`-Tabelle mit FK | Aber kein UI, keine API-Endpoints |
| 16 Block-Typen in Architektur-Doku | ✅ 13 im Redesign-Plan | Redesign-Plan + Architektur widersprechen sich |
| 40+ Block-Spec-Dateien | ❌ Nur 13 implementiert | 27 Block-Specs ohne Code |

---

## 6. Technische Schulden in der Dokumentation

| Schuld | Beschreibung | Impact |
|--------|--------------|--------|
| **Veraltete 01_Architecture/ Docs** | `BLOCK_SYSTEM_ARCHITECTURE.md` §13 sagt „Browser Implementation: Nicht Bestandteil" — widerspricht `block_browser_embed.md` und dem existierenden Code | Führt zu Architektur-Entscheidungen auf Basis falscher Annahmen |
| **Spec-Friedhof** | 40+ Block-Specs in `docs/domains/pages/blocks/`, nie in Registry oder Feature-Specs übernommen | Neue Entwickler finden nicht heraus, was wirklich geplant ist |
| **Dubletten in den Specs** | `block_embed.md` und `block_browser_embed.md` überschneiden sich funktional | Unklare Verantwortlichkeiten; was gehört wohin? |
| **Fehlende Querverweise** | `block_browser_embed.md` verweist nicht auf `RESEARCH_WORKSPACE_ARCHITECTURE.md` und umgekehrt | Silo-Dokumentation |
| **pages.feature.md ≠ Realität** | Feature-Spec sagt MVP (6 Typen), Code hat 13 Typen, Block-Specs haben 40+ | Feature-Spec ist nicht mehr aktuell |
| **Keine Block-Registry als Single Source of Truth** | Drei verschiedene Listen (.md §4, Redesign-Plan Z.448, Code) | Keine Autorität für "welche Blöcke gibt es?" |

---

## 7. Architektur-Diagramm der Widersprüche

```
         RESEARCH_WORKSPACE_ARCHITECTURE.md
         ┌─────────────────────────────────────┐
         │ Browser = austauschbare UI           │
         │ Browser-Tabs ∈ Research Session      │
         │ Non-Goal: Webbrowser                 │
         └──────────┬──────────────────────────┘
                    │ §8 widerspricht
                    ▼
         block_browser_embed.md
         ┌─────────────────────────────────────┐
         │ browser_embed = Page Block           │
         │ Navigation, Back, Forward, Address   │
         │ Sandbox, Isolated Storage            │
         └──────────┬──────────────────────────┘
                    │ nie in Registry
                    ▼
         Existierender Code
         ┌─────────────────────────────────────┐
         │ browser.controller.ts (Proxy)        │
         │ browser_tabs → research_sessions     │
         │ ❌ Kein Block, kein Frontend         │
         └─────────────────────────────────────┘

         Embed-Überschneidung:
         block_embed.md ← → block_browser_embed.md
         "Any embeddable website"   "aktives Browsen"
```

---

## 8. Empfohlene neue Dokumente

| Priorität | Dokument | Begründung |
|-----------|----------|------------|
| 🔴 P1 | `docs/adr/ADR-BROWSER-MODELL.md` | Architekturentscheidung: Ist der Browser ein Block-Typ, Research-Komponente oder separater Service? Diese Entscheidung ist Voraussetzung für alle anderen Doku-Aufgaben. |
| 🔴 P1 | `docs/domains/pages/pages_block_registry.md` | Single Source of Truth für alle Block-Typen. Einzige autoritative Liste. Ersetzt §4 in BLOCK_SYSTEM_ARCHITECTURE.md und Z.448 in PAGES_NOTION_REDESIGN_PLAN.md. |
| 🟡 P2 | `docs/01_Architecture/BROWSER_ARCHITECTURE.md` (neu) oder Update von `block_browser_embed.md` | Vollständige Browser-Architektur: Session-Modell, Cookie-Isolation, Tab-Management, Proxy-Details, Security-Konzept |
| 🟡 P2 | `features/pages.feature.md` Update | Feature-Spec auf aktuellen Stand bringen: alle 13+ Block-Typen, Browser-Proxiy-API, Research-Sessions |
| 🟢 P3 | `docs/domains/pages/blocks/block_embed_vs_browser.md` | Abgrenzungsdokument: Wann embed, wann browser_embed? |

---

## 9. Priorisierte Doku-Aufgaben

### Phase 1 (Sofort)

| # | Aufgabe | Wer | Aufwand |
|---|---------|-----|---------|
| 1 | **Architekturentscheidung treffen:** Browser-Modell festlegen (Block, Research-Komponente oder Service) und als ADR dokumentieren | Architekt | 2h |
| 2 | **Block-Registry erstellen** als `pages_block_registry.md`, alle 40+ Specs sichten, nur geplante aufnehmen | Doku | 4h |

### Phase 2 (Nach ADR)

| # | Aufgabe | Wer | Aufwand |
|---|---------|-----|---------|
| 3 | **BLOCK_SYSTEM_ARCHITECTURE.md §4 aktualisieren** — Block-Liste an Registry angleichen | Doku | 1h |
| 4 | **PAGES_NOTION_REDESIGN_PLAN.md Block-Registry (Z.448–463) ersetzen** — Verweis auf Registry statt eigener Liste | Doku | 0.5h |
| 5 | **Entweder block_browser_embed.md finalisieren** (wenn Block-Modell) **oder deprecated markieren** (wenn Research-Komponente) | Doku | 1h |
| 6 | **RESEARCH_WORKSPACE_ARCHITECTURE.md mit Browser-Integration aktualisieren** — Klarstellen ob Block oder Tab-Manager | Doku | 2h |

### Phase 3 (Verbesserung)

| # | Aufgabe | Wer | Aufwand |
|---|---------|-----|---------|
| 7 | **embed vs. browser_embed Abgrenzung dokumentieren** (block_embed.md + block_browser_embed.md aktualisieren) | Doku | 1h |
| 8 | **pages.feature.md auf aktuellen Stand bringen** — alle Block-Typen + Browser-API-Endpoints | Doku + Dev | 3h |
| 9 | **pages.AGENTS.md Scope erweitern** — Block-Typen und Browser erwähnen | Doku | 0.5h |
| 10 | **Browser-Controller-API dokumentieren** (Endpoints, Request/Response) | Dev | 2h |
| 11 | **Nicht mehr gültige Block-Specs aus docs/domains/pages/blocks/ entfernen oder als „Entwurf" markieren** | Doku | 2h |

---

## 10. Zusammenfassung

**Kernerkenntnis:** Die Browser-Dokumentation leidet unter einem fundamentalen Architektur-Konflikt:

1. **`block_browser_embed.md`** entwirft einen vollwertigen Browser-Block-Typ für Pages
2. **`RESEARCH_WORKSPACE_ARCHITECTURE.md`** §8 sagt explizit: Browser ist **keine Architektur**, nur austauschbare UI
3. **Der existierende Code** (Puppeteer-Proxy + `browser_tabs`-Tabelle) implementiert etwas Drittes: einen Backend-Proxy mit Tab-Manager, der an Research-Sessions hängt

Die Block-Spec-Abteilung (`docs/domains/pages/blocks/`) hat **40+ Block-Specs** produziert, von denen nur ein Bruchteil in offiziellen Registern oder im Code existiert. Die 01_Architecture-Dokumente wurden nicht nachgeführt. Das führt zu einem Wildwuchs an unbeaufsichtigten Specs.

**Dringendste Maßnahme:** Architekturentscheidung per ADR — Browser als Block-Typ oder als Research-Workspace-Komponente? Erst dann können alle anderen Doku-Widersprüche aufgelöst werden.

**Zweitdringendste Maßnahme:** Eine einzelne, autoritative Block-Registry-Datei einführen, die alle existierenden Specs konsolidiert und als Single Source of Truth dient.
