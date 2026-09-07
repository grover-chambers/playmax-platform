-- 075_upload_writes_user_rls.sql
-- Fix the analytics upload flow (staging, import, branch/supplier auto-create,
-- fact writes) when it runs on the user's own RLS client instead of the
-- service-role client.
--
-- Context: the upload/staging/import API routes are being migrated from
-- getAdminClient() to getAuthenticatedClient() because the deployed
-- environment's service-role key is broken/returns empty (see cc35fe3, b7af5ea).
-- Writes then execute as the `authenticated` role and must pass RLS.
--
-- The existing "analytics_writer can manage/read ..." policies depend on
-- is_analytics_writer() -> is_admin() -> user_role(), which reads
-- user_metadata->role while roles actually live in app_metadata
-- (migration 050 / lib/supabase/api.ts). For every app_metadata-based account
-- user_role() falls back to 'client', so those policies never match a staff
-- user (same root cause 072 fixed for reads with direct-JWT predicates).
--
-- These apply to the tables migration 073 does NOT cover; 073 grants the same
-- direct-JWT write access for analytics_categories/subcategories/products/periods.
BEGIN;

-- analytics_staging_uploads
DROP POLICY IF EXISTS "analytics_writer can manage staging uploads" ON public.analytics_staging_uploads;
DROP POLICY IF EXISTS "analytics_writer can read staging uploads" ON public.analytics_staging_uploads;
CREATE POLICY "staff can insert staging uploads" ON public.analytics_staging_uploads
  FOR INSERT TO authenticated WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin','cms_admin','finance','data_handler')
  );
CREATE POLICY "staff can update staging uploads" ON public.analytics_staging_uploads
  FOR UPDATE TO authenticated USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin','cms_admin','finance','data_handler')
  ) WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin','cms_admin','finance','data_handler')
  );
CREATE POLICY "staff can delete staging uploads" ON public.analytics_staging_uploads
  FOR DELETE TO authenticated USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin','cms_admin','finance','data_handler')
  );
CREATE POLICY "staff can read staging uploads" ON public.analytics_staging_uploads
  FOR SELECT TO authenticated USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin','crm_admin','cms_admin','finance','data_handler')
  );

-- analytics_staging_rows
DROP POLICY IF EXISTS "analytics_writer can manage staging rows" ON public.analytics_staging_rows;
DROP POLICY IF EXISTS "analytics_writer can read staging rows" ON public.analytics_staging_rows;
CREATE POLICY "staff can insert staging rows" ON public.analytics_staging_rows
  FOR INSERT TO authenticated WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin','cms_admin','finance','data_handler')
  );
CREATE POLICY "staff can update staging rows" ON public.analytics_staging_rows
  FOR UPDATE TO authenticated USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin','cms_admin','finance','data_handler')
  ) WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin','cms_admin','finance','data_handler')
  );
CREATE POLICY "staff can delete staging rows" ON public.analytics_staging_rows
  FOR DELETE TO authenticated USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin','cms_admin','finance','data_handler')
  );
CREATE POLICY "staff can read staging rows" ON public.analytics_staging_rows
  FOR SELECT TO authenticated USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin','crm_admin','cms_admin','finance','data_handler')
  );

-- analytics_branches (branch auto-create for new stores / chain-wide uploads)
DROP POLICY IF EXISTS "analytics_writer can manage analytics_branches" ON public.analytics_branches;
DROP POLICY IF EXISTS "analytics_writer can read analytics_branches" ON public.analytics_branches;
CREATE POLICY "staff can insert branches" ON public.analytics_branches
  FOR INSERT TO authenticated WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin','cms_admin','finance','data_handler')
  );
CREATE POLICY "staff can update branches" ON public.analytics_branches
  FOR UPDATE TO authenticated USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin','cms_admin','finance','data_handler')
  ) WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin','cms_admin','finance','data_handler')
  );
CREATE POLICY "staff can delete branches" ON public.analytics_branches
  FOR DELETE TO authenticated USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin','cms_admin','finance','data_handler')
  );
CREATE POLICY "staff can read branches" ON public.analytics_branches
  FOR SELECT TO authenticated USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin','crm_admin','cms_admin','finance','data_handler')
  );

-- analytics_suppliers (supplier auto-create + resolution)
DROP POLICY IF EXISTS "analytics_writer can manage suppliers" ON public.analytics_suppliers;
DROP POLICY IF EXISTS "analytics_writer can read suppliers" ON public.analytics_suppliers;
DROP POLICY IF EXISTS "staff_read_suppliers" ON public.analytics_suppliers;
CREATE POLICY "staff can insert suppliers" ON public.analytics_suppliers
  FOR INSERT TO authenticated WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin','cms_admin','finance','data_handler')
  );
CREATE POLICY "staff can update suppliers" ON public.analytics_suppliers
  FOR UPDATE TO authenticated USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin','cms_admin','finance','data_handler')
  ) WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin','cms_admin','finance','data_handler')
  );
CREATE POLICY "staff can delete suppliers" ON public.analytics_suppliers
  FOR DELETE TO authenticated USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin','cms_admin','finance','data_handler')
  );
CREATE POLICY "staff can read suppliers" ON public.analytics_suppliers
  FOR SELECT TO authenticated USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin','crm_admin','cms_admin','finance','data_handler')
  );

-- analytics_supplier_products (junction links)
CREATE POLICY "staff can insert supplier_products" ON public.analytics_supplier_products
  FOR INSERT TO authenticated WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin','cms_admin','finance','data_handler')
  );
CREATE POLICY "staff can update supplier_products" ON public.analytics_supplier_products
  FOR UPDATE TO authenticated USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin','cms_admin','finance','data_handler')
  ) WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin','cms_admin','finance','data_handler')
  );
CREATE POLICY "staff can delete supplier_products" ON public.analytics_supplier_products
  FOR DELETE TO authenticated USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin','cms_admin','finance','data_handler')
  );
CREATE POLICY "staff can read supplier_products" ON public.analytics_supplier_products
  FOR SELECT TO authenticated USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin','crm_admin','cms_admin','finance','data_handler')
  );

-- analytics_fact_sales (per_store/chain_wide import insert + upsert)
DROP POLICY IF EXISTS "analytics_writer can manage fact_sales" ON public.analytics_fact_sales;
CREATE POLICY "staff can insert fact_sales" ON public.analytics_fact_sales
  FOR INSERT TO authenticated WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin','cms_admin','finance','data_handler')
  );
CREATE POLICY "staff can update fact_sales" ON public.analytics_fact_sales
  FOR UPDATE TO authenticated USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin','cms_admin','finance','data_handler')
  ) WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin','cms_admin','finance','data_handler')
  );

-- analytics_fact_pricing (per_store_sales pricing fact)
DROP POLICY IF EXISTS "analytics_writer can manage pricing" ON public.analytics_fact_pricing;
DROP POLICY IF EXISTS "analytics_writer can read pricing" ON public.analytics_fact_pricing;
DROP POLICY IF EXISTS "staff_read_pricing" ON public.analytics_fact_pricing;
CREATE POLICY "staff can insert pricing" ON public.analytics_fact_pricing
  FOR INSERT TO authenticated WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin','cms_admin','finance','data_handler')
  );
CREATE POLICY "staff can update pricing" ON public.analytics_fact_pricing
  FOR UPDATE TO authenticated USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin','cms_admin','finance','data_handler')
  ) WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin','cms_admin','finance','data_handler')
  );
CREATE POLICY "staff can read pricing" ON public.analytics_fact_pricing
  FOR SELECT TO authenticated USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin','crm_admin','cms_admin','finance','data_handler')
  );

-- analytics_fact_inventory (inventory import)
DROP POLICY IF EXISTS "analytics_writer can manage fact_inventory" ON public.analytics_fact_inventory;
DROP POLICY IF EXISTS "writer can read fact_inventory" ON public.analytics_fact_inventory;
CREATE POLICY "staff can insert fact_inventory" ON public.analytics_fact_inventory
  FOR INSERT TO authenticated WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin','cms_admin','finance','data_handler')
  );
CREATE POLICY "staff can update fact_inventory" ON public.analytics_fact_inventory
  FOR UPDATE TO authenticated USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin','cms_admin','finance','data_handler')
  ) WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin','cms_admin','finance','data_handler')
  );
CREATE POLICY "staff can read fact_inventory" ON public.analytics_fact_inventory
  FOR SELECT TO authenticated USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin','crm_admin','cms_admin','finance','data_handler')
  );

-- analytics_fact_branch_summary (grand-total capture on upload create)
CREATE POLICY "staff can insert branch_summary" ON public.analytics_fact_branch_summary
  FOR INSERT TO authenticated WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin','cms_admin','finance','data_handler')
  );
CREATE POLICY "staff can update branch_summary" ON public.analytics_fact_branch_summary
  FOR UPDATE TO authenticated USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin','cms_admin','finance','data_handler')
  ) WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin','cms_admin','finance','data_handler')
  );
CREATE POLICY "staff can read branch_summary" ON public.analytics_fact_branch_summary
  FOR SELECT TO authenticated USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin','crm_admin','cms_admin','finance','data_handler')
  );

COMMIT;