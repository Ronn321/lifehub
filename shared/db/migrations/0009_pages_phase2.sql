-- Migration: Pages Phase 2 - Permission Overrides & Database Concept
-- Adds: page_permissions, database_pages

-- Page-level permission overrides
CREATE TABLE IF NOT EXISTS page_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  subject_type TEXT NOT NULL,
  subject_id UUID NOT NULL,
  permission TEXT NOT NULL,
  granted_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS page_permissions_page_idx ON page_permissions(page_id);
CREATE UNIQUE INDEX IF NOT EXISTS page_permissions_uq ON page_permissions(page_id, subject_type, subject_id);

-- Database Pages (for the Database Concept - structured collections of pages as rows)
CREATE TABLE IF NOT EXISTS database_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE UNIQUE,
  schema JSONB NOT NULL DEFAULT '{}',
  view_config JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
