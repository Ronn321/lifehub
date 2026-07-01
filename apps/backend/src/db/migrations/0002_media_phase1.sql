-- Migration 0002: Media Domain (Phase 1)
-- media_sources, media_files, albums, album_items, media_tags

BEGIN;

-- ===================== media_sources =====================
CREATE TABLE IF NOT EXISTS public.media_sources (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id    uuid NOT NULL REFERENCES public.users(id),
  name        text NOT NULL,
  type        text NOT NULL DEFAULT 'local',
  path        text NOT NULL,
  is_active   boolean NOT NULL DEFAULT true,
  auto_index  boolean NOT NULL DEFAULT false,
  last_indexed_at timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  deleted_at  timestamptz
);
CREATE INDEX IF NOT EXISTS media_sources_owner_idx ON public.media_sources(owner_id, is_active);

-- ===================== media_files =====================
CREATE TABLE IF NOT EXISTS public.media_files (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id      uuid NOT NULL REFERENCES public.users(id),
  source_id     uuid NOT NULL REFERENCES public.media_sources(id),
  filename      text NOT NULL,
  relative_path text NOT NULL,
  mime_type     text NOT NULL,
  file_size     bigint,
  width         bigint,
  height        bigint,
  duration      bigint,
  exif_data     jsonb,
  gps_lat       text,
  gps_lng       text,
  taken_at      timestamptz,
  thumbnail_path text,
  blur_hash     text,
  is_favorite   boolean NOT NULL DEFAULT false,
  description   text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  deleted_at    timestamptz
);
CREATE INDEX IF NOT EXISTS media_files_source_idx ON public.media_files(source_id, relative_path);
CREATE INDEX IF NOT EXISTS media_files_taken_idx ON public.media_files(taken_at);
CREATE INDEX IF NOT EXISTS media_files_gps_idx ON public.media_files(gps_lat, gps_lng);
CREATE INDEX IF NOT EXISTS media_files_owner_idx ON public.media_files(owner_id) WHERE deleted_at IS NULL;

-- ===================== albums =====================
CREATE TABLE IF NOT EXISTS public.albums (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id      uuid NOT NULL REFERENCES public.users(id),
  name          text NOT NULL,
  description   text,
  type          text NOT NULL DEFAULT 'standard',
  cover_media_id uuid REFERENCES public.media_files(id),
  is_shared     boolean NOT NULL DEFAULT false,
  sort_order    bigint NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  deleted_at    timestamptz
);
CREATE INDEX IF NOT EXISTS albums_owner_idx ON public.albums(owner_id) WHERE deleted_at IS NULL;

-- ===================== album_items =====================
CREATE TABLE IF NOT EXISTS public.album_items (
  album_id  uuid NOT NULL REFERENCES public.albums(id) ON DELETE CASCADE,
  media_id  uuid NOT NULL REFERENCES public.media_files(id) ON DELETE CASCADE,
  sort_order bigint NOT NULL DEFAULT 0,
  added_by  uuid REFERENCES public.users(id),
  added_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (album_id, media_id)
);
CREATE INDEX IF NOT EXISTS album_items_album_idx ON public.album_items(album_id);

-- ===================== media_tags =====================
CREATE TABLE IF NOT EXISTS public.media_tags (
  media_id uuid NOT NULL REFERENCES public.media_files(id) ON DELETE CASCADE,
  tag_id   uuid NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  added_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (media_id, tag_id)
);

-- ===================== Permission-Seed für media-Domain =====================
INSERT INTO public.permissions (domain, action)
VALUES
  ('media', 'read'),
  ('media', 'write'),
  ('media', 'delete'),
  ('media', 'share'),
  ('media', 'download'),
  ('media', 'upload')
ON CONFLICT (domain, action) DO NOTHING;

-- Admin-Rolle bekommt alle media-Permissions
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'admin'
  AND p.domain = 'media'
  AND NOT EXISTS (
    SELECT 1 FROM public.role_permissions rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

-- Familie bekommt read + upload
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.domain = 'media' AND p.action IN ('read', 'upload')
WHERE r.name = 'family'
  AND NOT EXISTS (
    SELECT 1 FROM public.role_permissions rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

-- Gast bekommt nur read
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.domain = 'media' AND p.action = 'read'
WHERE r.name = 'guest'
  AND NOT EXISTS (
    SELECT 1 FROM public.role_permissions rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

COMMIT;
