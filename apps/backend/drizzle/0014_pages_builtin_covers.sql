-- Built-in cover images for pages (Notion-style).
-- pages.cover_media_id switches from UUID-only to TEXT so 'builtin:<id>' values are allowed.
-- Existing UUID values remain valid (column has no FK constraint).

ALTER TABLE pages ALTER COLUMN cover_media_id TYPE TEXT;
