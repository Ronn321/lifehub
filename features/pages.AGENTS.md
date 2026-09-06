# pages.AGENTS.md

# LifeHub — `pages` Domain DOX Contract

Version: 2.0
Parent: `../AGENTS.md` → `../../AGENTS.md`

---

## 1. Purpose

Block-basiertes Seitensystem im Notion-Stil (BlockNote-Editor) als universelle Darstellungsebene für alle LifeHub-Inhalte. Status: IMPLEMENTED.

## 2. Scope

- Schema `public`: `pages` (inkl. `content` JSONB = BlockNote-Doc), `page_blocks` (Legacy, bleibt), `page_versions` (inkl. `doc` JSONB), `page_relations`, `page_templates`, `page_pins`, `research_*`, `browser_*`
- Hierarchische Seiten (parentId → Tree, Slugs für Clean URLs `/pages/<slug|uuid>`)
- Editor: BlockNote (`@blocknote/core|react|mantine`, React 18, Mantine 7 gebündelt) mit LifeHub-Custom-Blocks (`components/editor/lifehubBlocks.tsx`): browserEmbed, researchWorkspace, lifehubImage, gallery, lifehubTable, bookmark, lifehubEmbed, lifehubVideo, lifehubFile, map, pageReference, search, timeline, toggle, callout, divider
- Slash-Menü mit deutschen LifeHub-Einträgen, Drag&Drop/Undo/Redo/Inline-Toolbar nativ durch BlockNote
- Editierbarer Seitentitel (debounced Autosave) in `PageHeader.tsx`
- Detail-Route: `apps/frontend/src/app/(dashboard)/pages/[slug]/page.tsx` (UUID oder Slug); Übersicht in `pages/page.tsx` (Baum mit Einklappen, Suche, Pins; `?new=true`/`?manage-pins=true` aus der Sidebar)

## 3. Inhaltsmodell (Doc-First, seit 2026-09)

- **`pages.content`** (JSONB) = BlockNote-Doc (Array von Block-Objekten) — DIE Inhaltsquelle
- Legacy-Seiten: `content` NULL → Synthese aus `page_blocks` beim ersten Lesen (`PagesService.resolveDoc`, persist-on-read); Konvertierung in `domains/pages/src/services/pages-doc.ts` (`legacyBlocksToDoc`)
- Speichern: `PUT /pages/:id/doc` { doc } (Editor-Autosave, 800ms debounce). Version-Snapshot ist ratenlimitiert (<5min → letzter Snapshot wird aktualisiert)
- Suche: `pages.content` via `jsonb_path_query_array(content, 'lax $.**.text')` + Legacy-Blocks (`pages.repository.ts.searchPages`)
- Markdown-Export: aus dem Doc (`docToMarkdown`); Legacy-Fallback für alte Seiten
- Restore: Versionen mit `doc` schreiben direkt `pages.content` zurück; Legacy-Versionen über Block-Restore
- BlockNote-Custom-Block-Props sind Primitive; komplexe Werte (gallery.mediaIds, lifehubTable.data, timeline.entries, researchWorkspace.data) als JSON-Strings
- Tote Widget-Blöcke (calendar_view, finance_widget, it_inventory_widget, jellyfin_player) werden bei der Migration als Absatz mit Text-Rettung abgebildet (keine Custom-Specs mehr)

## 4. Dependencies

- Spec: `pages.feature.md`
- DB: `docs/04_Database/DATABASE_SCHEMA.md`, Migration `apps/backend/drizzle/0023_pages_doc.sql`
- Architektur: `docs/01_Architecture/ARCHITECTURE.md` §4, `PAGE_SYSTEM_VISION.md`, `BLOCK_SYSTEM_ARCHITECTURE.md`
- Browser-Block: `docs/01_Architecture/BROWSER_BLOCK_ARCHITECTURE.md` (Ist-Architektur)
- Media-Domain (image/gallery → mediaId; Media-URLs client-seitig via `mediaFileUrl()` in `lib/api.ts` mit `?token=` — keine localStorage-Scrapes in Komponenten)
- Extern: `@blocknote/core`, `@blocknote/react`, `@blocknote/mantine` (0.31.x — API: `createReactBlockSpec`/`filterSuggestionItems` aus core bzw. react, siehe lifehubBlocks.tsx Imports)

## 5. Work Guidance

- Editor-Änderungen: Custom-Blocks in `editor/lifehubBlocks.tsx` (Hooks nur in benannten View-Komponenten, nicht in `render`-Callbacks — eslint rules-of-hooks), Schema in `editor/LifehubEditor.tsx`
- Neue Blocktypen: 1) pages-doc.ts Migration + 2) createReactBlockSpec + 3) Schema-Eintrag in LifehubEditor + 4) Slash-Menü-Item
- Backend-Doc-Zugriff immer über `PagesService` (`resolveDoc`, `updatePageDoc`) — niemals `pages.content` direkt in Controllern
- Block-Content JSONB bleibt schemafrei (z.record(z.unknown())); kein per-Type-zod (Abweichung von feature.md bewusst: Editor validiert strukturell)
- Vertical Slice-Reihenfolge wie Root-AGENTS.md §6.1; Soft-Delete auf Page-Ebene (blocks CASCADE)

## 6. Verification

- [ ] `pnpm --filter @lifehub/pages-domain test` grün (pages-doc.spec.ts: Migration, Suche-Text, Markdown-Export)
- [ ] `pnpm --filter @lifehub/frontend typecheck` grün
- [ ] Migration 0023 idempotent; Legacy-Seite öffnen → Doc synthetisiert (einmalig), Suche/Export greifen
- [ ] Editor: Slash-Menü, Custom-Blocks (Browser/Bild/Galerie/Tabelle/Lesezeichen), Titel-Autosave, Version-Restore lädt neues Doc
- [ ] `docs/05_Development/DOMAIN_STATUS.md` Status aktuell
