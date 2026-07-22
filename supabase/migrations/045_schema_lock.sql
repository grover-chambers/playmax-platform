-- Migration 045: Schema lock — reconcile drift between migration files and live DB
-- This ensures that running all migrations sequentially reproduces the current schema.

BEGIN;

-- ══════════════════════════════════════════════════════════
-- 1. analytics_fact_sales — add missing columns
-- ══════════════════════════════════════════════════════════
ALTER TABLE public.analytics_fact_sales
  ADD COLUMN IF NOT EXISTS supplier_id uuid REFERENCES public.analytics_suppliers(id),
  ADD COLUMN IF NOT EXISTS sub_category_id uuid;

-- ══════════════════════════════════════════════════════════
-- 2. analytics_fact_inventory — replace table with current schema
-- Migration 006 defined a snapshot-based table; the live DB uses a period-based model.
-- ══════════════════════════════════════════════════════════
DO $$
BEGIN
  -- Drop old table if it still has the old schema (snapshot-based)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'analytics_fact_inventory'
    AND column_name = 'snapshot_date'
  ) THEN
    DROP TABLE IF EXISTS public.analytics_fact_inventory CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.analytics_fact_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id uuid NOT NULL REFERENCES public.analytics_periods(id),
  branch_id uuid NOT NULL REFERENCES public.analytics_branches(id),
  category_id uuid REFERENCES public.analytics_categories(id),
  product_id uuid NOT NULL REFERENCES public.analytics_products(id),
  opening_stock numeric(15,3) DEFAULT 0,
  closing_stock numeric(15,3) DEFAULT 0,
  received numeric(15,3) DEFAULT 0,
  sold numeric(15,3) DEFAULT 0,
  adjustments numeric(15,3) DEFAULT 0,
  stock_value numeric(15,2) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE (period_id, branch_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_analytics_fact_inventory_period
  ON public.analytics_fact_inventory(period_id);
CREATE INDEX IF NOT EXISTS idx_analytics_fact_inventory_category
  ON public.analytics_fact_inventory(category_id);

ALTER TABLE public.analytics_fact_inventory ENABLE ROW LEVEL SECURITY;

-- ══════════════════════════════════════════════════════════
-- 3. analytics_fact_pricing — add missing columns
-- Migration 008/011 defined a minimal schema; live DB has many more columns.
-- ══════════════════════════════════════════════════════════
ALTER TABLE public.analytics_fact_pricing
  ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES public.analytics_categories(id),
  ADD COLUMN IF NOT EXISTS sub_category_id uuid,
  ADD COLUMN IF NOT EXISTS unit_price numeric(15,2),
  ADD COLUMN IF NOT EXISTS unit_cost numeric(15,2),
  ADD COLUMN IF NOT EXISTS discount_pct numeric(5,2),
  ADD COLUMN IF NOT EXISTS min_quantity numeric(15,3),
  ADD COLUMN IF NOT EXISTS max_quantity numeric(15,3),
  ADD COLUMN IF NOT EXISTS tier text,
  ADD COLUMN IF NOT EXISTS currency text DEFAULT 'KES',
  ADD COLUMN IF NOT EXISTS effective_date date,
  ADD COLUMN IF NOT EXISTS notes text;

-- Make branch_id NOT NULL if it wasn't
ALTER TABLE public.analytics_fact_pricing
  ALTER COLUMN branch_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_analytics_fact_pricing_category
  ON public.analytics_fact_pricing(category_id);
CREATE INDEX IF NOT EXISTS idx_analytics_fact_pricing_sub_category
  ON public.analytics_fact_pricing(sub_category_id);

-- ══════════════════════════════════════════════════════════
-- 4. analytics_products — add missing columns
-- ══════════════════════════════════════════════════════════
ALTER TABLE public.analytics_products
  ADD COLUMN IF NOT EXISTS pack_size text,
  ADD COLUMN IF NOT EXISTS sub_category_id uuid,
  ADD COLUMN IF NOT EXISTS default_supplier_id uuid REFERENCES public.analytics_suppliers(id);

-- ══════════════════════════════════════════════════════════
-- 5. analytics_suppliers — add missing columns
-- ══════════════════════════════════════════════════════════
ALTER TABLE public.analytics_suppliers
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS country text DEFAULT 'Kenya',
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS payment_terms text,
  ADD COLUMN IF NOT EXISTS lead_time_days int;

-- ══════════════════════════════════════════════════════════
-- 6. analytics_staging_uploads — add missing columns + update check
-- ══════════════════════════════════════════════════════════
ALTER TABLE public.analytics_staging_uploads
  ADD COLUMN IF NOT EXISTS sub_category_id uuid;

-- Widen the file_type check constraint to include current values
ALTER TABLE public.analytics_staging_uploads
  DROP CONSTRAINT IF EXISTS analytics_staging_uploads_file_type_check;

ALTER TABLE public.analytics_staging_uploads
  ADD CONSTRAINT analytics_staging_uploads_file_type_check
  CHECK (file_type IN ('per_store_sales','chain_wide_sales','inventory','pricing','stock_movements'));

-- ══════════════════════════════════════════════════════════
-- 8. Re-run RLS policies for recreated/dropped tables
-- ══════════════════════════════════════════════════════════
-- analytics_fact_inventory (was recreated by this migration)
DROP POLICY IF EXISTS "admin can read analytics_fact_inventory" ON public.analytics_fact_inventory;
DROP POLICY IF EXISTS "admin can insert analytics_fact_inventory" ON public.analytics_fact_inventory;
DROP POLICY IF EXISTS "admin can update analytics_fact_inventory" ON public.analytics_fact_inventory;
DROP POLICY IF EXISTS "admin can delete analytics_fact_inventory" ON public.analytics_fact_inventory;
DROP POLICY IF EXISTS "client can read analytics_fact_inventory" ON public.analytics_fact_inventory;

CREATE POLICY "admin can read analytics_fact_inventory" ON public.analytics_fact_inventory
  FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "admin can insert analytics_fact_inventory" ON public.analytics_fact_inventory
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "admin can update analytics_fact_inventory" ON public.analytics_fact_inventory
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "admin can delete analytics_fact_inventory" ON public.analytics_fact_inventory
  FOR DELETE TO authenticated USING (public.is_admin());
CREATE POLICY "client can read analytics_fact_inventory" ON public.analytics_fact_inventory
  FOR SELECT TO authenticated USING (public.user_role() = 'client');

COMMIT;
