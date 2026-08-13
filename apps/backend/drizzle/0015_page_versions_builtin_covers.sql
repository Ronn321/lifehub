-- Built-in cover images: page_versions.cover_media_id also switches to TEXT
-- so version snapshots can store 'builtin:<id>' values.

ALTER TABLE page_versions ALTER COLUMN cover_media_id TYPE TEXT;
