-- Documents Domain: Migration 001
-- Erstellt die documents-Tabelle

CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL DEFAULT 'other',
  description text,
  mime_type text,
  file_size bigint,
  storage_path text,
  tags text[],
  owner_id uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS documents_owner_idx ON documents(owner_id, deleted_at);
