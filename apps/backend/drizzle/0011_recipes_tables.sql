-- 0011_recipes_tables.sql
-- Creates: recipes, ingredients, steps, recipe_tags, dishes tables
-- (these were defined in drizzle schema but never migrated into the database)

-- ===================== dishes =====================
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
CREATE INDEX IF NOT EXISTS dishes_owner_idx ON dishes(owner_id) WHERE deleted_at IS NULL;

-- ===================== recipes =====================
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
CREATE INDEX IF NOT EXISTS recipes_owner_idx ON recipes(owner_id, deleted_at);
CREATE INDEX IF NOT EXISTS recipes_dish_idx ON recipes(dish_id);

-- ===================== ingredients =====================
CREATE TABLE IF NOT EXISTS ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  amount TEXT,
  unit TEXT,
  ord INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ingredients_recipe_idx ON ingredients(recipe_id, ord);

-- ===================== steps =====================
CREATE TABLE IF NOT EXISTS steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  instruction TEXT NOT NULL,
  ord INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS steps_recipe_idx ON steps(recipe_id, ord);

-- ===================== recipe_tags =====================
CREATE TABLE IF NOT EXISTS recipe_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS recipe_tags_recipe_idx ON recipe_tags(recipe_id);
CREATE INDEX IF NOT EXISTS recipe_tags_tag_idx ON recipe_tags(tag_id);

-- Add triggers for updated_at
CREATE OR REPLACE TRIGGER set_dishes_updated_at
  BEFORE UPDATE ON dishes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE OR REPLACE TRIGGER set_recipes_updated_at
  BEFORE UPDATE ON recipes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
