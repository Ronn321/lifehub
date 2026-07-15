-- 0012_browser_bookmarks.sql
-- Bookmarks table for browser_embed blocks

CREATE TABLE IF NOT EXISTS browser_bookmarks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  UUID NOT NULL REFERENCES browser_sessions(id) ON DELETE CASCADE,
  url         TEXT NOT NULL,
  title       TEXT,
  favicon_url TEXT,
  folder      TEXT NOT NULL DEFAULT '',
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS browser_bookmarks_session_idx
  ON browser_bookmarks(session_id, sort_order);
CREATE UNIQUE INDEX IF NOT EXISTS browser_bookmarks_session_url_uq
  ON browser_bookmarks(session_id, url);
