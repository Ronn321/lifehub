-- 0002_init_travel.sql
-- Travel schema: trips, destinations, trip_days, trip_media_refs
-- (kanonisch: DATABASE_SCHEMA.md §6)

BEGIN;

-- =============================================================
-- TRAVEL TRIPS
-- =============================================================
CREATE TABLE public.travel_trips (
  id              UUID PRIMARY KEY,
  owner_id        UUID NOT NULL REFERENCES public.users(id),
  title           TEXT NOT NULL,
  description     TEXT,
  start_date      TEXT NOT NULL,
  end_date        TEXT NOT NULL,
  cover_media_id  UUID,
  status          TEXT NOT NULL DEFAULT 'planned',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);

CREATE INDEX travel_trips_owner_idx ON public.travel_trips(owner_id) WHERE deleted_at IS NULL;
CREATE INDEX travel_trips_date_idx ON public.travel_trips(start_date, end_date);

CREATE TRIGGER trg_travel_trips_updated_at BEFORE UPDATE ON public.travel_trips
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_travel_trips_audit AFTER INSERT OR UPDATE OR DELETE ON public.travel_trips
  FOR EACH ROW EXECUTE FUNCTION public.audit_row();

-- =============================================================
-- TRAVEL DESTINATIONS
-- =============================================================
CREATE TABLE public.travel_destinations (
  id            UUID PRIMARY KEY,
  trip_id       UUID NOT NULL REFERENCES public.travel_trips(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  lat           TEXT NOT NULL,
  lon           TEXT NOT NULL,
  arrival_at    TIMESTAMPTZ,
  departure_at  TIMESTAMPTZ,
  notes         TEXT,
  ord           INT NOT NULL DEFAULT 0
);

CREATE INDEX travel_destinations_trip_idx ON public.travel_destinations(trip_id, ord);

-- =============================================================
-- TRAVEL TRIP DAYS
-- =============================================================
CREATE TABLE public.travel_trip_days (
  id        UUID PRIMARY KEY,
  trip_id   UUID NOT NULL REFERENCES public.travel_trips(id) ON DELETE CASCADE,
  day_date  TEXT NOT NULL,
  title     TEXT,
  notes     TEXT,
  UNIQUE (trip_id, day_date)
);

CREATE INDEX travel_trip_days_date_idx ON public.travel_trip_days(trip_id, day_date);

-- =============================================================
-- TRAVEL TRIP MEDIA REFS
-- =============================================================
CREATE TABLE public.travel_trip_media_refs (
  trip_id   UUID NOT NULL REFERENCES public.travel_trips(id) ON DELETE CASCADE,
  media_id  UUID NOT NULL REFERENCES public.media_files(id) ON DELETE CASCADE,
  day_id    UUID,
  ord       INT NOT NULL DEFAULT 0,
  PRIMARY KEY (trip_id, media_id)
);

CREATE INDEX travel_trip_media_refs_trip_idx ON public.travel_trip_media_refs(trip_id);

COMMIT;
