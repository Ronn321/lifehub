-- Migration: Pages Architecture Extension
-- Adds: versioning, relations, templates, research workspace

-- Extend pages table
ALTER TABLE pages ADD COLUMN IF NOT EXISTS template_id UUID;
ALTER TABLE pages ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'published';
ALTER TABLE pages ADD COLUMN IF NOT EXISTS tags JSONB NOT NULL DEFAULT '[]';
ALTER TABLE pages ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}';

-- Extend page_blocks table
ALTER TABLE page_blocks ADD COLUMN IF NOT EXISTS layout JSONB;
ALTER TABLE page_blocks ADD COLUMN IF NOT EXISTS metadata JSONB;
ALTER TABLE page_blocks ADD COLUMN IF NOT EXISTS permissions JSONB;
ALTER TABLE page_blocks ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE page_blocks ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE page_blocks ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Block versions
CREATE TABLE IF NOT EXISTS block_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  block_id UUID NOT NULL REFERENCES page_blocks(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  content JSONB NOT NULL,
  layout JSONB,
  metadata JSONB,
  changed_by UUID NOT NULL REFERENCES users(id),
  change_type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS block_versions_block_idx ON block_versions(block_id, version);

-- Page versions
CREATE TABLE IF NOT EXISTS page_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  cover_media_id UUID,
  blocks JSONB NOT NULL,
  changed_by UUID NOT NULL REFERENCES users(id),
  change_type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS page_versions_page_idx ON page_versions(page_id, version);

-- Page relations
CREATE TABLE IF NOT EXISTS page_relations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_page_id UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  target_page_id UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  relation_type TEXT NOT NULL DEFAULT 'reference',
  label TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID NOT NULL REFERENCES users(id),
  UNIQUE(source_page_id, target_page_id, relation_type)
);
CREATE INDEX IF NOT EXISTS page_relations_source_idx ON page_relations(source_page_id);
CREATE INDEX IF NOT EXISTS page_relations_target_idx ON page_relations(target_page_id);

-- Page templates
CREATE TABLE IF NOT EXISTS page_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  domain TEXT,
  blocks JSONB NOT NULL DEFAULT '[]',
  metadata JSONB,
  is_system BOOLEAN NOT NULL DEFAULT false,
  owner_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS page_templates_domain_idx ON page_templates(domain);
CREATE INDEX IF NOT EXISTS page_templates_owner_idx ON page_templates(owner_id);

-- Research sessions
CREATE TABLE IF NOT EXISTS research_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  block_id UUID REFERENCES page_blocks(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'active',
  search_history JSONB NOT NULL DEFAULT '[]',
  pinned_sources JSONB NOT NULL DEFAULT '[]',
  notes TEXT,
  tags JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS research_sessions_page_idx ON research_sessions(page_id);
CREATE INDEX IF NOT EXISTS research_sessions_block_idx ON research_sessions(block_id);

-- Research sources
CREATE TABLE IF NOT EXISTS research_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES research_sessions(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  url TEXT,
  title TEXT,
  description TEXT,
  thumbnail_url TEXT,
  metadata JSONB,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS research_sources_session_idx ON research_sources(session_id);
CREATE INDEX IF NOT EXISTS research_sources_type_idx ON research_sources(session_id, type);

-- Research collections
CREATE TABLE IF NOT EXISTS research_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES research_sessions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  source_ids JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS research_collections_session_idx ON research_collections(session_id);

-- Add indexes for new page columns
CREATE INDEX IF NOT EXISTS pages_status_idx ON pages(owner_id, status);

-- Insert default templates
INSERT INTO page_templates (name, description, icon, domain, blocks, is_system) VALUES
  ('Projekt', 'Standard-Projektseite mit Aufgaben und Notizen', '📁', 'projects', '[{"type":"heading","content":{"level":1,"text":"Projektname"},"sortOrder":0},{"type":"text","content":{"json":{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Projektbeschreibung"}]}]}},"sortOrder":1},{"type":"heading","content":{"level":2,"text":"Aufgaben"},"sortOrder":2},{"type":"todo","content":{"checked":false,"text":"Aufgabe 1"},"sortOrder":3},{"type":"todo","content":{"checked":false,"text":"Aufgabe 2"},"sortOrder":4},{"type":"heading","content":{"level":2,"text":"Notizen"},"sortOrder":5},{"type":"text","content":{"json":{"type":"doc","content":[]}},"sortOrder":6}]', true),
  ('Reise', 'Reiseplanung mit Tagen und Aktivitäten', '✈️', 'travel', '[{"type":"heading","content":{"level":1,"text":"Reise"},"sortOrder":0},{"type":"text","content":{"json":{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Reisezeitraum und Ziel"}]}]}},"sortOrder":1},{"type":"heading","content":{"level":2,"text":"Tag 1"},"sortOrder":2},{"type":"text","content":{"json":{"type":"doc","content":[]}},"sortOrder":3},{"type":"heading","content":{"level":2,"text":"Tag 2"},"sortOrder":4},{"type":"text","content":{"json":{"type":"doc","content":[]}},"sortOrder":5}]', true),
  ('Rezept', 'Rezeptvorlage mit Zutaten und Zubereitung', '🍳', 'recipes', '[{"type":"heading","content":{"level":1,"text":"Rezeptname"},"sortOrder":0},{"type":"text","content":{"json":{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Kurzbeschreibung"}]}]}},"sortOrder":1},{"type":"heading","content":{"level":2,"text":"Zutaten"},"sortOrder":2},{"type":"checklist","content":{"items":[]},"sortOrder":3},{"type":"heading","content":{"level":2,"text":"Zubereitung"},"sortOrder":4},{"type":"text","content":{"json":{"type":"doc","content":[]}},"sortOrder":5}]', true),
  ('Finanzen', 'Finanzübersicht mit Konten und Transaktionen', '💰', 'finance', '[{"type":"heading","content":{"level":1,"text":"Finanzübersicht"},"sortOrder":0},{"type":"finance_widget","content":{},"sortOrder":1},{"type":"heading","content":{"level":2,"text":"Notizen"},"sortOrder":2},{"type":"text","content":{"json":{"type":"doc","content":[]}},"sortOrder":3}]', true),
  ('Research', 'Recherchearbeitsplatz mit Quellen und Notizen', '🔍', null, '[{"type":"heading","content":{"level":1,"text":"Recherche"},"sortOrder":0},{"type":"text","content":{"json":{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Rechercheziel und Kontext"}]}]}},"sortOrder":1},{"type":"research_workspace","content":{},"sortOrder":2},{"type":"heading","content":{"level":2,"text":"Notizen"},"sortOrder":3},{"type":"text","content":{"json":{"type":"doc","content":[]}},"sortOrder":4}]', true)
ON CONFLICT DO NOTHING;
