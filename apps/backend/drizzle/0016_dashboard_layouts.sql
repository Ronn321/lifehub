-- dashboard_layouts: fehlte als Migration (früher nur manuell angelegt → nach DB-Reset weg)
-- Schema-Quelle: shared/db/src/schema/public.ts (dashboardLayouts)
CREATE TABLE IF NOT EXISTS dashboard_layouts (
  user_id uuid PRIMARY KEY NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  layout jsonb NOT NULL DEFAULT '{"widgets": []}',
  updated_at timestamptz NOT NULL DEFAULT now()
);
