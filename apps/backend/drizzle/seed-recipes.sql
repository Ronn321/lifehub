-- Get admin user ID
DO $$
DECLARE
  admin_id UUID;
  dish1_id UUID; dish2_id UUID; dish3_id UUID; dish4_id UUID; dish5_id UUID;
  r1_id UUID; r2_id UUID; r3_id UUID; r4_id UUID; r5_id UUID; r6_id UUID; r7_id UUID;
BEGIN
  SELECT id INTO admin_id FROM users WHERE email = 'admin@lifehub.local' LIMIT 1;
  IF admin_id IS NULL THEN
    RAISE NOTICE 'Admin user not found. Run seed.ts first.';
    RETURN;
  END IF;

  -- Dishes
  INSERT INTO dishes (title, title_en, description, hero_text, primary_color, owner_id) VALUES
    ('Pasta Carbonara', 'Pasta Carbonara', 'Cremige Pasta mit Speck und Ei', 'Der italienische Klassiker', '#F59E0B', admin_id),
    ('Haehnchen Curry', 'Chicken Curry', 'Mildes Curry mit Haehnchen und Kokosmilch', 'Exotisch und cremig', '#EF4444', admin_id),
    ('Doener', 'Doner Kebab', 'Klassischer Doener mit allem drum und dran', 'Der Kultimbiss', '#10B981', admin_id),
    ('Buddha Bowl', 'Buddha Bowl', 'Gesunde Bowl mit Quinoa, Avocado und Gemuese', 'Bunt und gesund', '#8B5CF6', admin_id),
    ('Kaiserschmarrn', 'Kaiserschmarrn', 'Lockerer Kaiserschmarrn mit Apfelmus', 'Oesterreichische Suessspeise', '#EC4899', admin_id);

  -- Get dish IDs
  SELECT id INTO dish1_id FROM dishes WHERE title = 'Pasta Carbonara' AND owner_id = admin_id LIMIT 1;
  SELECT id INTO dish2_id FROM dishes WHERE title = 'Haehnchen Curry' AND owner_id = admin_id LIMIT 1;
  SELECT id INTO dish3_id FROM dishes WHERE title = 'Doener' AND owner_id = admin_id LIMIT 1;
  SELECT id INTO dish4_id FROM dishes WHERE title = 'Buddha Bowl' AND owner_id = admin_id LIMIT 1;
  SELECT id INTO dish5_id FROM dishes WHERE title = 'Kaiserschmarrn' AND owner_id = admin_id LIMIT 1;

  -- Recipe 1: Pasta Carbonara Klassisch
  INSERT INTO recipes (title, dish_id, contains_flags, attributes, servings, prep_time, cook_time, total_time, calories, owner_id)
  VALUES ('Pasta Carbonara (Klassisch)', dish1_id, '{}', '{easy}', 4, 10, 15, 25, 550, admin_id)
  RETURNING id INTO r1_id;
  INSERT INTO ingredients (recipe_id, name, amount, unit, ord) VALUES
    (r1_id, 'Spaghetti', '400', 'g', 0), (r1_id, 'Guanciale oder Pancetta', '200', 'g', 1),
    (r1_id, 'Eier', '4', 'Stueck', 2), (r1_id, 'Pecorino', '100', 'g', 3),
    (r1_id, 'Schwarzer Pfeffer', '2', 'TL', 4);
  INSERT INTO steps (recipe_id, instruction, ord) VALUES
    (r1_id, 'Spaghetti in Salzwasser al dente kochen', 0),
    (r1_id, 'Guanciale in Streifen schneiden und knusprig braten', 1),
    (r1_id, 'Eier mit Pecorino verruehren', 2),
    (r1_id, 'Heisse Spaghetti zur Pfanne geben, Eier dazu und cremig ruehren', 3),
    (r1_id, 'Mit Pfeffer bestreut servieren', 4);

  -- Recipe 2: Vegane Carbonara
  INSERT INTO recipes (title, dish_id, contains_flags, attributes, servings, prep_time, cook_time, total_time, calories, owner_id)
  VALUES ('Vegane Carbonara', dish1_id, '{vegan}', '{easy}', 4, 10, 15, 25, 420, admin_id)
  RETURNING id INTO r2_id;
  INSERT INTO ingredients (recipe_id, name, amount, unit, ord) VALUES
    (r2_id, 'Vollkornspaghetti', '400', 'g', 0), (r2_id, 'Raeuchertofu', '200', 'g', 1),
    (r2_id, 'Cashewmus', '3', 'EL', 2), (r2_id, 'Hefeflocken', '3', 'EL', 3),
    (r2_id, 'Knoblauch', '2', 'Zehen', 4);
  INSERT INTO steps (recipe_id, instruction, ord) VALUES
    (r2_id, 'Spaghetti kochen', 0), (r2_id, 'Tofu wuerfeln und anbraten', 1),
    (r2_id, 'Cashewmus mit Hefeflocken und Wasser zu Sauce mischen', 2),
    (r2_id, 'Alles vermengen und servieren', 3);

  -- Recipe 3: Haehnchen Curry
  INSERT INTO recipes (title, dish_id, contains_flags, attributes, servings, prep_time, cook_time, total_time, calories, owner_id)
  VALUES ('Haehnchen Curry (Klassisch)', dish2_id, '{}', '{medium}', 4, 15, 30, 45, 480, admin_id)
  RETURNING id INTO r3_id;
  INSERT INTO ingredients (recipe_id, name, amount, unit, ord) VALUES
    (r3_id, 'Haehnchenbrust', '500', 'g', 0), (r3_id, 'Kokosmilch', '400', 'ml', 1),
    (r3_id, 'Currypaste', '3', 'EL', 2), (r3_id, 'Zwiebeln', '2', 'Stueck', 3),
    (r3_id, 'Basmatireis', '300', 'g', 4);
  INSERT INTO steps (recipe_id, instruction, ord) VALUES
    (r3_id, 'Haehnchen wuerfeln und anbraten', 0),
    (r3_id, 'Zwiebeln und Currypaste anschwitzen', 1),
    (r3_id, 'Kokosmilch angiessen und coecheln lassen', 2),
    (r3_id, 'Reis kochen und Curry servieren', 3);

  -- Recipe 4: Veganes Kuerbis Curry
  INSERT INTO recipes (title, dish_id, contains_flags, attributes, servings, prep_time, cook_time, total_time, calories, owner_id)
  VALUES ('Veganes Kuerbis Curry', dish2_id, '{vegan}', '{easy}', 4, 10, 25, 35, 350, admin_id)
  RETURNING id INTO r4_id;
  INSERT INTO ingredients (recipe_id, name, amount, unit, ord) VALUES
    (r4_id, 'Hokkaido-Kuerbis', '600', 'g', 0), (r4_id, 'Kokosmilch', '400', 'ml', 1),
    (r4_id, 'Rote Currypaste', '2', 'EL', 2), (r4_id, 'Kichererbsen', '1', 'Dose', 3),
    (r4_id, 'Reis', '250', 'g', 4);
  INSERT INTO steps (recipe_id, instruction, ord) VALUES
    (r4_id, 'Kuerbis wuerfeln und anbraten', 0),
    (r4_id, 'Currypaste zugeben und anschwitzen', 1),
    (r4_id, 'Kokosmilch und Kichererbsen zugeben, 20 Min coecheln', 2),
    (r4_id, 'Mit Reis servieren', 3);

  -- Recipe 5: Doener
  INSERT INTO recipes (title, dish_id, contains_flags, attributes, servings, prep_time, cook_time, total_time, calories, owner_id)
  VALUES ('Doener (Klassisch)', dish3_id, '{}', '{easy}', 2, 10, 10, 20, 650, admin_id)
  RETURNING id INTO r5_id;
  INSERT INTO ingredients (recipe_id, name, amount, unit, ord) VALUES
    (r5_id, 'Doenerfleisch', '300', 'g', 0), (r5_id, 'Fladenbrot', '2', 'Stueck', 1),
    (r5_id, 'Eisbergsalat', '100', 'g', 2), (r5_id, 'Rotkraut', '100', 'g', 3),
    (r5_id, 'Knoblauchsauce', '4', 'EL', 4);
  INSERT INTO steps (recipe_id, instruction, ord) VALUES
    (r5_id, 'Doenerfleisch in der Pfanne scharf anbraten', 0),
    (r5_id, 'Fladenbrot aufschneiden und kurz toasten', 1),
    (r5_id, 'Brot mit Salat, Kraut und Fleisch fuellen', 2),
    (r5_id, 'Mit Sauce betraeufeln und servieren', 3);

  -- Recipe 6: Buddha Bowl
  INSERT INTO recipes (title, dish_id, contains_flags, attributes, servings, prep_time, cook_time, total_time, calories, owner_id)
  VALUES ('Buddha Bowl (Klassisch)', dish4_id, '{vegan,gluten-free}', '{medium}', 2, 20, 25, 45, 380, admin_id)
  RETURNING id INTO r6_id;
  INSERT INTO ingredients (recipe_id, name, amount, unit, ord) VALUES
    (r6_id, 'Quinoa', '150', 'g', 0), (r6_id, 'Avocado', '1', 'Stueck', 1),
    (r6_id, 'Kichererbsen', '200', 'g', 2), (r6_id, 'Suesskartoffel', '1', 'Stueck', 3),
    (r6_id, 'Granatapfelkerne', '50', 'g', 4);
  INSERT INTO steps (recipe_id, instruction, ord) VALUES
    (r6_id, 'Quinoa nach Packungsanweisung kochen', 0),
    (r6_id, 'Suesskartoffel wuerfeln und im Ofen backen', 1),
    (r6_id, 'Kichererbsen anbraten', 2),
    (r6_id, 'Alles in einer Bowl anrichten, Avocado und Granatapfel obenauf', 3);

  -- Recipe 7: Kaiserschmarrn
  INSERT INTO recipes (title, dish_id, contains_flags, attributes, servings, prep_time, cook_time, total_time, calories, owner_id)
  VALUES ('Kaiserschmarrn (Klassisch)', dish5_id, '{vegetarian}', '{easy}', 2, 15, 20, 35, 520, admin_id)
  RETURNING id INTO r7_id;
  INSERT INTO ingredients (recipe_id, name, amount, unit, ord) VALUES
    (r7_id, 'Mehl', '200', 'g', 0), (r7_id, 'Milch', '250', 'ml', 1),
    (r7_id, 'Eier', '3', 'Stueck', 2), (r7_id, 'Zucker', '50', 'g', 3),
    (r7_id, 'Rosinen', '50', 'g', 4), (r7_id, 'Butter', '30', 'g', 5);
  INSERT INTO steps (recipe_id, instruction, ord) VALUES
    (r7_id, 'Mehl, Milch, Eigelb und Zucker zu glattem Teig verruehren', 0),
    (r7_id, 'Eiweiss steif schlagen und unterheben', 1),
    (r7_id, 'In der Pfanne mit Butter goldbraun backen', 2),
    (r7_id, 'In Stuecke zerteilen, mit Rosinen bestreuen und mit Apfelmus servieren', 3);

  RAISE NOTICE 'Seed inserted: 5 dishes, 7 recipes';
END $$;
