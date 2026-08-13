# pages.AGENTS.md

# LifeHub — `pages` Domain DOX Contract

Version: 1.0
Parent: `../AGENTS.md` → `../../AGENTS.md`

---

## 1. Purpose

Block-basiertes Seitensystem, das langfristig als universelle Darstellungsebene für alle LifeHub-Inhalte dient. Phase: nach allen 16 Domains, als 17. Domain.

## 2. Scope

- Schema `public`: `pages`, `page_blocks`
- Hierarchische Seiten (parentId → Tree)
- Block-Typen: heading, text (TipTap), image, gallery, file-list, divider
- Drag&Drop-Reorder, JSONB-Speicher für Block-Content
- TipTap (ProseMirror) als Rich-Text-Engine
- Parallel zu bestehenden Domains — keine Migration, keine Änderung an bestehenden Domains

## 3. Dependencies

- Spec: `pages.feature.md`
- DB: `docs/04_Database/DATABASE_SCHEMA.md`
- Architektur: `docs/01_Architecture/ARCHITECTURE.md` §4, `docs/01_Architecture/PAGE_SYSTEM_VISION.md`
- Stack: `docs/06_Deployment/TECH_STACK.md` §2.3 (UI), `UI_UX.md` (TipTap-Editor-Komponente)
- Status: `docs/05_Development/DOMAIN_STATUS.md`
- Media-Domain (image/gallery blocks → mediaId)
- Storage-Domain (file-list blocks)
- Extern: `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-image`

## 4. Work Guidance

- Vertical Slice: Entity → Schema → Repository → Service → Controller → Module → Frontend → Permissions → Tests → Events
- Image-Blocks speichern nur `mediaId` — Media-URLs werden serverseitig aufgelöst
- Gallery-Blocks speichern `mediaIds[]` — Frontend rendert über Media-Domain-API
- TipTap-Editor speichert als JSON (TipTap's `editor.getJSON()`) — direkt in JSONB-Spalte
- Block-Reihenfolge via `sortOrder` Integer — Reorder-API aktualisiert alle Positionen in einem Request
- Parent-Child-Hierarchy: root pages haben `parentId = null`, Children werden als Tree ausgeliefert
- Soft-Delete: `deletedAt` auf Page-Ebene, Blocks werden mit Page gelöscht (CASCADE)
- `GET /pages/:id` akzeptiert sowohl UUID als auch Slug (Regex-Check im Controller, Fallback auf `getPageBySlug`). Clean URLs wie `/pages/barcelona` funktionieren damit ohne `by-slug`-Prefix — Fix für 500 `invalid input syntax for type uuid`

## 5. Verification

- [ ] Migration idempotent (`page_blocks` ON DELETE CASCADE zu `pages`)
- [ ] Page CRUD + Tree-Ausgabe (GET /pages gibt verschachteltes JSON)
- [ ] Block CRUD: hinzufügen, bearbeiten, löschen, umordnen
- [ ] TipTap-Rendering: Text-Block mit Formatting (bold, italic, headers, lists)
- [ ] Image-Block: Media-Integration (Auswahl aus Media-Liste, Anzeige)
- [ ] Gallery-Block: Mehrfachauswahl aus Media, Grid-Darstellung
- [ ] File-List-Block: Datei-Referenzen anzeigen
- [ ] Permission + Audit + Events (`PageCreated`, `PageUpdated`)
- [ ] `docs/05_Development/DOMAIN_STATUS.md` auf `DONE`
