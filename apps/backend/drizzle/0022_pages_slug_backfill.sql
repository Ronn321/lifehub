-- 0022_pages_slug_backfill.sql
-- Backfill: alle Seiten OHNE slug bekommen nachträglich einen eindeutigen Slug
-- (slugify-Logik wie im pages.service: Titel -> slug, Umlaute aufgelöst,
--  bei Kollision pro Owner Suffix -2, -3, ...). Idempotent: nur slug IS NULL.

DO $$
DECLARE
  p RECORD;
  base TEXT;
  candidate TEXT;
  attempt INT;
BEGIN
  FOR p IN SELECT id, title, owner_id FROM pages WHERE slug IS NULL AND deleted_at IS NULL LOOP
    base := lower(p.title);
    base := regexp_replace(base, '[ä]', 'ae', 'g');
    base := regexp_replace(base, '[ö]', 'oe', 'g');
    base := regexp_replace(base, '[ü]', 'ue', 'g');
    base := regexp_replace(base, '[ß]', 'ss', 'g');
    base := regexp_replace(base, '[^a-z0-9\s-]', '', 'g');
    base := regexp_replace(base, '[\s_]+', '-', 'g');
    base := trim(both '-' from base);
    IF length(base) > 50 THEN base := left(base, 50); END IF;
    IF base = '' THEN base := 'page'; END IF;

    candidate := base;
    attempt := 0;
    WHILE EXISTS (SELECT 1 FROM pages WHERE slug = candidate AND owner_id = p.owner_id AND id <> p.id) LOOP
      attempt := attempt + 1;
      candidate := base || '-' || attempt;
    END LOOP;

    UPDATE pages SET slug = candidate WHERE id = p.id;
  END LOOP;
END $$;
