-- 0008_pages_slugs_browser.sql
-- Add slug to pages for unique page URLs
-- Add page_pins table for sidebar pinned pages
-- Add browser_proxy table for research browser tabs

ALTER TABLE pages ADD COLUMN IF NOT EXISTS slug text;
CREATE INDEX IF NOT EXISTS pages_slug_owner_idx ON pages(owner_id, slug) WHERE deleted_at IS NULL;

-- page_pins: user-pinned pages for sidebar
CREATE TABLE IF NOT EXISTS page_pins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id),
  page_id uuid NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, page_id)
);
CREATE INDEX IF NOT EXISTS page_pins_user_idx ON page_pins(user_id, sort_order);

-- browser_tabs: open tabs in research sessions
CREATE TABLE IF NOT EXISTS browser_tabs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES research_sessions(id) ON DELETE CASCADE,
  url text NOT NULL DEFAULT 'about:blank',
  title text,
  favicon text,
  is_active boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS browser_tabs_session_idx ON browser_tabs(session_id, sort_order);
