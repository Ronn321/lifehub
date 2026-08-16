-- Migration 0023: Contacts Domain
-- Adds: contacts (own contact management, no Google)

CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  notes TEXT,
  color TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS contacts_owner_idx ON contacts(owner_id) WHERE deleted_at IS NULL;
