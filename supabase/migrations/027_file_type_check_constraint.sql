-- ================================================================
-- Migration 027: Add item_list_master to file_type check constraint
-- ================================================================
-- The analytics_staging_uploads.file_type check constraint must include
-- the new item_list_master upload format.
-- ================================================================

BEGIN;

-- Drop and recreate the check constraint with item_list_master
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
    'supplier_products',
    'item_list_master'
  ));

COMMIT;