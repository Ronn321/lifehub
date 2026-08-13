-- 0009_media_baseline.sql
-- Media-Domain Basis-Tabellen (Phase 1).
-- Fehlte in der Migrationskette: 0009_media_schema_drift_fix.sql setzt
-- media_files/media_sources voraus, aber keine frühere Migration legte sie an.
-- Dadurch brach der Migration-Runner ab und alle neueren Migrationen
-- (0009_pages_slugs_browser, 0010-0013) wurden nie angewendet.
-- Alle Statements idempotent (IF NOT EXISTS).

-- ===================== media_sources =====================
CREATE TABLE IF NOT EXISTS media_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES users(id),
  name text NOT NULL,
  type text NOT NULL DEFAULT 'local', -- nas_path, windows_path, s3, upload_temp
  path text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  auto_index boolean NOT NULL DEFAULT false,
  last_indexed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE INDEX IF NOT EXISTS media_sources_owner_idx ON media_sources(owner_id, is_active);

-- ===================== media_files =====================
CREATE TABLE IF NOT EXISTS media_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES users(id),
  source_id uuid NOT NULL REFERENCES media_sources(id),
  filename text NOT NULL,
  relative_path text NOT NULL,
  mime_type text NOT NULL,
  file_size bigint,
  width bigint,
  height bigint,
  duration bigint,
  exif_data jsonb,
  gps_lat text,
  gps_lng text,
  taken_at timestamptz,
  thumbnail_path text,
  blur_hash text,
  is_favorite boolean NOT NULL DEFAULT false,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE INDEX IF NOT EXISTS media_files_source_idx ON media_files(source_id, relative_path);
CREATE INDEX IF NOT EXISTS media_files_taken_idx ON media_files(taken_at);
CREATE INDEX IF NOT EXISTS media_files_gps_idx ON media_files(gps_lat, gps_lng);
CREATE INDEX IF NOT EXISTS media_files_owner_idx ON media_files(owner_id, deleted_at);

-- ===================== albums =====================
CREATE TABLE IF NOT EXISTS albums (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES users(id),
  name text NOT NULL,
  description text,
  type text NOT NULL DEFAULT 'standard',
  cover_media_id uuid REFERENCES media_files(id),
  is_shared boolean NOT NULL DEFAULT false,
  sort_order bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE INDEX IF NOT EXISTS albums_owner_idx ON albums(owner_id, deleted_at);

-- ===================== album_items =====================
CREATE TABLE IF NOT EXISTS album_items (
  album_id uuid NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
  media_id uuid NOT NULL REFERENCES media_files(id) ON DELETE CASCADE,
  sort_order bigint NOT NULL DEFAULT 0,
  added_by uuid REFERENCES users(id),
  added_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS album_items_uq ON album_items(album_id, media_id);
CREATE INDEX IF NOT EXISTS album_items_album_idx ON album_items(album_id);

-- ===================== media_tags =====================
CREATE TABLE IF NOT EXISTS media_tags (
  media_id uuid NOT NULL REFERENCES media_files(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  added_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS media_tags_uq ON media_tags(media_id, tag_id);
