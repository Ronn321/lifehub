-- 0004_plugins.sql
-- Plugin-System: installierte Erweiterungen

CREATE TABLE IF NOT EXISTS plugins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  version text NOT NULL,
  description text,
  author text,
  homepage text,
  enabled boolean NOT NULL DEFAULT false,
  permissions jsonb NOT NULL DEFAULT '[]',
  settings jsonb NOT NULL DEFAULT '{}',
  owner_id uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS plugins_owner_idx ON plugins(owner_id, deleted_at);
CREATE INDEX IF NOT EXISTS plugins_name_idx ON plugins(name);

CREATE OR REPLACE TRIGGER plugins_updated_at
  BEFORE UPDATE ON plugins
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
