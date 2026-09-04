-- 072_fix_products_direct_jwt.sql — super_admin/data_handler still 0 on products
-- Root: is_analytics_writer() via RPC returned client/false even with correct JWT,
-- but table RLS for branches worked, so helper is flaky in RPC vs RLS context.
-- Bypass helpers entirely: check JWT directly in policy.
BEGIN;

-- Drop all existing product/fact policies that used helper
DROP POLICY IF EXISTS "writer can read products" ON public.analytics_products;
DROP POLICY IF EXISTS "client scoped can read products" ON public.analytics_products;
DROP POLICY IF EXISTS "writer can read fact_sales" ON public.analytics_fact_sales;
DROP POLICY IF EXISTS "client can read fact_sales" ON public.analytics_fact_sales;
DROP POLICY IF EXISTS "analytics_writer can manage analytics_products" ON public.analytics_products;

-- Recreate with direct JWT check (no helper, no search_path issue)
CREATE POLICY "staff can read products" ON public.analytics_products
  FOR SELECT TO authenticated USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin','crm_admin','cms_admin','finance','data_handler')
  );
CREATE POLICY "client scoped can read products v2" ON public.analytics_products
  FOR SELECT TO authenticated USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin','crm_admin','cms_admin')
    OR EXISTS (
      SELECT 1 FROM public.portal_analytics_sharing sh
      WHERE sh.client_id IN (SELECT public.auth_client_ids())
        AND sh.visible AND (sh.category_id = analytics_products.category_id OR sh.category_id IS NULL)
    )
  );

CREATE POLICY "staff can read fact_sales" ON public.analytics_fact_sales
  FOR SELECT TO authenticated USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin','crm_admin','cms_admin','finance','data_handler')
  );
CREATE POLICY "client can read fact_sales v2" ON public.analytics_fact_sales
  FOR SELECT TO authenticated USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'client');

-- Also fix manufacturers / suppliers same pattern
DROP POLICY IF EXISTS "writer can read manufacturers" ON public.analytics_manufacturers;
DROP POLICY IF EXISTS "analytics_writer can manage manufacturers" ON public.analytics_manufacturers;
CREATE POLICY "staff can read manufacturers" ON public.analytics_manufacturers
  FOR SELECT TO authenticated USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin','crm_admin','cms_admin','finance','data_handler')
  );

COMMIT;
