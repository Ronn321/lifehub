-- Migration: Recipes Dish Ontology
-- Adds: dishes table, recipes columns (title_en, dish_id, contains_flags, attributes)

-- Dishes table — central dish/category entity for recipe organization
CREATE TABLE IF NOT EXISTS dishes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  title_en TEXT,
  description TEXT,
  caption TEXT,
  hero_text TEXT,
  primary_color TEXT,
  image_media_id UUID,
  owner_id UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- Ensure recipes exists BEFORE the ALTERs below (0010 historically ran before
-- 0011_recipes_tables.sql on fresh DBs -> "relation recipes does not exist").
-- Schema is identical to 0011 so it becomes a no-op there (IF NOT EXISTS).
CREATE TABLE IF NOT EXISTS recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  title_en TEXT,
  description TEXT,
  dish_id UUID REFERENCES dishes(id),
  contains_flags TEXT[],
  attributes TEXT[],
  variant_label TEXT,
  effort_level TEXT,
  source_type TEXT NOT NULL DEFAULT 'manual',
  source_url TEXT,
  servings INTEGER NOT NULL DEFAULT 4,
  prep_time INTEGER,
  cook_time INTEGER,
  total_time INTEGER,
  calories INTEGER,
  image_media_id UUID,
  owner_id UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- Recipes: new columns for dish ontology
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS title_en TEXT;
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS dish_id UUID REFERENCES dishes(id);
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS contains_flags TEXT[];
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS attributes TEXT[];
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS variant_label TEXT;
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS effort_level TEXT;

-- Indexes
CREATE INDEX IF NOT EXISTS dishes_owner_idx ON dishes(owner_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS recipes_dish_idx ON recipes(dish_id);
