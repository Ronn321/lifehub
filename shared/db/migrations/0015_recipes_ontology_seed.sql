-- Migration: Recipes Ontology Seed Data
-- Adds: ontology_flags (contains_flags, attributes, compound)
--        ingredient_ontology basic entries

-- ===================== ONTOLOGY FLAGS =====================

-- Contains Flags (what a recipe HAS)
INSERT INTO ontology_flags (key, category, name_de, name_en, is_compound) VALUES
  ('dairy', 'contains_flag', 'Milchprodukte', 'Dairy', FALSE),
  ('gluten', 'contains_flag', 'Gluten', 'Gluten', FALSE),
  ('egg', 'contains_flag', 'Eier', 'Eggs', FALSE),
  ('meat', 'contains_flag', 'Fleisch', 'Meat', FALSE),
  ('beef', 'contains_flag', 'Rindfleisch', 'Beef', FALSE),
  ('pork', 'contains_flag', 'Schweinefleisch', 'Pork', FALSE),
  ('poultry', 'contains_flag', 'Geflügel', 'Poultry', FALSE),
  ('lamb', 'contains_flag', 'Lamm', 'Lamb', FALSE),
  ('fish', 'contains_flag', 'Fisch', 'Fish', FALSE),
  ('shellfish', 'contains_flag', 'Schalentiere', 'Shellfish', FALSE),
  ('molluscs', 'contains_flag', 'Weichtiere', 'Molluscs', FALSE),
  ('peanuts', 'contains_flag', 'Erdnüsse', 'Peanuts', FALSE),
  ('tree-nuts', 'contains_flag', 'Baumnüsse', 'Tree Nuts', FALSE),
  ('almonds', 'contains_flag', 'Mandeln', 'Almonds', FALSE),
  ('walnuts', 'contains_flag', 'Walnüsse', 'Walnuts', FALSE),
  ('cashews', 'contains_flag', 'Cashews', 'Cashews', FALSE),
  ('pistachios', 'contains_flag', 'Pistazien', 'Pistachios', FALSE),
  ('hazelnuts', 'contains_flag', 'Haselnüsse', 'Hazelnuts', FALSE),
  ('sesame', 'contains_flag', 'Sesam', 'Sesame', FALSE),
  ('mustard', 'contains_flag', 'Senf', 'Mustard', FALSE),
  ('celery', 'contains_flag', 'Sellerie', 'Celery', FALSE),
  ('soy', 'contains_flag', 'Soja', 'Soy', FALSE),
  ('lupin', 'contains_flag', 'Lupine', 'Lupin', FALSE),
  ('sulphites', 'contains_flag', 'Sulfite', 'Sulphites', FALSE),
  ('alcohol', 'contains_flag', 'Alkohol', 'Alcohol', FALSE),
  ('caffeine', 'contains_flag', 'Koffein', 'Caffeine', FALSE),
  ('honey', 'contains_flag', 'Honig', 'Honey', FALSE),
  ('gelatin', 'contains_flag', 'Gelatine', 'Gelatin', FALSE),
  ('gelatin-non-halal', 'contains_flag', 'Gelatine (nicht halal)', 'Gelatin (non-halal)', FALSE),
  ('gelatin-non-kosher', 'contains_flag', 'Gelatine (nicht koscher)', 'Gelatin (non-kosher)', FALSE),
  ('added-sugar', 'contains_flag', 'Zugesetzter Zucker', 'Added Sugar', FALSE),
  ('wheat', 'contains_flag', 'Weizen', 'Wheat', FALSE),
  ('barley', 'contains_flag', 'Gerste', 'Barley', FALSE),
  ('rye', 'contains_flag', 'Roggen', 'Rye', FALSE),
  ('oats', 'contains_flag', 'Hafer', 'Oats', FALSE),
  ('syrup', 'contains_flag', 'Sirup', 'Syrup', FALSE)
ON CONFLICT (key) DO NOTHING;

-- Attributes (positive descriptors)
INSERT INTO ontology_flags (key, category, name_de, name_en, is_compound) VALUES
  ('effort-easy', 'attribute', 'Aufwand: Einfach', 'Effort: Easy', FALSE),
  ('effort-medium', 'attribute', 'Aufwand: Mittel', 'Effort: Medium', FALSE),
  ('effort-hard', 'attribute', 'Aufwand: Aufwändig', 'Effort: Hard', FALSE),
  ('time-15', 'attribute', 'Zeit: ≤15 Min', 'Time: ≤15 min', FALSE),
  ('time-30', 'attribute', 'Zeit: ≤30 Min', 'Time: ≤30 min', FALSE),
  ('time-60', 'attribute', 'Zeit: ≤60 Min', 'Time: ≤60 min', FALSE),
  ('time-60plus', 'attribute', 'Zeit: >60 Min', 'Time: >60 min', FALSE),
  ('calorie-400', 'attribute', 'Kalorien: ≤400', 'Calories: ≤400', FALSE),
  ('calorie-600', 'attribute', 'Kalorien: ≤600', 'Calories: ≤600', FALSE),
  ('calorie-800', 'attribute', 'Kalorien: ≤800', 'Calories: ≤800', FALSE),
  ('calorie-800plus', 'attribute', 'Kalorien: >800', 'Calories: >800', FALSE),
  ('halal-compatible', 'attribute', 'Halal-kompatibel', 'Halal Compatible', FALSE),
  ('kosher-compatible', 'attribute', 'Koscher-kompatibel', 'Kosher Compatible', FALSE)
ON CONFLICT (key) DO NOTHING;

-- Technique Tags
INSERT INTO ontology_flags (key, category, name_de, name_en, is_compound) VALUES
  ('bake', 'technique', 'Backen', 'Bake', FALSE),
  ('sauté', 'technique', 'Sautieren', 'Sauté', FALSE),
  ('simmer', 'technique', 'Köcheln', 'Simmer', FALSE),
  ('raw', 'technique', 'Roh', 'Raw', FALSE),
  ('grill', 'technique', 'Grillen', 'Grill', FALSE),
  ('fry', 'technique', 'Braten', 'Fry', FALSE),
  ('steam', 'technique', 'Dämpfen', 'Steam', FALSE),
  ('roast', 'technique', 'Rösten', 'Roast', FALSE),
  ('broil', 'technique', 'Grillen (Oberhitze)', 'Broil', FALSE),
  ('pan-fry', 'technique', 'Pfannenbraten', 'Pan-Fry', FALSE),
  ('deep-fry', 'technique', 'Frittieren', 'Deep-Fry', FALSE),
  ('stir-fry', 'technique', 'Wok-Braten', 'Stir-Fry', FALSE),
  ('poach', 'technique', 'Pochieren', 'Poach', FALSE),
  ('blanch', 'technique', 'Blanchieren', 'Blanch', FALSE)
ON CONFLICT (key) DO NOTHING;

-- Compound Flags
INSERT INTO ontology_flags (key, category, name_de, name_en, is_compound) VALUES
  ('vegan', 'compound', 'Vegan', 'Vegan', TRUE),
  ('vegetarisch', 'compound', 'Vegetarisch', 'Vegetarian', TRUE),
  ('pescetarisch', 'compound', 'Pescetarisch', 'Pescatarian', TRUE),
  ('halal', 'compound', 'Halal-kompatibel', 'Halal Compatible', TRUE),
  ('kosher', 'compound', 'Koscher-kompatibel', 'Kosher Compatible', TRUE),
  ('lactosefrei', 'compound', 'Laktosefrei', 'Lactose-Free', TRUE),
  ('glutenfrei', 'compound', 'Glutenfrei', 'Gluten-Free', TRUE),
  ('zuckerfrei', 'compound', 'Zuckerfrei', 'Sugar-Free', TRUE),
  ('nussfrei', 'compound', 'Nussfrei', 'Nut-Free', TRUE)
ON CONFLICT (key) DO NOTHING;

-- ===================== COMPOUND FLAG EXPANSIONS =====================

-- Vegan = all animal products excluded
DO $$
DECLARE
  vegan_id UUID;
  flags UUID[];
BEGIN
  SELECT id INTO vegan_id FROM ontology_flags WHERE key = 'vegan';
  SELECT array_agg(id) INTO flags FROM ontology_flags WHERE key IN (
    'meat', 'beef', 'pork', 'lamb', 'poultry', 'fish', 'shellfish', 'molluscs',
    'dairy', 'egg', 'honey', 'gelatin'
  );
  IF vegan_id IS NOT NULL AND flags IS NOT NULL THEN
    FOREACH flag_id IN ARRAY flags LOOP
      INSERT INTO ontology_compound_flags (compound_flag_id, expanded_flag_id)
      VALUES (vegan_id, flag_id)
      ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;
END $$;

-- Vegetarisch = no meat/fish
DO $$
DECLARE
  veget_id UUID;
  flags UUID[];
BEGIN
  SELECT id INTO veget_id FROM ontology_flags WHERE key = 'vegetarisch';
  SELECT array_agg(id) INTO flags FROM ontology_flags WHERE key IN (
    'meat', 'beef', 'pork', 'lamb', 'poultry', 'fish', 'shellfish', 'molluscs', 'gelatin-non-halal'
  );
  IF veget_id IS NOT NULL AND flags IS NOT NULL THEN
    FOREACH flag_id IN ARRAY flags LOOP
      INSERT INTO ontology_compound_flags (compound_flag_id, expanded_flag_id)
      VALUES (veget_id, flag_id)
      ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;
END $$;

-- Pescetarisch = no meat
DO $$
DECLARE
  pesc_id UUID;
  flags UUID[];
BEGIN
  SELECT id INTO pesc_id FROM ontology_flags WHERE key = 'pescetarisch';
  SELECT array_agg(id) INTO flags FROM ontology_flags WHERE key IN (
    'meat', 'beef', 'pork', 'lamb', 'poultry', 'gelatin-non-halal'
  );
  IF pesc_id IS NOT NULL AND flags IS NOT NULL THEN
    FOREACH flag_id IN ARRAY flags LOOP
      INSERT INTO ontology_compound_flags (compound_flag_id, expanded_flag_id)
      VALUES (pesc_id, flag_id)
      ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;
END $$;

-- Halal
DO $$
DECLARE
  halal_id UUID;
  flags UUID[];
BEGIN
  SELECT id INTO halal_id FROM ontology_flags WHERE key = 'halal';
  SELECT array_agg(id) INTO flags FROM ontology_flags WHERE key IN (
    'pork', 'alcohol', 'gelatin-non-halal'
  );
  IF halal_id IS NOT NULL AND flags IS NOT NULL THEN
    FOREACH flag_id IN ARRAY flags LOOP
      INSERT INTO ontology_compound_flags (compound_flag_id, expanded_flag_id)
      VALUES (halal_id, flag_id)
      ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;
END $$;

-- Kosher
DO $$
DECLARE
  kosher_id UUID;
  flags UUID[];
BEGIN
  SELECT id INTO kosher_id FROM ontology_flags WHERE key = 'kosher';
  SELECT array_agg(id) INTO flags FROM ontology_flags WHERE key IN (
    'pork', 'shellfish', 'gelatin-non-kosher'
  );
  IF kosher_id IS NOT NULL AND flags IS NOT NULL THEN
    FOREACH flag_id IN ARRAY flags LOOP
      INSERT INTO ontology_compound_flags (compound_flag_id, expanded_flag_id)
      VALUES (kosher_id, flag_id)
      ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;
END $$;

-- Laktosefrei = no dairy
DO $$
DECLARE
  lac_id UUID;
  dairy_id UUID;
BEGIN
  SELECT id INTO lac_id FROM ontology_flags WHERE key = 'lactosefrei';
  SELECT id INTO dairy_id FROM ontology_flags WHERE key = 'dairy';
  IF lac_id IS NOT NULL AND dairy_id IS NOT NULL THEN
    INSERT INTO ontology_compound_flags (compound_flag_id, expanded_flag_id)
    VALUES (lac_id, dairy_id)
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- Glutenfrei
DO $$
DECLARE
  gluten_id UUID;
  flags UUID[];
BEGIN
  SELECT id INTO gluten_id FROM ontology_flags WHERE key = 'glutenfrei';
  SELECT array_agg(id) INTO flags FROM ontology_flags WHERE key IN (
    'gluten', 'wheat', 'barley', 'rye', 'oats'
  );
  IF gluten_id IS NOT NULL AND flags IS NOT NULL THEN
    FOREACH flag_id IN ARRAY flags LOOP
      INSERT INTO ontology_compound_flags (compound_flag_id, expanded_flag_id)
      VALUES (gluten_id, flag_id)
      ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;
END $$;

-- Zuckerfrei
DO $$
DECLARE
  sugar_id UUID;
  flags UUID[];
BEGIN
  SELECT id INTO sugar_id FROM ontology_flags WHERE key = 'zuckerfrei';
  SELECT array_agg(id) INTO flags FROM ontology_flags WHERE key IN (
    'added-sugar', 'honey', 'syrup'
  );
  IF sugar_id IS NOT NULL AND flags IS NOT NULL THEN
    FOREACH flag_id IN ARRAY flags LOOP
      INSERT INTO ontology_compound_flags (compound_flag_id, expanded_flag_id)
      VALUES (sugar_id, flag_id)
      ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;
END $$;

-- Nussfrei
DO $$
DECLARE
  nut_id UUID;
  flags UUID[];
BEGIN
  SELECT id INTO nut_id FROM ontology_flags WHERE key = 'nussfrei';
  SELECT array_agg(id) INTO flags FROM ontology_flags WHERE key IN (
    'peanuts', 'tree-nuts', 'almonds', 'walnuts', 'cashews', 'pistachios', 'hazelnuts'
  );
  IF nut_id IS NOT NULL AND flags IS NOT NULL THEN
    FOREACH flag_id IN ARRAY flags LOOP
      INSERT INTO ontology_compound_flags (compound_flag_id, expanded_flag_id)
      VALUES (nut_id, flag_id)
      ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;
END $$;

-- ===================== INGREDIENT ONTOLOGY (Basic) =====================

-- Root level categories
INSERT INTO ingredient_ontology (name_de, name_en, ontology_tags, default_unit) VALUES
  ('Milchprodukte', 'Dairy', ARRAY['dairy'], NULL),
  ('Fleisch', 'Meat', ARRAY['meat'], 'g'),
  ('Fisch & Meeresfrüchte', 'Fish & Seafood', ARRAY['fish', 'shellfish', 'molluscs'], 'g'),
  ('Gemüse', 'Vegetables', NULL, NULL),
  ('Obst', 'Fruits', NULL, NULL),
  ('Getreide & Cerealien', 'Grains & Cereals', ARRAY['gluten', 'wheat'], 'g'),
  ('Gewürze & Kräuter', 'Spices & Herbs', NULL, NULL),
  ('Öle & Fette', 'Oils & Fats', NULL, 'ml'),
  ('Nüsse & Samen', 'Nuts & Seeds', ARRAY['tree-nuts'], 'g'),
  ('Hülsenfrüchte', 'Legumes', ARRAY['soy'], 'g'),
  ('Eier', 'Eggs', ARRAY['egg'], 'Stück'),
  ('Süßungsmittel', 'Sweeteners', ARRAY['added-sugar', 'honey'], 'g'),
  ('Getränke', 'Beverages', ARRAY['alcohol', 'caffeine'], 'ml'),
  ('Backwaren', 'Bakery', ARRAY['gluten', 'wheat'], 'g'),
  ('Fertiggerichte', 'Ready Meals', NULL, NULL)
ON CONFLICT DO NOTHING;