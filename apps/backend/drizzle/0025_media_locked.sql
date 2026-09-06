-- Migration 0025: Gesperrte Medien (locked) + Lock-PIN
-- - media_files.locked: Standard-Listings schließen locked=true aus,
--   GET /media/locked ist der einzige Listen-Zugang (braucht Lock-Token).
-- - media_lock_pins: scrypt-Hash der PIN pro Owner (PK owner_id).
-- Schema-Quelle: shared/db/src/schema/public.ts (mediaFiles.locked, mediaLockPins)
ALTER TABLE media_files ADD COLUMN IF NOT EXISTS locked boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS media_files_locked_idx ON media_files(owner_id, locked) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS media_lock_pins (
  owner_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  pin_hash text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
