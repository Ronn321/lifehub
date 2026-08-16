-- Migration 0024: Geräte-Dashboard-Layouts (Phase 2.5)
-- Pro User + Geräte-DeviceId ein eigenes Layout → überlebt App-Reinstall
-- (Backend = Reinstall-Recovery, localStorage bleibt nur Cache).
-- Schema-Quelle: shared/db/src/schema/public.ts (dashboardDeviceLayouts)
CREATE TABLE IF NOT EXISTS dashboard_device_layouts (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_id text NOT NULL,
  layout jsonb NOT NULL DEFAULT '{"widgets": []}',
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, device_id)
);
