-- calendar domain tables: fehlten als Migration (Domain wurde nie migriert)
-- Schema-Quelle: shared/db/src/schema/public.ts (calendarEvents, calendars, eventAttendees)
CREATE TABLE IF NOT EXISTS calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES users(id),
  title text NOT NULL,
  description text,
  start_date timestamptz NOT NULL,
  end_date timestamptz,
  all_day boolean NOT NULL DEFAULT false,
  location text,
  color text,
  category text,
  calendar_source text NOT NULL DEFAULT 'local',
  external_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE INDEX IF NOT EXISTS calendar_events_owner_idx ON calendar_events (owner_id, start_date, deleted_at);

CREATE TABLE IF NOT EXISTS calendars (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  color text,
  source text NOT NULL DEFAULT 'local',
  external_id text,
  owner_id uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE INDEX IF NOT EXISTS calendars_owner_idx ON calendars (owner_id, deleted_at);

CREATE TABLE IF NOT EXISTS event_attendees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES calendar_events(id) ON DELETE CASCADE,
  name text,
  email text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS event_attendees_event_idx ON event_attendees (event_id);
