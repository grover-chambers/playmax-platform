-- ═══════════════════════════════════════════════════════════════
-- Migration 006: Analytics engine – star schema for FMCG retail
-- 5 dimensions, 2 fact tables, 2 staging tables
-- ═══════════════════════════════════════════════════════════════

BEGIN;

-- ── Dimension: Branches (10 retailer stores) ─────────────
CREATE TABLE IF NOT EXISTS public.analytics_branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  city text,
  region text,
  tier text DEFAULT 'standard' CHECK (tier IN ('standard','flagship','express')),
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- ── Dimension: Periods (time buckets from reports) ──────
CREATE TABLE IF NOT EXISTS public.analytics_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  year int GENERATED ALWAYS AS (EXTRACT(YEAR FROM start_date)) STORED,
  quarter int GENERATED ALWAYS AS (EXTRACT(QUARTER FROM start_date)) STORED,
  month int GENERATED ALWAYS AS (EXTRACT(MONTH FROM start_date)) STORED,
  created_at timestamptz DEFAULT now(),
  UNIQUE (start_date, end_date)
);

-- ── Dimension: Categories (from product master) ─────────
CREATE TABLE IF NOT EXISTS public.analytics_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

-- ── Dimension: Manufacturers (inferred from products) ───
CREATE TABLE IF NOT EXISTS public.analytics_manufacturers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  code text,
  created_at timestamptz DEFAULT now()
);

-- ── Dimension: Products (master list from inventory) ────
CREATE TABLE IF NOT EXISTS public.analytics_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_code text UNIQUE NOT NULL,
  name text NOT NULL,
  category_id uuid REFERENCES public.analytics_categories(id),
  manufacturer_id uuid REFERENCES public.analytics_manufacturers(id),
  sub_category text,
  unit_of_measure text DEFAULT 'pcs',
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ── Staging: Upload batches ────────────────────────────
CREATE TABLE IF NOT EXISTS public.analytics_staging_uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  filename text NOT NULL,
  file_type text NOT NULL CHECK (file_type IN ('per_store_sales','chain_wide_sales','inventory')),
  status text NOT NULL DEFAULT 'uploaded' CHECK (status IN ('uploaded','parsed','validated','imported','failed')),
  period_id uuid REFERENCES public.analytics_periods(id),
  branch_id uuid REFERENCES public.analytics_branches(id),
  category_id uuid REFERENCES public.analytics_categories(id),
  total_rows int DEFAULT 0,
  error_rows int DEFAULT 0,
  metadata jsonb DEFAULT '{}',
  uploaded_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ── Staging: Raw parsed rows (before validation) ───────
CREATE TABLE IF NOT EXISTS public.analytics_staging_rows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id uuid REFERENCES public.analytics_staging_uploads(id) ON DELETE CASCADE,
  row_number int NOT NULL,
  stock_code text,
  product_name text,
  sub_category text,
  unit_cost numeric(15,2),
  unit_price numeric(15,2),
  quantity numeric(15,3),
  weight_tonnes numeric(15,3),
  total_amount numeric(15,2),
  raw_data jsonb,
  errors jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- ── Fact: Sales (one row per product × branch × period) ─
CREATE TABLE IF NOT EXISTS public.analytics_fact_sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id uuid NOT NULL REFERENCES public.analytics_periods(id),
  branch_id uuid NOT NULL REFERENCES public.analytics_branches(id),
  category_id uuid REFERENCES public.analytics_categories(id),
  product_id uuid NOT NULL REFERENCES public.analytics_products(id),
  quantity numeric(15,3) NOT NULL DEFAULT 0,
  weight_tonnes numeric(15,3) DEFAULT 0,
  unit_price numeric(15,2),
  total_amount numeric(15,2) NOT NULL DEFAULT 0,
  cost_amount numeric(15,2) DEFAULT 0,
  vat_amount numeric(15,2) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE (period_id, branch_id, product_id)
);

-- ── Fact: Inventory snapshots ──────────────────────────
CREATE TABLE IF NOT EXISTS public.analytics_fact_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date date NOT NULL,
  product_id uuid NOT NULL REFERENCES public.analytics_products(id),
  branch_id uuid REFERENCES public.analytics_branches(id),
  quantity_on_hand numeric(15,3) NOT NULL DEFAULT 0,
  unit_cost numeric(15,2),
  total_value numeric(15,2) GENERATED ALWAYS AS (quantity_on_hand * COALESCE(unit_cost, 0)) STORED,
  created_at timestamptz DEFAULT now(),
  UNIQUE (snapshot_date, product_id, branch_id)
);

-- ── Indexes ────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_analytics_products_category ON public.analytics_products(category_id);
CREATE INDEX IF NOT EXISTS idx_analytics_products_manufacturer ON public.analytics_products(manufacturer_id);
CREATE INDEX IF NOT EXISTS idx_analytics_products_stock_code ON public.analytics_products(stock_code);
CREATE INDEX IF NOT EXISTS idx_analytics_fact_sales_period ON public.analytics_fact_sales(period_id);
CREATE INDEX IF NOT EXISTS idx_analytics_fact_sales_branch ON public.analytics_fact_sales(branch_id);
CREATE INDEX IF NOT EXISTS idx_analytics_fact_sales_product ON public.analytics_fact_sales(product_id);
CREATE INDEX IF NOT EXISTS idx_analytics_fact_sales_category ON public.analytics_fact_sales(category_id);
CREATE INDEX IF NOT EXISTS idx_analytics_fact_inventory_product ON public.analytics_fact_inventory(product_id);
CREATE INDEX IF NOT EXISTS idx_analytics_fact_inventory_branch ON public.analytics_fact_inventory(branch_id);
CREATE INDEX IF NOT EXISTS idx_analytics_fact_inventory_date ON public.analytics_fact_inventory(snapshot_date);
CREATE INDEX IF NOT EXISTS idx_analytics_staging_rows_upload ON public.analytics_staging_rows(upload_id);
CREATE INDEX IF NOT EXISTS idx_analytics_staging_uploads_status ON public.analytics_staging_uploads(status);
CREATE INDEX IF NOT EXISTS idx_analytics_staging_uploads_period ON public.analytics_staging_uploads(period_id);
CREATE INDEX IF NOT EXISTS idx_analytics_staging_uploads_branch ON public.analytics_staging_uploads(branch_id);

-- ── RLS ────────────────────────────────────────────────
ALTER TABLE public.analytics_branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_manufacturers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_staging_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_staging_rows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_fact_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_fact_inventory ENABLE ROW LEVEL SECURITY;

-- analytics_branches
CREATE POLICY "admin can read analytics_branches" ON public.analytics_branches
  FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "admin can insert analytics_branches" ON public.analytics_branches
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "admin can update analytics_branches" ON public.analytics_branches
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "admin can delete analytics_branches" ON public.analytics_branches
  FOR DELETE TO authenticated USING (public.is_admin());

-- analytics_periods
CREATE POLICY "admin can read analytics_periods" ON public.analytics_periods
  FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "admin can insert analytics_periods" ON public.analytics_periods
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "admin can update analytics_periods" ON public.analytics_periods
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "admin can delete analytics_periods" ON public.analytics_periods
  FOR DELETE TO authenticated USING (public.is_admin());

-- analytics_categories
CREATE POLICY "admin can read analytics_categories" ON public.analytics_categories
  FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "admin can insert analytics_categories" ON public.analytics_categories
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "admin can update analytics_categories" ON public.analytics_categories
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "admin can delete analytics_categories" ON public.analytics_categories
  FOR DELETE TO authenticated USING (public.is_admin());

-- analytics_manufacturers
CREATE POLICY "admin can read analytics_manufacturers" ON public.analytics_manufacturers
  FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "admin can insert analytics_manufacturers" ON public.analytics_manufacturers
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "admin can update analytics_manufacturers" ON public.analytics_manufacturers
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "admin can delete analytics_manufacturers" ON public.analytics_manufacturers
  FOR DELETE TO authenticated USING (public.is_admin());

-- analytics_products
CREATE POLICY "admin can read analytics_products" ON public.analytics_products
  FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "admin can insert analytics_products" ON public.analytics_products
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "admin can update analytics_products" ON public.analytics_products
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "admin can delete analytics_products" ON public.analytics_products
  FOR DELETE TO authenticated USING (public.is_admin());

-- analytics_staging_uploads
CREATE POLICY "admin can read analytics_staging_uploads" ON public.analytics_staging_uploads
  FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "admin can insert analytics_staging_uploads" ON public.analytics_staging_uploads
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "admin can update analytics_staging_uploads" ON public.analytics_staging_uploads
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "admin can delete analytics_staging_uploads" ON public.analytics_staging_uploads
  FOR DELETE TO authenticated USING (public.is_admin());

-- analytics_staging_rows
CREATE POLICY "admin can read analytics_staging_rows" ON public.analytics_staging_rows
  FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "admin can insert analytics_staging_rows" ON public.analytics_staging_rows
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "admin can update analytics_staging_rows" ON public.analytics_staging_rows
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "admin can delete analytics_staging_rows" ON public.analytics_staging_rows
  FOR DELETE TO authenticated USING (public.is_admin());

-- analytics_fact_sales
CREATE POLICY "admin can read analytics_fact_sales" ON public.analytics_fact_sales
  FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "admin can insert analytics_fact_sales" ON public.analytics_fact_sales
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "admin can update analytics_fact_sales" ON public.analytics_fact_sales
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "admin can delete analytics_fact_sales" ON public.analytics_fact_sales
  FOR DELETE TO authenticated USING (public.is_admin());

-- analytics_fact_inventory
CREATE POLICY "admin can read analytics_fact_inventory" ON public.analytics_fact_inventory
  FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "admin can insert analytics_fact_inventory" ON public.analytics_fact_inventory
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "admin can update analytics_fact_inventory" ON public.analytics_fact_inventory
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "admin can delete analytics_fact_inventory" ON public.analytics_fact_inventory
  FOR DELETE TO authenticated USING (public.is_admin());

-- ── Triggers ───────────────────────────────────────────
CREATE TRIGGER set_analytics_products_updated_at
  BEFORE UPDATE ON public.analytics_products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_analytics_staging_uploads_updated_at
  BEFORE UPDATE ON public.analytics_staging_uploads
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── Seed: 10 branches ──────────────────────────────────
INSERT INTO public.analytics_branches (code, name, city, region, tier) VALUES
  ('NVS', 'Naivasha Branch', 'Naivasha', 'Rift Valley', 'standard'),
  ('NKR', 'Nakuru Branch', 'Nakuru', 'Rift Valley', 'standard'),
  ('NRK', 'Narok Branch', 'Narok', 'Rift Valley', 'standard'),
  ('NPM', 'Nampark Makongeni', 'Nairobi', 'Nairobi', 'flagship'),
  ('NYH', 'Nyahururu Branch', 'Nyahururu', 'Rift Valley', 'standard'),
  ('MER', 'Meru Branch', 'Meru', 'Eastern', 'standard'),
  ('MUA', 'Maua Branch', 'Maua', 'Eastern', 'standard'),
  ('KRT', 'Karatina Branch', 'Karatina', 'Central', 'standard'),
  ('THK', 'Thika Branch', 'Thika', 'Central', 'standard'),
  ('ENG', 'Engineer Branch', 'Engineer', 'Rift Valley', 'standard')
ON CONFLICT (code) DO NOTHING;

COMMIT;
