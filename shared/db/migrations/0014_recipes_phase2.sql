-- Migration: Recipes Phase 2 - Import Pipeline, Ontology, Dietary Profiles
-- Adds: ingredient_ontology, ontology_flags, ontology_compound_flags,
--        import_jobs, import_history, dietary_profiles
-- Alters: recipes (nutrition), steps (timer_seconds), ingredients (note)

-- ===================== 1. ALTER EXISTING TABLES =====================

-- Recipes: add nutrition JSONB field
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS nutrition JSONB;

-- Steps: add timer_seconds for cook mode
ALTER TABLE steps ADD COLUMN IF NOT EXISTS timer_seconds INT;

-- Ingredients: add note for preparation notes (e.g. "gehackt")
ALTER TABLE ingredients ADD COLUMN IF NOT EXISTS note TEXT;

-- ===================== 2. NEW TABLES =====================

-- Hierarchische Zutaten-Ontologie
CREATE TABLE IF NOT EXISTS ingredient_ontology (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID REFERENCES ingredient_ontology(id),
  name_de TEXT NOT NULL,
  name_en TEXT,
  ontology_tags TEXT[],
  default_unit TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ingredient_ontology_parent_idx ON ingredient_ontology(parent_id);

-- Flag-Taxonomie
CREATE TABLE IF NOT EXISTS ontology_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  name_de TEXT NOT NULL,
  name_en TEXT,
  description TEXT,
  is_compound BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Compound-Flag-Expansion
CREATE TABLE IF NOT EXISTS ontology_compound_flags (
  compound_flag_id UUID NOT NULL REFERENCES ontology_flags(id),
  expanded_flag_id UUID NOT NULL REFERENCES ontology_flags(id),
  PRIMARY KEY (compound_flag_id, expanded_flag_id)
);

-- Import-Jobs (Draft-System)
CREATE TABLE IF NOT EXISTS import_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES users(id),
  source_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  source_type TEXT NOT NULL,
  raw_html TEXT,
  extracted_dto JSONB,
  normalized_dto JSONB,
  draft_recipe_id UUID REFERENCES recipes(id),
  error_message TEXT,
  error_details JSONB,
  retry_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS import_jobs_owner_idx ON import_jobs(owner_id, status);
CREATE INDEX IF NOT EXISTS import_jobs_status_idx ON import_jobs(status);

-- Import-Historie
CREATE TABLE IF NOT EXISTS import_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES users(id),
  source_url TEXT NOT NULL,
  source_type TEXT NOT NULL,
  recipe_id UUID NOT NULL REFERENCES recipes(id),
  success BOOLEAN NOT NULL DEFAULT TRUE,
  duration_ms INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS import_history_owner_idx ON import_history(owner_id, created_at DESC);

-- Dietary-Profile
CREATE TABLE IF NOT EXISTS dietary_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) UNIQUE,
  avoid_flags TEXT[] NOT NULL DEFAULT '{}',
  avoid_ingredient_ids TEXT[] NOT NULL DEFAULT '{}',
  required_attributes TEXT[] NOT NULL DEFAULT '{}',
  calorie_target INT,
  calorie_tolerance INT NOT NULL DEFAULT 100,
  max_time_minutes INT,
  preferred_effort TEXT DEFAULT 'medium',
  show_variant_tags BOOLEAN NOT NULL DEFAULT TRUE,
  show_calorie_info BOOLEAN NOT NULL DEFAULT TRUE,
  reduce_motion BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS dietary_profiles_user_idx ON dietary_profiles(user_id);