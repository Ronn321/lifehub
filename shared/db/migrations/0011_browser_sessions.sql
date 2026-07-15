-- 0011_browser_sessions.sql
-- Browser sessions table for browser_embed blocks
-- Each BrowserBlock gets its own isolated session

CREATE TABLE IF NOT EXISTS browser_sessions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  block_id    UUID NOT NULL REFERENCES page_blocks(id) ON DELETE CASCADE,
  owner_id    UUID NOT NULL REFERENCES users(id),
  start_url   TEXT NOT NULL DEFAULT '',
  settings    JSONB NOT NULL DEFAULT '{"zoom":1.0,"darkMode":false}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS browser_sessions_block_idx ON browser_sessions(block_id);
CREATE INDEX IF NOT EXISTS browser_sessions_owner_idx ON browser_sessions(owner_id);

-- Allow browser_tabs to reference browser_sessions (in addition to research_sessions)
-- We add a nullable FK so existing research-session tabs still work
ALTER TABLE browser_tabs
  ADD COLUMN IF NOT EXISTS browser_session_id UUID REFERENCES browser_sessions(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS browser_tabs_browser_session_idx
  ON browser_tabs(browser_session_id, sort_order);
