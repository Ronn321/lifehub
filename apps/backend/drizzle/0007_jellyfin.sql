-- 0007_jellyfin.sql
-- Jellyfin-Mediathek-Integration (Jellyfin Domain)

CREATE TABLE IF NOT EXISTS jellyfin_servers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url text NOT NULL,
  api_key text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  owner_id uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS jellyfin_libraries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id uuid NOT NULL REFERENCES jellyfin_servers(id) ON DELETE CASCADE,
  external_id text,
  name text NOT NULL,
  type text,
  owner_id uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS jellyfin_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  library_id uuid NOT NULL REFERENCES jellyfin_libraries(id) ON DELETE CASCADE,
  external_id text,
  name text NOT NULL,
  type text NOT NULL,
  path text,
  watched boolean NOT NULL DEFAULT false,
  owner_id uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS jellyfin_items_library_idx ON jellyfin_items(library_id);
