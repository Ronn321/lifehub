-- integrations domain + calendar personalization
-- Adapted to existing codebase reality: calendar tables live in the PUBLIC schema
-- (see shared/db/src/schema/public.ts + migration 0017_calendar.sql, no schema prefix).
-- The unique calendar index uses external_id (Google calendar id) as source key.

CREATE SCHEMA IF NOT EXISTS integrations;

-- Google OAuth2 connections (encrypted tokens). Owned by integrations domain.
CREATE TABLE IF NOT EXISTS integrations.google_connections (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id          uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  google_email      text NOT NULL,
  display_name      text,
  avatar_url        text,
  access_token_enc  text NOT NULL,
  refresh_token_enc text NOT NULL,
  token_expires_at  timestamptz,
  granted_scopes    text[] NOT NULL DEFAULT '{}',
  last_sync_at      timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  deleted_at        timestamptz
);
CREATE INDEX IF NOT EXISTS google_connections_owner_idx
  ON integrations.google_connections (owner_id) WHERE deleted_at IS NULL;

-- Calendar user settings (personalization). Public schema, consistent with calendar tables.
CREATE TABLE IF NOT EXISTS user_settings (
  owner_id            uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  accent_color        text,
  background_url      text,
  background_overlay  real NOT NULL DEFAULT 0.85,
  background_blur     integer NOT NULL DEFAULT 12,
  default_view        text NOT NULL DEFAULT 'month',
  week_start          text NOT NULL DEFAULT 'monday',
  show_week_numbers   boolean NOT NULL DEFAULT TRUE,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- Multi-calendar support: events belong to a calendar
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS calendar_id uuid REFERENCES calendars(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS calendar_events_calendar_idx ON calendar_events (calendar_id);

-- Idempotent upsert of Google calendars per owner+source+external_id
CREATE UNIQUE INDEX IF NOT EXISTS calendars_source_unique
  ON calendars (owner_id, source, external_id) WHERE deleted_at IS NULL;
