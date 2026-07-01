-- 0003_it_devices.sql
-- Haus-IT Inventar: Geräte im Heimnetzwerk

CREATE TABLE IF NOT EXISTS it_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL DEFAULT 'other',
  ip_address text,
  mac_address text,
  hostname text,
  os text,
  location text,
  notes text,
  owner_id uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS it_devices_owner_idx ON it_devices(owner_id, deleted_at);
CREATE INDEX IF NOT EXISTS it_devices_type_idx ON it_devices(type);

-- Trigger für updated_at
CREATE OR REPLACE TRIGGER it_devices_updated_at
  BEFORE UPDATE ON it_devices
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
