-- 0006_pages.sql
-- Block-basiertes Seitensystem (Pages Domain)

CREATE TABLE IF NOT EXISTS pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  owner_id uuid NOT NULL REFERENCES users(id),
  parent_id uuid REFERENCES pages(id),
  icon text,
  cover_media_id uuid,
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS pages_owner_idx ON pages(owner_id, deleted_at);
CREATE INDEX IF NOT EXISTS pages_parent_idx ON pages(parent_id);

CREATE TABLE IF NOT EXISTS page_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id uuid NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  type text NOT NULL,
  content jsonb NOT NULL DEFAULT '{}',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS page_blocks_page_idx ON page_blocks(page_id, sort_order);

CREATE OR REPLACE TRIGGER pages_updated_at
  BEFORE UPDATE ON pages
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE TRIGGER page_blocks_updated_at
  BEFORE UPDATE ON page_blocks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
