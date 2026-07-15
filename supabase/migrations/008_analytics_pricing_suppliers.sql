-- ═══════════════════════════════════════════════════════════════
-- Migration 008: Pricing fact table, suppliers, store mappings,
-- category seeds, and HQ branch
-- ═══════════════════════════════════════════════════════════════

BEGIN;

-- ── Suppliers (for future supplier data matching) ──────────
CREATE TABLE IF NOT EXISTS public.analytics_suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text UNIQUE,
  contact_person text,
  email text,
  phone text,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ── Pricing fact: cost/price per product per period ─────────
-- Each row captures Standard Cost + Selling Price from
-- per-store Items Sales Reports. supplier_id is nullable
-- and will be populated once supplier data is added later.
CREATE TABLE IF NOT EXISTS public.analytics_fact_pricing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id uuid NOT NULL REFERENCES public.analytics_periods(id),
  product_id uuid NOT NULL REFERENCES public.analytics_products(id),
  branch_id uuid REFERENCES public.analytics_branches(id),
  supplier_id uuid REFERENCES public.analytics_suppliers(id),
  standard_cost numeric(15,2),
  selling_price numeric(15,2),
  weight_tonnes numeric(15,3),
  created_at timestamptz DEFAULT now(),
  UNIQUE (period_id, product_id, branch_id)
);

-- ── Store name → branch code mapping ───────────────────────
-- Allows the import parser to resolve store names from Excel
-- files (e.g. "THIKA STORE(Nampak)") to branch codes.
CREATE TABLE IF NOT EXISTS public.analytics_store_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_name text UNIQUE NOT NULL,
  branch_code text NOT NULL REFERENCES public.analytics_branches(code),
  created_at timestamptz DEFAULT now()
);

-- ── Add HQ branch (Thika CBD store becomes HQ) ─────────────
INSERT INTO public.analytics_branches (code, name, city, region, tier)
VALUES ('HQ', 'Head Office / Thika CBD', 'Thika', 'Central', 'standard')
ON CONFLICT (code) DO NOTHING;

-- ── Seed store name → branch mappings ──────────────────────
INSERT INTO public.analytics_store_mappings (store_name, branch_code) VALUES
  ('NAIVASHA',       'NVS'),
  ('NAKURU',         'NKR'),
  ('NAROK',          'NRK'),
  ('THIKA STORE(Nampak)', 'NPM'),
  ('NYAHURURU',      'NYH'),
  ('MERU',           'MER'),
  ('MAUA',           'MUA'),
  ('KARATINA',       'KRT'),
  ('THIKA CBD',      'HQ'),
  ('HQ',             'HQ'),
  ('ENGINEER',       'ENG')
ON CONFLICT (store_name) DO NOTHING;

-- ── Seed categories from inventory master + sales reports ──
INSERT INTO public.analytics_categories (name, description) VALUES
  ('COOKING OIL & FATS', 'Cooking oils, yellow fats, white fats'),
  ('MAIZE FLOUR', 'Maize meal and maize flour products'),
  ('RICE', 'Rice products – all varieties'),
  ('SUGAR', 'Sugar products'),
  ('WHEAT FLOUR', 'Wheat flour and baking flour'),
  ('SOAP & DETERGENTS', 'Laundry soap, bar soap, detergents'),
  ('STATIONERY', 'Office and school stationery'),
  ('SNACKS', 'Chips, crisps, salted snacks'),
  ('COLD BEVERAGE', 'Soft drinks, juices, water'),
  ('FOOTWARE', 'Shoes, slippers, sandals'),
  ('HOUSEHOLD', 'Household items and utensils'),
  ('BODY CARE', 'Body lotions, creams, Vaseline'),
  ('CONFECTIONERY', 'Sweets, candies, toffees'),
  ('HOT BEVERAGE', 'Tea, coffee, cocoa'),
  ('DIAPER', 'Baby and adult diapers'),
  ('TOILETERIES', 'Toilet soap, tissue, toothpaste'),
  ('SPICES', 'Spices, seasonings, salt'),
  ('ORAL CARE', 'Toothbrushes, toothpaste, mouthwash'),
  ('PASTA & PULSES', 'Pasta, noodles, beans, lentils'),
  ('HONEY, JAM & SPREADS', 'Honey, jam, peanut butter, spreads'),
  ('SAUCE & PASTE', 'Tomato sauce, chilli sauce, pastes'),
  ('CEREALS', 'Breakfast cereals, porridge'),
  ('SANITARY PRODUCTS', 'Sanitary towels, tissues'),
  ('MALI MALI PRODUCTS', 'Mali Mali brand products'),
  ('HANDWASH & SANITIZER', 'Hand wash, sanitizer, soap'),
  ('PHARMACY', 'Over-the-counter medication'),
  ('PACKING MATERIALS', 'Packaging bags, wraps, containers'),
  ('MOTOR VEHICLES', 'Vehicle-related items'),
  ('BABY CARE', 'Baby food, milk, diapers, wipes'),
  ('LIGHTING PRODUCTS', 'Bulbs, lamps, torches'),
  ('BAKING PRODUCTS', 'Baking powder, flour, yeast'),
  ('FERTILIZER', 'Farm fertilizer products'),
  ('INSECTICIDE', 'Insecticide, mosquito repellent'),
  ('PORIDGE FLOUR', 'Porridge flour mixes'),
  ('WRAPPING MATERIALS', 'Gift wrap, cellophane'),
  ('Meat products', 'Meat and meat products'),
  ('ANIMAL FOOD', 'Pet food and animal feed')
ON CONFLICT (name) DO NOTHING;

-- ── Indexes ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_analytics_fact_pricing_period
  ON public.analytics_fact_pricing(period_id);
CREATE INDEX IF NOT EXISTS idx_analytics_fact_pricing_product
  ON public.analytics_fact_pricing(product_id);
CREATE INDEX IF NOT EXISTS idx_analytics_fact_pricing_branch
  ON public.analytics_fact_pricing(branch_id);
CREATE INDEX IF NOT EXISTS idx_analytics_fact_pricing_supplier
  ON public.analytics_fact_pricing(supplier_id);
CREATE INDEX IF NOT EXISTS idx_analytics_store_mappings_name
  ON public.analytics_store_mappings(store_name);

-- ── Triggers ───────────────────────────────────────────────
CREATE TRIGGER set_analytics_suppliers_updated_at
  BEFORE UPDATE ON public.analytics_suppliers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── RLS ────────────────────────────────────────────────────
ALTER TABLE public.analytics_suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_fact_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_store_mappings ENABLE ROW LEVEL SECURITY;

-- analytics_suppliers
CREATE POLICY "admin can read analytics_suppliers" ON public.analytics_suppliers
  FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "admin can insert analytics_suppliers" ON public.analytics_suppliers
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "admin can update analytics_suppliers" ON public.analytics_suppliers
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "admin can delete analytics_suppliers" ON public.analytics_suppliers
  FOR DELETE TO authenticated USING (public.is_admin());

-- analytics_fact_pricing
CREATE POLICY "admin can read analytics_fact_pricing" ON public.analytics_fact_pricing
  FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "admin can insert analytics_fact_pricing" ON public.analytics_fact_pricing
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "admin can update analytics_fact_pricing" ON public.analytics_fact_pricing
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "admin can delete analytics_fact_pricing" ON public.analytics_fact_pricing
  FOR DELETE TO authenticated USING (public.is_admin());

-- analytics_store_mappings
CREATE POLICY "admin can read analytics_store_mappings" ON public.analytics_store_mappings
  FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "admin can insert analytics_store_mappings" ON public.analytics_store_mappings
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "admin can update analytics_store_mappings" ON public.analytics_store_mappings
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "admin can delete analytics_store_mappings" ON public.analytics_store_mappings
  FOR DELETE TO authenticated USING (public.is_admin());

COMMIT;
