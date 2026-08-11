-- ================================================================
-- Migration 060: Seed MILK AND DAIRY category + subcategories
-- ================================================================
-- Adds a top-level "MILK AND DAIRY" category for the next client
-- onboarding. The legacy Cold Beverage > Milk subcategory is left
-- untouched; milk products uploaded under the new category reference
-- the new parent so portal scoping stays clean.
-- ================================================================

BEGIN;

INSERT INTO public.analytics_categories (name, description) VALUES
  ('MILK AND DAIRY', 'Fresh milk, UHT milk, fermented milk, yogurt, milk powder, cream, butter, ghee and cheese')
ON CONFLICT (name) DO NOTHING;

WITH cat AS (SELECT id, name FROM public.analytics_categories)
INSERT INTO public.analytics_subcategories (category_id, name)
SELECT c.id, s.sub_name FROM cat c
INNER JOIN (VALUES
  ('MILK AND DAIRY', 'FRESH MILK'),
  ('MILK AND DAIRY', 'UHT MILK'),
  ('MILK AND DAIRY', 'MALA / FERMENTED MILK'),
  ('MILK AND DAIRY', 'YOGURT'),
  ('MILK AND DAIRY', 'MILK POWDER'),
  ('MILK AND DAIRY', 'CREAM & BUTTER'),
  ('MILK AND DAIRY', 'GHEE'),
  ('MILK AND DAIRY', 'CHEESE')
) AS s(cat_name, sub_name) ON c.name = s.cat_name
ON CONFLICT (category_id, name) DO NOTHING;

COMMIT;
