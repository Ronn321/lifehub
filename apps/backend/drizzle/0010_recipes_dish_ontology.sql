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
