-- ═══════════════════════════════════════════════════════════════
-- Migration 013: Supplier-product junction + supplier_id on facts
-- 1. Create analytics_supplier_products junction table
-- 2. Add supplier_id to analytics_fact_sales
-- 3. Add supplier_id to analytics_fact_inventory
-- 4. Create upload preset for product_master and supplier_products
-- ═══════════════════════════════════════════════════════════════

BEGIN;

-- ── 1. Supplier-Product junction table ───────────────────────
-- Tracks which supplier carries which product.
-- Same stock_code can appear under multiple suppliers.
CREATE TABLE IF NOT EXISTS public.analytics_supplier_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL REFERENCES public.analytics_suppliers(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.analytics_products(id) ON DELETE CASCADE,
  supplier_item_code text,
  pack_size text,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE (supplier_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_supplier_products_supplier ON public.analytics_supplier_products(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_products_product ON public.analytics_supplier_products(product_id);

DROP POLICY IF EXISTS "admin can read supplier_products" ON public.analytics_supplier_products;
DROP POLICY IF EXISTS "admin can insert supplier_products" ON public.analytics_supplier_products;
DROP POLICY IF EXISTS "admin can update supplier_products" ON public.analytics_supplier_products;
DROP POLICY IF EXISTS "admin can delete supplier_products" ON public.analytics_supplier_products;

ALTER TABLE public.analytics_supplier_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin can read supplier_products" ON public.analytics_supplier_products
  FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "admin can insert supplier_products" ON public.analytics_supplier_products
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "admin can update supplier_products" ON public.analytics_supplier_products
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "admin can delete supplier_products" ON public.analytics_supplier_products
  FOR DELETE TO authenticated USING (public.is_admin());

-- ── 2. Add supplier_id to analytics_fact_sales ───────────────
ALTER TABLE public.analytics_fact_sales
  ADD COLUMN IF NOT EXISTS supplier_id uuid REFERENCES public.analytics_suppliers(id);

CREATE INDEX IF NOT EXISTS idx_fact_sales_supplier ON public.analytics_fact_sales(supplier_id);

-- ── 3. Add supplier_id to analytics_fact_inventory ───────────
ALTER TABLE public.analytics_fact_inventory
  ADD COLUMN IF NOT EXISTS supplier_id uuid REFERENCES public.analytics_suppliers(id);

CREATE INDEX IF NOT EXISTS idx_fact_inventory_supplier ON public.analytics_fact_inventory(supplier_id);

-- ── 4. Extend staging_uploads file_type enum ─────────────────
-- Allow the new preset format types
ALTER TABLE public.analytics_staging_uploads
  DROP CONSTRAINT IF EXISTS analytics_staging_uploads_file_type_check;

ALTER TABLE public.analytics_staging_uploads
  ADD CONSTRAINT analytics_staging_uploads_file_type_check
  CHECK (file_type IN (
    'per_store_sales',
    'chain_wide_sales',
    'inventory',
    'sales_transactions',
    'stock_movements',
    'supplier_details',
    'pricing',
    'product_master',
    'supplier_products'
  ));

-- ── 5. Extend analytics_products with supplier reference ─────
-- Add a default_supplier_id for products that have a primary supplier
ALTER TABLE public.analytics_products
  ADD COLUMN IF NOT EXISTS default_supplier_id uuid REFERENCES public.analytics_suppliers(id);

ALTER TABLE public.analytics_products
  ADD COLUMN IF NOT EXISTS pack_size text;

COMMIT;
