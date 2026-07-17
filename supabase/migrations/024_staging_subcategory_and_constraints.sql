-- ================================================================
-- Migration 024: Add sub_category_id to staging_uploads + safe constraints
-- ================================================================
BEGIN;

-- 1. Add sub_category_id to analytics_staging_uploads
ALTER TABLE public.analytics_staging_uploads
  ADD COLUMN IF NOT EXISTS sub_category_id uuid;

-- 2. De-dupe analytics_fact_sales (safe — one group at a time)
WITH dups AS (
  SELECT id, row_number() OVER (
    PARTITION BY period_id, branch_id, product_id
    ORDER BY created_at DESC
  ) AS rn
  FROM analytics_fact_sales
)
DELETE FROM analytics_fact_sales
WHERE id IN (SELECT id FROM dups WHERE rn > 1);

-- 3. UNIQUE constraints (de-duped above, safe to add)
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
WITH dups AS (
  SELECT id, row_number() OVER (
    PARTITION BY period_id, product_id, branch_id
    ORDER BY created_at DESC
  ) AS rn
  FROM analytics_fact_pricing
)
DELETE FROM analytics_fact_pricing
WHERE id IN (SELECT id FROM dups WHERE rn > 1);

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
WITH dups AS (
  SELECT id, row_number() OVER (
    PARTITION BY snapshot_date, product_id, branch_id
    ORDER BY created_at DESC
  ) AS rn
  FROM analytics_fact_inventory
)
DELETE FROM analytics_fact_inventory
WHERE id IN (SELECT id FROM dups WHERE rn > 1);

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

-- 4. Branch summary UNIQUE constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'analytics_fact_branch_summary_branch_period_supplier_key'
  ) THEN
    ALTER TABLE public.analytics_fact_branch_summary
      ADD CONSTRAINT analytics_fact_branch_summary_branch_period_supplier_key
      UNIQUE (branch_id, period_id, supplier_name);
  END IF;
END $$;

-- 5. Supplier products UNIQUE constraint
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

-- 6. Products stock_code UNIQUE constraint
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

COMMIT;
