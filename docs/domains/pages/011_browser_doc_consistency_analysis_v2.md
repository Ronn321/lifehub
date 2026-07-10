# Browser-Dokumentation: Konsistenz- und Architekturanalyse v2

Analyse erstellt: 2026-07-10  
Status: Aktualisierte Analyse (ersetzt `010_browser_doc_consistency_analysis.md`)  
Scope: 13 Markdown-Dokumente + existierender Code (BlockRegistry, ResearchWorkspaceBlock, BrowserController, DB-Migrationen)

---

## 1. Dokumenten-Übersicht und Status

| # | Dokument | Pfad | Status | Browser-Erwähnung |
|---|----------|------|--------|-------------------|
| 1 | `block_browser_embed.md` | `docs/domains/pages/blocks/` | 🔴 **Spec ohne Code** | Vollständiger Block-Entwurf (`browser_embed`) |
| 2 | `RESEARCH_WORKSPACE_ARCHITECTURE.md` | `docs/01_Architecture/` | 🟡 **Veraltet** | §8: Browser nur UI, §14: Non-Goal Webbrowser |
| 3 | `BLOCK_SYSTEM_ARCHITECTURE.md` | `docs/01_Architecture/` | 🟡 **Veraltet** | §13: "Nicht Bestandteil" |
| 4 | `PAGE_ARCHITECTURE.md` | `docs/01_Architecture/` | 🟡 **Lückenhaft** | §16: Nur ResearchWorkspaceBlock, kein Browser-Detail |
| 5 | `PAGES_NOTION_REDESIGN_PLAN.md` | `docs/01_Architecture/` | 🟡 **Lückenhaft** | ❌ Keine Erwähnung |
| 6 | `pages_overview.md` | `docs/domains/pages/` | 🟡 **Veraltet** | Phase 4: "browser, maps, plugins" |
| 7 | `pages.feature.md` | `features/` | 🔴 **Veraltet (MVP)** | ❌ Keine Erwähnung |
| 8 | `pages.AGENTS.md` | `features/` | 🔴 **Veraltet (MVP)** | ❌ Keine Erwähnung |
| 9 | `block_embed.md` | `docs/domains/pages/blocks/` | 🟡 **Überlappend** | Überschneidung mit browser_embed |
| 10 | `pages_block_registry.md` | `docs/domains/pages/` | 🔴 **Falsch** | Listet browser_embed als Advanced Block — existiert nicht im Code |
| 11 | `pages_block_system.md` | `docs/domains/pages/` | 🔴 **Falsch** | Listet browser_embed als Advanced Block — existiert nicht im Code |
| 12 | `pages_data_model.md` | `docs/domains/pages/` | 🔴 **Unvollständig** | Fehlende research_sessions, browser_tabs, research_sources Tabellen |
| 13 | `pages_api_spec.md` | `docs/domains/pages/` | 🔴 **Unvollständig** | Keine Browser/Research-API |

### Code-Realität (2026-07-10)

| Komponente | Pfad | Status |
|------------|------|--------|
| `BrowserController` | `domains/pages/src/api/browser.controller.ts` | ✅ Implementiert (Proxy + Screenshot) |
| `browser_tabs`-Tabelle | `apps/backend/drizzle/0009_pages_slugs_browser.sql` | ✅ Migration existiert |
| `research_sessions`-Tabelle | `apps/backend/drizzle/0008_pages_architecture_extension.sql` | ✅ Migration existiert |
| `research_sources`-Tabelle | (gleiche Migration) | ✅ Migration existiert |
| `research_collections`-Tabelle | (gleiche Migration) | ✅ Migration existiert |
| `ResearchWorkspaceBlock.tsx` | `apps/frontend/.../blocks/ResearchWorkspaceBlock.tsx` | ✅ Vollständige Frontend-Komponente |
| `blockRegistry.ts` | `apps/frontend/src/lib/blockRegistry.ts` | ✅ 27 Block-Typen registriert (KEIN `browser_embed`) |
| `browser_embed`-Block-Typ | ❌ Nirgends | ❌ Existiert nicht als Block-Komponente |
| Backend API: Research Sessions | `pages.controller.ts` Zeilen ~350-448 | ✅ Vollständige CRUD-Endpoints |
| Backend API: Browser Tabs | `pages.controller.ts` Zeilen 416-447 | ✅ Vollständige CRUD + Activate |

---

## 2. Identifizierte Widersprüche

### 🔴 A: RESEARCH_WORKSPACE_ARCHITECTURE.md §8 vs. Code-Realität

| Quelle | Aussage |
|--------|---------|
| `RESEARCH_WORKSPACE_ARCHITECTURE.md` §8 | "Der Browser ist nur eine UI-Komponente. Er ist nicht Teil der Architektur. Er ist austauschbar." |
| Code: BrowserController | Vollständiger Backend-Proxy (Puppeteer/Browserless) mit GET/POST/Screenshot |
| Code: browser_tabs-Tabelle | DB-Tabelle mit FK → research_sessions |
| Code: ResearchWorkspaceBlock | Vollständige Frontend-Komponente mit Tab-Manager, Adressleiste, Navigation |
| Code: blockRegistry.ts | `research_workspace` als registrierter Block-Typ |

**Problem:** Der Browser ist tief in der Architektur verankert — eigener Controller, eigene DB-Tabelle, vollständige Frontend-Komponente, registrierter Block-Typ. Die Aussage "nur UI, austauschbar" ist falsch und irreführend.

---

### 🔴 B: block_browser_embed.md vs. Code vs. Architektur (DREI konkurrierende Modelle)

**Modell 1 — Block-Modell (block_browser_embed.md):**
- `browser_embed` ist ein eigenständiger Block-Typ im Pages-Block-System
- Data Structure: `{type: "browser_embed", content: {url, title}, props: {height, allow_navigation}}`
- Enthaltene Features: Navigation (Back/Forward/Reload), Address Bar, Zoom

**Modell 2 — Research-Workspace-Modell (Code-Realität):**
- Browser ist Sub-Komponente des `research_workspace`-Blocks
- Browser-Tabs → `research_sessions` (FK in DB)
- BrowserController als Backend-Proxy für iframe-Einbettung
- Features: Tab-Management, Adressleiste, Navigation, "Als Quelle pinnen"

**Modell 3 — Austauschbarkeits-Modell (RESEARCH_WORKSPACE_ARCHITECTURE.md §8):**
- Browser ist nur UI, kein Architektur-Bestandteil
- "Er ist austauschbar"

**Konsequenz:** Drei widersprüchliche Modelle ohne klare Entscheidung. Der Code folgt Modell 2, die Doku propagiert Modell 1 und 3 gleichzeitig.

---

### 🔴 C: Drei offizielle Block-Listen — keine enthält Code-korrekte Typen

| Quelle | Block-Typen | browser_embed | research_workspace |
|--------|------------|:---:|:---:|
| `BLOCK_SYSTEM_ARCHITECTURE.md` §4 | 16 (Core/System/Future) | ❌ | ✅ (Future) |
| `pages_block_registry.md` | ~25 (Basic/Structural/Media/Data/Advanced) | ✅ | ❌ |
| `pages_block_system.md` | ~20 (Basic/Structural/Media/Data/Advanced) | ✅ | ❌ |
| `blockRegistry.ts` (Code) | **27 Typen** (Basis/Medien/Struktur/Widgets) | ❌ | ✅ |
| `PAGES_NOTION_REDESIGN_PLAN.md` | 13 Typen | ❌ | ❌ |

**Problem:** Jede Liste ist anders. Keine entspricht der Code-Realität. `browser_embed` wird in zwei Doku-Listen geführt, existiert aber nicht im Code. `research_workspace` existiert im Code, fehlt aber in zwei Doku-Listen.

---

### 🟡 D: embed vs. browser_embed — funktionale Überschneidung

| Aspekt | `block_embed.md` | `block_browser_embed.md` |
|--------|------------------|--------------------------|
| Content | `{url, provider}` | `{url, title}` |
| Props | `{height, interactive}` | `{height, allow_navigation}` |
| Rendering | iframe / native / provider-specific | "embedded browser component" |
| Navigation | ❌ Keine (nur Reload) | Back, Forward, Reload, Address Bar |
| Sicherheit | Sandbox, keine Cookies, CSP | Sandbox, isolated storage |
| Future | "**live websites**" | "tabs, split view, bookmarks" |

**Problem:** `block_embed.md` sagt "Any embeddable website" + Future "live websites" — das schneidet sich funktional mit dem Browser-Block. **Code-Realität:** `research_workspace`-Block mit iframe-Proxy löst das Problem auf seine eigene Weise.

---

### 🟡 E: BLOCK_SYSTEM_ARCHITECTURE.md §13

"Ausgeschlossen: Browser Implementation" — aber der Code hat einen vollständigen BrowserController und browser_tabs-Tabelle. Die Aussage ist eindeutig falsch.

---

### 🟡 F: RESEARCH_WORKSPACE_ARCHITECTURE.md §14 Non-Goals

"Nicht: Webbrowser" — aber der ResearchWorkspaceBlock hat einen voll funktionsfähigen eingebetteten Browser mit Navigation, Tab-Management und Proxy.

---

### 🟡 G: pages_overview.md Phase 4

Browser, maps, plugins kommen laut Phasenplan in Phase 4. Der Browser ist aber bereits implementiert (Phase 2/3). Der Phasenplan ist nicht aktualisiert.

---

## 3. Fehlende Spezifikationen

### 🔴 Kritisch

| Fehlende Spec | Betroffene Dateien | Problem |
|---------------|-------------------|---------|
| **Browser-Modell-ADR** | alle | Keine verbindliche Entscheidung: Block? Research-Komponente? Service? |
| **BrowserController-API-Doku** | `pages_api_spec.md` | Proxy (GET/POST), Screenshot-Endpoints nirgendwo dokumentiert |
| **Browserless-Integration** | (keine) | Chrome-URL, Token, Reject-Resource-Types, CSP-Konfiguration nicht dokumentiert |
| **browser_tabs-Datenmodell** | `pages_data_model.md` | Tabelle (url, title, favicon, is_active, sort_order, FK → research_sessions) fehlt |

### 🟡 Hoch

| Fehlende Spec | Betroffene Dateien |
|---------------|-------------------|
| **Research-Sessions-API** | `pages_api_spec.md` — Sessions CRUD, Sources CRUD, Collections CRUD |
| **Research Sessions-Datenmodell** | `pages_data_model.md` — research_sessions, research_sources, research_collections |
| **Browser-Tab-API** | `pages_api_spec.md` — Tab CRUD + Activate |
| **Cookie- und Storage-Isolation** | `block_browser_embed.md` — "isolated storage" undefiniert |
| **Bookmark-/Lesezeichen-Datenmodell** | `block_browser_embed.md` Future — kein Datenmodell |

### 🟢 Niedrig

| Fehlende Spec | Beschreibung |
|---------------|--------------|
| **Research History** | Verlaufsspeicherung pro Session |
| **Annotation / Web Clipping** | Markierungs-Features |
| **Split View / Tab Groups** | Multi-Browser-Layout |

---

## 4. Duplikate und Überlappungen

| Duplikat | Beschreibung |
|----------|--------------|
| **embed ↔ browser_embed** | Beide: URL-basierte Einbettung, iframe, Sandbox. Abgrenzung unscharf. Code löst mit research_workspace + iframe-Proxy. |
| **Drei Block-Klassifikationen** | `BLOCK_SYSTEM_ARCHITECTURE.md` §4 (Core/System/Future) vs. `pages_block_registry.md` (Basic/Structural/Media/Data/Advanced) vs. `blockRegistry.ts` (Basis/Medien/Struktur/Widgets) |
| **Rendering Pipeline × 4** | `BLOCK_SYSTEM_ARCHITECTURE.md` §6, `PAGE_ARCHITECTURE.md` §6, `pages_block_system.md` — alle nahezu identisch |
| **Block-Datenstruktur × 4** | `block_browser_embed.md`, `pages_data_model.md`, `pages_block_system.md`, `BLOCK_SYSTEM_ARCHITECTURE.md` §8 |
| **features/ Specs vs. docs/domains/pages/blocks/ Specs** | `pages.feature.md` listet 6 MVP-Typen, aber `docs/domains/pages/blocks/` enthält 40+ Specs |

---

## 5. Lücken zwischen Zielarchitektur und Code

| Ziel (Doku) | Code-Realität | Lücke |
|-------------|--------------|-------|
| `browser_embed` als Page-Block | ❌ Nicht als Block implementiert | Doku sagt Block, Code sagt research_workspace-Subkomponente |
| ResearchWorkspaceBlock | ✅ Implementiert in TSX | RESEARCH_WORKSPACE_ARCHITECTURE.md §5 Block-Definition weicht ab |
| Browser mit Navigation (Back/Forward/Reload/Address Bar) | ✅ Vollständig im ResearchWorkspaceBlock | block_browser_embed.md ist anders strukturiert |
| Isolierte Storage (Sandbox, keine Cookies) | ⚠️ CSP: "unsafe-inline' https: http: data: blob:" — sehr permissiv | Keine echte Isolation |
| Tabs als Teil der Research Session | ✅ `browser_tabs`-Tabelle mit FK | Aber Doku definiert Tab als Teil eines `browser_embed`-Blocks |
| 16 Block-Typen in BLOCK_SYSTEM_ARCHITECTURE.md | ✅ 27 im Code-Registry | Beide Listen inkonsistent |
| 40+ Block-Spec-Dateien in `docs/domains/pages/blocks/` | ❌ Nur 27 im Code-Registry | 13+ Specs ohne Code |

---

## 6. Technische Schulden in der Dokumentation

| Schuld | Beschreibung | Impact |
|--------|--------------|--------|
| **Veraltete 01_Architecture/ Docs** | `BLOCK_SYSTEM_ARCHITECTURE.md` §13 sagt "Browser: Nicht Bestandteil" — falsch laut Code | Fehlleitende Architektur-Entscheidungen |
| **Spec-Friedhof** | 40+ Block-Specs in `docs/domains/pages/blocks/`, nie ins Code-Registry übernommen | Neue Entwickler finden nicht, was wirklich existiert |
| **Vorherige Analyse (010) veraltet** | Sagt "Kein ResearchWorkspaceBlock-Frontend" — existiert aber | Vertrauensverlust in die Doku |
| **Dubletten in Specs** | embed ↔ browser_embed überlappen funktional | Unklare Verantwortlichkeiten |
| **Fehlende Querverweise** | `block_browser_embed.md` ↔ `RESEARCH_WORKSPACE_ARCHITECTURE.md` — keine Verweise | Silo-Dokumentation |
| **pages.feature.md ≠ Realität** | Feature-Spec (6 Typen) vs. Code (27 Typen) | Feature-Spec nicht mehr aktuell |
| **Keine Block-Registry als Single Source of Truth** | Vier verschiedene Listen, keine autoritative | Niemand weiß, welche Blöcke es gibt |
| `010_browser_doc_consistency_analysis.md` selbst veraltet | Erstellt 2026-07-09, bereits 1 Tag später mit Code-Stand nicht mehr aktuell | Enthält falsche Aussagen (z.B. "Kein ResearchWorkspaceBlock-Frontend") |

---

## 7. Architektur-Diagramm der Widersprüche

```
         RESEARCH_WORKSPACE_ARCHITECTURE.md
         ┌──────────────────────────────────────┐
         │ §8: Browser = austauschbare UI       │ ←── Widerspruch A
         │ §14: Non-Goal: Webbrowser            │ ←── Widerspruch F
         │ Browser-Tabs ∈ Research Session      │
         └──────────┬───────────────────────────┘
                    │ widerspricht
                    ▼
         block_browser_embed.md
         ┌──────────────────────────────────────┐
         │ browser_embed = eigenständiger Block  │ ←── Widerspruch B
         │ Navigation, Address Bar, Zoom         │
         └──────────┬───────────────────────────┘
                    │ nie im Code-Registry
                    ▼
         BLOCK_SYSTEM_ARCHITECTURE.md
         ┌──────────────────────────────────────┐
         │ §13: Browser: Nicht Bestandteil      │ ←── Widerspruch E
         │ §4: 16 Block-Typen (kein browser_embed)│
         └──────────┬───────────────────────────┘
                    │ alles widerspricht
                    ▼
         CODE-REALITÄT (2026-07-10)
         ┌──────────────────────────────────────┐
         │ BrowserController (Proxy + Screenshot)│
         │ browser_tabs → research_sessions (FK) │
         │ ResearchWorkspaceBlock (vollst. UI)   │
         │ blockRegistry: 27 Typen, KEIN browser │
         │              _embed                   │
         └──────────────────────────────────────┘

         Weitere Konflikte:
         block_embed.md ← → block_browser_embed.md  (Überschneidung)
         pages_block_registry.md (sagt browser_embed existiert)
         pages_block_system.md  (sagt browser_embed existiert)
         blockRegistry.ts       (sagt browser_embed existiert NICHT)
```

---

## 8. Priorisierte Doku-Aufgaben

### Phase 0 — Architekturentscheidung (sofort)

| # | Aufgabe | Wer | Aufwand |
|---|---------|-----|---------|
| **0** | **ADR: Browser-Modell festlegen** — Ist der Browser ein eigener Block (`browser_embed`), bleibt er Sub-Komponente von `research_workspace` (aktueller Code) oder wird ein separater Service? Diese Entscheidung ist Vorbedingung für alle anderen Aufgaben. | Architekt | 2h |

### Phase 1 — Basiskonsistenz (nach ADR)

| # | Aufgabe | Wer | Aufwand |
|---|---------|-----|---------|
| 1 | `block_browser_embed.md` an Code-Realität anpassen oder als deprecated markieren | Doku | 1h |
| 2 | `RESEARCH_WORKSPACE_ARCHITECTURE.md` §8 und §14 korrigieren (§8: Browser ist Architektur-Bestandteil; §14: Webbrowser ist doch Teil) | Doku | 1h |
| 3 | `BLOCK_SYSTEM_ARCHITECTURE.md` §13 aktualisieren (Browser ist Bestandteil) und §4 Block-Liste an Code angleichen | Doku | 1h |
| 4 | `pages_block_registry.md` + `pages_block_system.md` Block-Listen mit `blockRegistry.ts` abgleichen | Doku | 1h |
| 5 | `pages_data_model.md` um research_sessions, research_sources, research_collections, browser_tabs Tabellen ergänzen | Doku | 1.5h |

### Phase 2 — Inhaltliche Lücken

| # | Aufgabe | Wer | Aufwand |
|---|---------|-----|---------|
| 6 | `BrowserController`-API dokumentieren (Proxy GET/POST, Screenshot, Endpoints, Browserless-Integration) | Dev + Doku | 2h |
| 7 | `features/pages.feature.md` auf aktuellen Stand bringen: alle 27 Block-Typen, Research Sessions API, Browser Tabs API | Doku | 3h |
| 8 | `features/pages.AGENTS.md` Scope erweitern (aktuelle Block-Typen, Research/Browser) | Doku | 0.5h |
| 9 | `RESEARCH_WORKSPACE_ARCHITECTURE.md` komplett an Code angleichen (Tab-Management, Sessions, Sources API-Endpoints dokumentieren) | Doku | 2h |
| 10 | `pages_api_spec.md` um Research-Session-, Source-, Collection- und Browser-Tab-Endpoints erweitern | Doku | 2h |

### Phase 3 — Qualität und Konsolidierung

| # | Aufgabe | Wer | Aufwand |
|---|---------|-----|---------|
| 11 | Abgrenzung embed vs. browser_embed vs. research_workspace dokumentieren (`block_embed.md` + `block_browser_embed.md` aktualisieren) | Doku | 1h |
| 12 | `PAGES_NOTION_REDESIGN_PLAN.md` um Browser-Features ergänzen oder Verweis auf ResearchWorkspace | Doku | 1h |
| 13 | `pages_overview.md` Phasenplan aktualisieren (Browser ist implementiert, nicht Phase 4) | Doku | 0.5h |
| 14 | Nicht mehr gültige Block-Specs aus `docs/domains/pages/blocks/` sichten und entsorgen/als Entwurf markieren | Doku | 3h |
| 15 | Single Source of Truth für Block-Kategorien schaffen — `blockRegistry.ts` als Autorität, alle .md-Dateien verweisen darauf statt eigener Listen | Doku + Dev | 2h |
| 16 | `010_browser_doc_consistency_analysis.md` als veraltet markieren (Verweis auf diese v2) | Doku | 0.2h |

---

## 9. Zusammenfassung

**Kernerkenntnis:** Die Browser-Dokumentation leidet unter einem fundamentalen Architektur-Konflikt zwischen **drei konkurrierenden Modellen**:

1. **`block_browser_embed.md`** — entwirft einen eigenständigen `browser_embed`-Block-Typ
2. **`RESEARCH_WORKSPACE_ARCHITECTURE.md`** — sagt Browser ist "nur UI, austauschbar" und "Non-Goal Webbrowser"
3. **Der existierende Code** — implementiert den Browser als Sub-Komponente des `research_workspace`-Blocks mit eigenem Controller und eigener DB-Tabelle

**Die vorherige Analyse (`010_browser_doc_consistency_analysis.md`)** vom 2026-07-09 ist bereits einen Tag später veraltet. Sie behauptet fälschlich, es gäbe keinen ResearchWorkspaceBlock-Frontend — dieser existiert jedoch vollständig implementiert.

**Wichtigste Erkenntnisse:**
- **`browser_embed` existiert als Block-Typ weder im Code-Registry noch als Komponente** — die Doku (pages_block_registry.md, pages_block_system.md) lügt
- **Der Browser ist tief in der Architektur verankert** — Controller + DB + Frontend-Komponente + Registry-Eintrag
- **Browser-Controller-API ist nirgendwo dokumentiert** — Proxy, Screenshot, Browserless-Integration sind undocumented
- **Drei Block-Klassifikationen paralell** — keine stimmt mit dem Code überein
- **40+ Block-Specs in docs/domains/pages/blocks/** — nur ein Bruchteil ist im Code implementiert
- **`pages.feature.md` und `pages.AGENTS.md` sind massiv veraltet** — sie beschreiben den MVP-Zustand mit 6 Blöcken

**Dringendste Maßnahme:** Architekturentscheidung per ADR (Phase 0) — erst dann können alle anderen Widersprüche aufgelöst werden.
