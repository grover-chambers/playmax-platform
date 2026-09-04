-- 069_fix_writer_rls_for_all_analytics.sql
-- Super_admin still saw 0 products / 4 fact_sales after 067.
-- Root cause: analytics_products / fact_sales had client-scoped policies that
-- shadowed the writer bypass, and is_analytics_writer was not permissive on
-- those tables. Staff (super_admin/data_handler) must read ALL rows.
-- Ensure every analytics table has a permissive writer SELECT.
BEGIN;

-- Re-assert is_analytics_writer (idempotent)
CREATE OR REPLACE FUNCTION public.is_analytics_writer() RETURNS boolean
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT public.is_admin() OR public.user_role() = ANY(ARRAY['finance','data_handler'])
$$;

-- analytics_products — ensure writer can read all
DROP POLICY IF EXISTS "analytics_writer can read analytics_products" ON public.analytics_products;
DROP POLICY IF EXISTS "client can read analytics_products" ON public.analytics_products;
DROP POLICY IF EXISTS "client can read analytics_products scoped" ON public.analytics_products;
CREATE POLICY "writer can read products" ON public.analytics_products
  FOR SELECT TO authenticated USING (public.is_analytics_writer());
CREATE POLICY "client can read products scoped" ON public.analytics_products
  FOR SELECT TO authenticated USING (
    public.is_admin() OR EXISTS (
      SELECT 1 FROM public.portal_analytics_sharing sh
      WHERE sh.client_id IN (SELECT public.auth_client_ids())
        AND sh.visible AND (sh.category_id = analytics_products.category_id OR sh.category_id IS NULL)
    )
  );

-- analytics_fact_sales — writer must see all
DROP POLICY IF EXISTS "analytics_writer can read fact_sales" ON public.analytics_fact_sales;
DROP POLICY IF EXISTS "client can read analytics_fact_sales" ON public.analytics_fact_sales;
CREATE POLICY "writer can read fact_sales" ON public.analytics_fact_sales
  FOR SELECT TO authenticated USING (public.is_analytics_writer());
CREATE POLICY "client can read fact_sales" ON public.analytics_fact_sales
  FOR SELECT TO authenticated USING (public.user_role() = 'client');

-- analytics_fact_inventory
DROP POLICY IF EXISTS "analytics_writer can read fact_inventory" ON public.analytics_fact_inventory;
DROP POLICY IF EXISTS "client can read analytics_fact_inventory" ON public.analytics_fact_inventory;
CREATE POLICY "writer can read fact_inventory" ON public.analytics_fact_inventory
  FOR SELECT TO authenticated USING (public.is_analytics_writer());
CREATE POLICY "client can read fact_inventory" ON public.analytics_fact_inventory
  FOR SELECT TO authenticated USING (public.user_role() = 'client');

-- analytics_suppliers
DROP POLICY IF EXISTS "analytics_writer can read suppliers" ON public.analytics_suppliers;
DROP POLICY IF EXISTS "client can read analytics_suppliers" ON public.analytics_suppliers;
CREATE POLICY "writer can read suppliers" ON public.analytics_suppliers
  FOR SELECT TO authenticated USING (public.is_analytics_writer());
CREATE POLICY "client can read suppliers" ON public.analytics_suppliers
  FOR SELECT TO authenticated USING (public.user_role() = 'client');

-- analytics_manufacturers
DROP POLICY IF EXISTS "analytics_writer can read manufacturers" ON public.analytics_manufacturers;
CREATE POLICY "writer can read manufacturers" ON public.analytics_manufacturers
  FOR SELECT TO authenticated USING (public.is_analytics_writer());

COMMIT;
