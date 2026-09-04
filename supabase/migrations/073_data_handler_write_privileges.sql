-- 073_data_handler_write_privileges.sql
-- Grant read-write on categories/subcategories/products/periods to data_handler (Ian).
--
-- Why: migration 053 used is_analytics_writer() helper for FOR ALL manage policies,
-- but that helper is flaky in INSERT/UPDATE/DELETE RLS context (same root cause as
-- products in 072: helper returns false in statement context). 071/072 then nuked and
-- recreated only SELECT policies, dropping the write ones entirely.
--
-- Fix: mirror 072's proven direct-JWT approach — write policies check the role in
-- app_metadata directly, no helper. super_admin is_admin so included via is_admin().
BEGIN;

-- analytics_categories
DROP POLICY IF EXISTS "analytics_writer can manage analytics_categories" ON public.analytics_categories;
CREATE POLICY "staff can insert categories" ON public.analytics_categories
  FOR INSERT TO authenticated WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin','cms_admin','finance','data_handler')
  );
CREATE POLICY "staff can update categories" ON public.analytics_categories
  FOR UPDATE TO authenticated USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin','cms_admin','finance','data_handler')
  ) WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin','cms_admin','finance','data_handler')
  );
CREATE POLICY "staff can delete categories" ON public.analytics_categories
  FOR DELETE TO authenticated USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin','cms_admin','finance','data_handler')
  );

-- analytics_subcategories
DROP POLICY IF EXISTS "analytics_writer can manage analytics_subcategories" ON public.analytics_subcategories;
CREATE POLICY "staff can insert subcategories" ON public.analytics_subcategories
  FOR INSERT TO authenticated WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin','cms_admin','finance','data_handler')
  );
CREATE POLICY "staff can update subcategories" ON public.analytics_subcategories
  FOR UPDATE TO authenticated USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin','cms_admin','finance','data_handler')
  ) WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin','cms_admin','finance','data_handler')
  );
CREATE POLICY "staff can delete subcategories" ON public.analytics_subcategories
  FOR DELETE TO authenticated USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin','cms_admin','finance','data_handler')
  );

-- analytics_products
DROP POLICY IF EXISTS "analytics_writer can manage analytics_products" ON public.analytics_products;
CREATE POLICY "staff can insert products" ON public.analytics_products
  FOR INSERT TO authenticated WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin','cms_admin','finance','data_handler')
  );
CREATE POLICY "staff can update products" ON public.analytics_products
  FOR UPDATE TO authenticated USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin','cms_admin','finance','data_handler')
  ) WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin','cms_admin','finance','data_handler')
  );
CREATE POLICY "staff can delete products" ON public.analytics_products
  FOR DELETE TO authenticated USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin','cms_admin','finance','data_handler')
  );

-- analytics_periods (data_handler adds periods for uploads)
DROP POLICY IF EXISTS "analytics_writer can manage analytics_periods" ON public.analytics_periods;
CREATE POLICY "staff can insert periods" ON public.analytics_periods
  FOR INSERT TO authenticated WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin','cms_admin','finance','data_handler')
  );
CREATE POLICY "staff can update periods" ON public.analytics_periods
  FOR UPDATE TO authenticated USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin','cms_admin','finance','data_handler')
  ) WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin','cms_admin','finance','data_handler')
  );
CREATE POLICY "staff can delete periods" ON public.analytics_periods
  FOR DELETE TO authenticated USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin','cms_admin','finance','data_handler')
  );

COMMIT;
