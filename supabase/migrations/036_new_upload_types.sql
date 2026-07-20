-- 036: Add new file types to analytics_staging_uploads check constraint
-- Adds support for: per_supplier_sales, supplier_item_allocations, pending_grns

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
    'item_list_master',
    'per_supplier_sales',
    'supplier_item_allocations',
    'pending_grns'
  ));
