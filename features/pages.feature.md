# PAGES FEATURE

## Goal
A page builder that replaces per-domain UIs with a universal, block-based document system.

---

## Features

- page CRUD (create, edit, delete, soft-delete)
- hierarchical pages (parent → children → tree)
- block-based content: heading, text/markdown, image, gallery, file-list
- TipTap rich-text editor for text blocks
- image/gallery integration with media domain
- file-list integration with storage domain
- drag & drop block reordering
- page-level permissions (owner-based, share-ready)
- page icons (emoji) + cover images
- built-in cover gallery: 12 real photos (Berge, See, Wald, Strand, Stadt, Nordlicht, …) + 16 gradient covers, stored as `builtin:<id>` in `cover_media_id`
- cover picker with tabs: Standard (built-in photos + gradients) / Eigene Medien (media library)
- tab content scrolls independently (`overflow-y-auto` + `overscroll-contain` — wheel over a tab scrolls only that tab, not the whole page)

---

## Entities

- Page
- PageBlock

---

## Block Types (MVP)

| Type | Content |
|------|---------|
| `heading` | { level: 1-6, text: string } |
| `text` | TipTap JSON (ProseMirror document) |
| `image` | { mediaId: uuid, caption?: string } |
| `gallery` | { mediaIds: uuid[], layout: 'grid' \| 'masonry' } |
| `file-list` | { files: [{ name, path, size, mimeType }] } |
| `divider` | {} |

---

## API

```
POST   /api/v1/pages
GET    /api/v1/pages
GET    /api/v1/pages/:id
PUT    /api/v1/pages/:id
DELETE /api/v1/pages/:id
POST   /api/v1/pages/:id/blocks
PUT    /api/v1/pages/:id/blocks/:blockId
DELETE /api/v1/pages/:id/blocks/:blockId
PUT    /api/v1/pages/:id/blocks/reorder
```

---

## Rules

- Pages are private by default (owner only)
- No cross-domain DB access — blocks store mediaIds as references only
- Existing domains remain untouched during Phase 1
- Block content is JSONB — type-specific validation via zod

---

## Integrations

- media domain (image + gallery blocks → mediaId refs)
- storage domain (file-list block → file path refs)
- search domain (Phase 2)
