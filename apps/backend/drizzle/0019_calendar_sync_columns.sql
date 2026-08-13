-- Calendar domain: multi-calendar columns for the calendars table.
-- Adds sync-token, last-sync and visibility columns used by the Google sync service.
-- These columns are NOT in shared/db schema (calendar domain cannot touch shared/db);
-- CalendarsRepository reads/writes them via raw SQL.
ALTER TABLE calendars ADD COLUMN IF NOT EXISTS sync_token text;
ALTER TABLE calendars ADD COLUMN IF NOT EXISTS last_sync_at timestamptz;
ALTER TABLE calendars ADD COLUMN IF NOT EXISTS is_visible boolean NOT NULL DEFAULT TRUE;
