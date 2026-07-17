-- ================================================================
-- Migration 023: Add subcategories dimension + seed all 27 categories
-- Links categories → subcategories → products → fact tables
-- ================================================================

BEGIN;

-- 1. Create subcategories dimension
CREATE TABLE IF NOT EXISTS public.analytics_subcategories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES public.analytics_categories(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (category_id, name)
);

-- 2. Add sub_category_id FK to products (alongside existing text field)
ALTER TABLE public.analytics_products
  ADD COLUMN IF NOT EXISTS sub_category_id uuid REFERENCES public.analytics_subcategories(id);

-- 3. Add sub_category_id to fact_sales for filtering
ALTER TABLE public.analytics_fact_sales
  ADD COLUMN IF NOT EXISTS sub_category_id uuid REFERENCES public.analytics_subcategories(id);

-- 4. Add category_id + sub_category_id to fact_pricing (was missing)
ALTER TABLE public.analytics_fact_pricing
  ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES public.analytics_categories(id),
  ADD COLUMN IF NOT EXISTS sub_category_id uuid REFERENCES public.analytics_subcategories(id);

-- 5. Add category_id + sub_category_id to fact_inventory (was missing)
ALTER TABLE public.analytics_fact_inventory
  ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES public.analytics_categories(id),
  ADD COLUMN IF NOT EXISTS sub_category_id uuid REFERENCES public.analytics_subcategories(id);

-- 6. Indexes
CREATE INDEX IF NOT EXISTS idx_subcategories_category ON public.analytics_subcategories(category_id);
CREATE INDEX IF NOT EXISTS idx_products_sub_category ON public.analytics_products(sub_category_id);
CREATE INDEX IF NOT EXISTS idx_fact_sales_sub_category ON public.analytics_fact_sales(sub_category_id);
CREATE INDEX IF NOT EXISTS idx_fact_pricing_category ON public.analytics_fact_pricing(category_id);
CREATE INDEX IF NOT EXISTS idx_fact_inventory_category ON public.analytics_fact_inventory(category_id);

-- 7. RLS
ALTER TABLE public.analytics_subcategories ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'admin can read analytics_subcategories' AND tablename = 'analytics_subcategories') THEN
    CREATE POLICY "admin can read analytics_subcategories" ON public.analytics_subcategories
      FOR SELECT TO authenticated USING (public.is_admin());
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'admin can insert analytics_subcategories' AND tablename = 'analytics_subcategories') THEN
    CREATE POLICY "admin can insert analytics_subcategories" ON public.analytics_subcategories
      FOR INSERT TO authenticated WITH CHECK (public.is_admin());
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'admin can update analytics_subcategories' AND tablename = 'analytics_subcategories') THEN
    CREATE POLICY "admin can update analytics_subcategories" ON public.analytics_subcategories
      FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'admin can delete analytics_subcategories' AND tablename = 'analytics_subcategories') THEN
    CREATE POLICY "admin can delete analytics_subcategories" ON public.analytics_subcategories
      FOR DELETE TO authenticated USING (public.is_admin());
  END IF;
END $$;

-- 8. ── Seed: 27 categories + subcategories from CATEGORIES AND SUB.xlsx ──

-- Upsert categories (idempotent)
INSERT INTO public.analytics_categories (name) VALUES
  ('BABY CARE'),
  ('BAKING PRODUCTS'),
  ('BODY CARE'),
  ('CEREALS'),
  ('COLD BEVERAGE'),
  ('CONFECTIONERY'),
  ('COOKING OILS & FATS'),
  ('DAIPER'),
  ('FERTILIZER'),
  ('FLOUR'),
  ('FOOTWARE'),
  ('HANDWASH & SANITIZER'),
  ('JAM, HONEY & SPREADS'),
  ('HOT BEVERAGES'),
  ('HOUSEHOLD'),
  ('INSECTICIDE'),
  ('LIGHTING PRODUCTS'),
  ('ORAL CARE'),
  ('PACKING MATERIALS'),
  ('PHARMACY'),
  ('RICE'),
  ('PASTA & PULSES'),
  ('SANITARY PRODUCTS'),
  ('SNACKS'),
  ('SOAP & DETERGENTS'),
  ('SPICES & SPICES'),
  ('STATIONERY'),
  ('SUGAR'),
  ('TOILETRIES'),
  ('WRAPPING MATERIALS')
ON CONFLICT (name) DO NOTHING;

-- Upsert subcategories (uses a CTE to look up parent category)
WITH cat AS (SELECT id, name FROM public.analytics_categories)
INSERT INTO public.analytics_subcategories (category_id, name)
SELECT c.id, s.sub_name FROM cat c
INNER JOIN (VALUES
  ('BABY CARE', 'BABYPOWDERS'),
  ('BABY CARE', 'BABYFORMULA'),
  ('BABY CARE', 'CERELEC'),
  ('BAKING PRODUCTS', 'YEAST'),
  ('BAKING PRODUCTS', 'BAKING POWDER'),
  ('BODY CARE', 'COSMETICS'),
  ('BODY CARE', 'GLYCERINE'),
  ('BODY CARE', 'JELLIES'),
  ('BODY CARE', 'HAIROILS'),
  ('BODY CARE', 'LOTIONS'),
  ('CEREALS', 'WEETABIX'),
  ('CEREALS', 'SOSSI'),
  ('COLD BEVERAGE', 'ENERGY DRINKS'),
  ('COLD BEVERAGE', 'MILK'),
  ('COLD BEVERAGE', 'WATER'),
  ('COLD BEVERAGE', 'JUICE'),
  ('COLD BEVERAGE', 'SOFT DRINKS & SODA'),
  ('COLD BEVERAGE', 'POWDERED JUICE'),
  ('CONFECTIONERY', 'BALL GUMS'),
  ('CONFECTIONERY', 'CHEWING GUMS'),
  ('CONFECTIONERY', 'LOLLIPOPS'),
  ('CONFECTIONERY', 'HARD SWEETS'),
  ('CONFECTIONERY', 'CHOCOLATE'),
  ('COOKING OILS & FATS', 'WHITE FATS'),
  ('COOKING OILS & FATS', 'YELLOW FATS'),
  ('COOKING OILS & FATS', 'OILS'),
  ('DAIPER', 'ADULT DAIPER'),
  ('DAIPER', 'BABY DAIPERS'),
  ('FERTILIZER', 'DAP'),
  ('FERTILIZER', 'CAN'),
  ('FERTILIZER', '17-17'),
  ('FERTILIZER', '23-23'),
  ('FERTILIZER', 'UREA'),
  ('FLOUR', 'MAIZE FLOUR'),
  ('FLOUR', 'WHEAT FLOUR'),
  ('FLOUR', 'ALL PURPOSE'),
  ('FLOUR', 'SELF RAISING'),
  ('FLOUR', 'UJI MIX'),
  ('FLOUR', 'WIMBI'),
  ('FOOTWARE', 'GUMBOOTS'),
  ('FOOTWARE', 'SHOE POLISH'),
  ('FOOTWARE', 'SHOES'),
  ('FOOTWARE', 'SLIPPERS'),
  ('HANDWASH & SANITIZER', 'HANDWASH'),
  ('HANDWASH & SANITIZER', 'SANITIZER'),
  ('HANDWASH & SANITIZER', 'DISINFECTANTS(DETTOL)'),
  ('HANDWASH & SANITIZER', 'SPIRIT'),
  ('JAM, HONEY & SPREADS', 'SPREADS'),
  ('JAM, HONEY & SPREADS', 'JAM'),
  ('JAM, HONEY & SPREADS', 'HONEY'),
  ('JAM, HONEY & SPREADS', 'PEANUT BUTTER'),
  ('HOT BEVERAGES', 'CHOCOLATE'),
  ('HOT BEVERAGES', 'COCOA'),
  ('HOT BEVERAGES', 'COFFEE'),
  ('HOT BEVERAGES', 'TEA LEAVES'),
  ('HOUSEHOLD', 'BROOMS'),
  ('HOUSEHOLD', 'MOPS'),
  ('HOUSEHOLD', 'PEGS'),
  ('HOUSEHOLD', 'PLASTICS'),
  ('HOUSEHOLD', 'STRAWS'),
  ('INSECTICIDE', 'SPRAYS'),
  ('INSECTICIDE', 'COILS'),
  ('INSECTICIDE', 'RAT TRAPS'),
  ('LIGHTING PRODUCTS', 'BULBS'),
  ('LIGHTING PRODUCTS', 'CANDLE'),
  ('LIGHTING PRODUCTS', 'MATCHBOX'),
  ('ORAL CARE', 'TOOTHBRUSH'),
  ('ORAL CARE', 'TOOTHPASTE'),
  ('ORAL CARE', 'TOOTHPICKS'),
  ('PACKING MATERIALS', 'SISALS'),
  ('PACKING MATERIALS', 'CELOTAPE'),
  ('PACKING MATERIALS', 'WASTE PAPER'),
  ('PHARMACY', 'MEDICINES'),
  ('PHARMACY', 'ELASTOPLAST'),
  ('PHARMACY', 'WATER GUARD'),
  ('RICE', 'PARBOILED'),
  ('RICE', 'SHORT GRAIN'),
  ('RICE', 'LONG GRAIN'),
  ('RICE', 'LOCAL'),
  ('RICE', 'IMPORTED'),
  ('PASTA & PULSES', 'NOODLES'),
  ('PASTA & PULSES', 'SPAGHETTI'),
  ('PASTA & PULSES', 'PULSES (NDENGU, BEANS, MAIZE)'),
  ('SANITARY PRODUCTS', 'PADS'),
  ('SANITARY PRODUCTS', 'COTTON WOOL'),
  ('SANITARY PRODUCTS', 'CONDOMS'),
  ('SANITARY PRODUCTS', 'RAZOR BLADES'),
  ('SNACKS', 'BISCUITS'),
  ('SNACKS', 'BITES AND RINGOS'),
  ('SNACKS', 'GLUCOSE'),
  ('SOAP & DETERGENTS', 'BODY SOAP'),
  ('SOAP & DETERGENTS', 'BAR SOAPS'),
  ('SOAP & DETERGENTS', 'POWDER SOAP'),
  ('SOAP & DETERGENTS', 'LIQUID SOAP'),
  ('SOAP & DETERGENTS', 'WASHING PASTE'),
  ('SOAP & DETERGENTS', 'FABRIC SOFTENER'),
  ('SPICES & SPICES', 'SALT'),
  ('SPICES & SPICES', 'SPICES'),
  ('SPICES & SPICES', 'PASTES (COCONUT OIL, TOMATO PASTE)'),
  ('STATIONERY', 'PENS'),
  ('STATIONERY', 'BOOKS'),
  ('STATIONERY', 'CBC MATERIALS'),
  ('STATIONERY', 'GEOMETRIC SETS'),
  ('STATIONERY', 'PENCILS'),
  ('STATIONERY', 'PRINTING PAPERS'),
  ('STATIONERY', 'RAZOR BLADES'),
  ('SUGAR', 'IMPORTED'),
  ('SUGAR', 'LOCAL'),
  ('SUGAR', 'BROWN SUGAR'),
  ('SUGAR', 'WHITE SUGAR'),
  ('TOILETRIES', 'TISSUES'),
  ('TOILETRIES', 'SERVIETTES'),
  ('TOILETRIES', 'TOILET CLEANERS'),
  ('TOILETRIES', 'AIR FRESHNER'),
  ('WRAPPING MATERIALS', 'ALUMINIUM FOILS'),
  ('WRAPPING MATERIALS', 'CLINGFILM')
) AS s(cat_name, sub_name) ON c.name = s.cat_name
ON CONFLICT (category_id, name) DO NOTHING;

COMMIT;
