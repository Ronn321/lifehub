-- 0018_jellyfin_watchlists.sql
-- Benutzerdefinierte Watchlists für Filme & Serien (Jellyfin Domain)

CREATE TABLE IF NOT EXISTS jellyfin_watchlists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS jellyfin_watchlist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  watchlist_id uuid NOT NULL REFERENCES jellyfin_watchlists(id) ON DELETE CASCADE,
  external_item_id text NOT NULL,
  item_type text NOT NULL,
  name text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  added_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT jellyfin_watchlist_items_uq UNIQUE (watchlist_id, external_item_id)
);

CREATE INDEX IF NOT EXISTS jellyfin_watchlists_owner_idx ON jellyfin_watchlists(owner_id);
CREATE INDEX IF NOT EXISTS jellyfin_watchlist_items_list_idx ON jellyfin_watchlist_items(watchlist_id);
