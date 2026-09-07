-- 076_missing_import_handlers.sql
-- Support the remaining upload formats (stock_movements, supplier_details,
-- pricing, sales_transactions, per_supplier_sales, supplier_item_allocations,
-- pending_grns) which were accepted by the wizard and the uploads API but had
-- no import handler in /api/analytics/uploads/[id]/import/route.ts.
--
-- 1. analytics_staging_rows loses extended fields.
--    The upload wizard maps ~25 fields (movement_type, movement_date,
--    reference_number, batch_number, expiry_date, tier, effective_date,
--    discount_pct, supplier contact fields, payment_terms, lead_time_days,
--    sale_date, customer, tax, payment_method) but the staging-rows POST only
--    persisted 8 canonical columns, so import handlers had nothing to read for
--    the extended formats. Add a mapped_fields jsonb column carrying the full
--    mapped row; the API and wizard are updated together.
--
-- 2. analytics_fact_stock_movements still only has the broken
--    is_analytics_writer()/user_role() policies from 052/053 (same root cause
--    as 075: helpers read user_metadata->role while roles live in app_metadata).
--    The import route runs on the user's RLS client, so stock movement writes
--    (stock_movements + pending_grns) need direct-JWT staff policies like 075.
BEGIN;

-- ── 1. staging_rows extended mapped fields ───────────────────
ALTER TABLE public.analytics_staging_rows
  ADD COLUMN IF NOT EXISTS mapped_fields jsonb DEFAULT '{}';

-- ── 2. analytics_fact_stock_movements direct-JWT RLS ─────────
DROP POLICY IF EXISTS "analytics_writer can manage stock_movements" ON public.analytics_fact_stock_movements;
DROP POLICY IF EXISTS "analytics_writer can read stock_movements" ON public.analytics_fact_stock_movements;
DROP POLICY IF EXISTS "staff_read_stock_movements" ON public.analytics_fact_stock_movements;
DROP POLICY IF EXISTS "admin_manage_stock_movements" ON public.analytics_fact_stock_movements;
DROP POLICY IF EXISTS "staff can read stock_movements" ON public.analytics_fact_stock_movements;
CREATE POLICY "staff can insert stock_movements" ON public.analytics_fact_stock_movements
  FOR INSERT TO authenticated WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin','cms_admin','finance','data_handler')
  );
CREATE POLICY "staff can update stock_movements" ON public.analytics_fact_stock_movements
  FOR UPDATE TO authenticated USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin','cms_admin','finance','data_handler')
  ) WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin','cms_admin','finance','data_handler')
  );
CREATE POLICY "staff can delete stock_movements" ON public.analytics_fact_stock_movements
  FOR DELETE TO authenticated USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin','cms_admin','finance','data_handler')
  );
CREATE POLICY "staff can read stock_movements" ON public.analytics_fact_stock_movements
  FOR SELECT TO authenticated USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin','crm_admin','cms_admin','finance','data_handler')
  );

COMMIT;