-- ================================================================
-- Migration 022: Add missing UNIQUE constraints on fact tables
-- Required for upsert (ON CONFLICT) to work in the import pipeline.
-- ================================================================

-- 0. De-dupe analytics_fact_sales (keep latest per group)
DELETE FROM analytics_fact_sales a
USING analytics_fact_sales b
WHERE a.id < b.id
  AND a.period_id = b.period_id
  AND a.branch_id = b.branch_id
  AND a.product_id = b.product_id;

-- 1. UNIQUE on analytics_fact_sales
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'analytics_fact_sales_period_branch_product_key'
  ) THEN
    ALTER TABLE public.analytics_fact_sales
      ADD CONSTRAINT analytics_fact_sales_period_branch_product_key
      UNIQUE (period_id, branch_id, product_id);
  END IF;
END $$;

-- De-dupe analytics_fact_pricing
DELETE FROM analytics_fact_pricing a
USING analytics_fact_pricing b
WHERE a.id < b.id
  AND a.period_id = b.period_id
  AND a.product_id = b.product_id
  AND COALESCE(a.branch_id, '') = COALESCE(b.branch_id, '');

-- 2. UNIQUE on analytics_fact_pricing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'analytics_fact_pricing_period_product_branch_key'
  ) THEN
    ALTER TABLE public.analytics_fact_pricing
      ADD CONSTRAINT analytics_fact_pricing_period_product_branch_key
      UNIQUE (period_id, product_id, branch_id);
  END IF;
END $$;

-- De-dupe analytics_fact_inventory
DELETE FROM analytics_fact_inventory a
USING analytics_fact_inventory b
WHERE a.id < b.id
  AND a.snapshot_date = b.snapshot_date
  AND a.product_id = b.product_id
  AND COALESCE(a.branch_id, '') = COALESCE(b.branch_id, '');

-- 3. UNIQUE on analytics_fact_inventory
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'analytics_fact_inventory_snapshot_product_branch_key'
  ) THEN
    ALTER TABLE public.analytics_fact_inventory
      ADD CONSTRAINT analytics_fact_inventory_snapshot_product_branch_key
      UNIQUE (snapshot_date, product_id, branch_id);
  END IF;
END $$;

-- 4. Ensure analytics_supplier_products has the right unique constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'analytics_supplier_products_supplier_product_key'
  ) THEN
    ALTER TABLE public.analytics_supplier_products
      ADD CONSTRAINT analytics_supplier_products_supplier_product_key
      UNIQUE (supplier_id, product_id);
  END IF;
END $$;

-- 5. Ensure analytics_products has UNIQUE on stock_code
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'analytics_products_stock_code_key'
  ) THEN
    ALTER TABLE public.analytics_products
      ADD CONSTRAINT analytics_products_stock_code_key
      UNIQUE (stock_code);
  END IF;
END $$;
