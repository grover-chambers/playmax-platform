-- 071_fix_products_policy_collision.sql — fix 42P01/42710 once and for all
-- 070 failed at "client scoped can read products" already exists because
-- names collided across 069/070. Drop EVERY variant idempotently, then recreate clean.
BEGIN;

-- analytics_products — nuke all variants
DROP POLICY IF EXISTS "analytics_writer can read analytics_products" ON public.analytics_products;
DROP POLICY IF EXISTS "client can read analytics_products" ON public.analytics_products;
DROP POLICY IF EXISTS "client can read analytics_products scoped" ON public.analytics_products;
DROP POLICY IF EXISTS "writer can read products" ON public.analytics_products;
DROP POLICY IF EXISTS "client can read products scoped" ON public.analytics_products;
DROP POLICY IF EXISTS "client scoped can read products" ON public.analytics_products;
DROP POLICY IF EXISTS "writer can read products" ON public.analytics_products;

CREATE POLICY "writer can read products" ON public.analytics_products
  FOR SELECT TO authenticated USING (public.is_analytics_writer());
CREATE POLICY "client scoped can read products" ON public.analytics_products
  FOR SELECT TO authenticated USING (
    public.is_admin() OR EXISTS (
      SELECT 1 FROM public.portal_analytics_sharing sh
      WHERE sh.client_id IN (SELECT public.auth_client_ids())
        AND sh.visible AND (sh.category_id = analytics_products.category_id OR sh.category_id IS NULL)
    )
  );

-- analytics_fact_sales — same cleanup
DROP POLICY IF EXISTS "analytics_writer can read fact_sales" ON public.analytics_fact_sales;
DROP POLICY IF EXISTS "client can read analytics_fact_sales" ON public.analytics_fact_sales;
DROP POLICY IF EXISTS "writer can read fact_sales" ON public.analytics_fact_sales;
DROP POLICY IF EXISTS "client can read fact_sales" ON public.analytics_fact_sales;
CREATE POLICY "writer can read fact_sales" ON public.analytics_fact_sales
  FOR SELECT TO authenticated USING (public.is_analytics_writer());
CREATE POLICY "client can read fact_sales" ON public.analytics_fact_sales
  FOR SELECT TO authenticated USING (public.user_role() = 'client');

-- analytics_fact_inventory
DROP POLICY IF EXISTS "analytics_writer can read fact_inventory" ON public.analytics_fact_inventory;
DROP POLICY IF EXISTS "client can read analytics_fact_inventory" ON public.analytics_fact_inventory;
DROP POLICY IF EXISTS "writer can read fact_inventory" ON public.analytics_fact_inventory;
DROP POLICY IF EXISTS "client can read fact_inventory" ON public.analytics_fact_inventory;
CREATE POLICY "writer can read fact_inventory" ON public.analytics_fact_inventory
  FOR SELECT TO authenticated USING (public.is_analytics_writer());
CREATE POLICY "client can read fact_inventory" ON public.analytics_fact_inventory
  FOR SELECT TO authenticated USING (public.user_role() = 'client');

-- analytics_suppliers
DROP POLICY IF EXISTS "analytics_writer can read suppliers" ON public.analytics_suppliers;
DROP POLICY IF EXISTS "client can read analytics_suppliers" ON public.analytics_suppliers;
DROP POLICY IF EXISTS "writer can read suppliers" ON public.analytics_suppliers;
DROP POLICY IF EXISTS "client can read suppliers" ON public.analytics_suppliers;
CREATE POLICY "writer can read suppliers" ON public.analytics_suppliers
  FOR SELECT TO authenticated USING (public.is_analytics_writer());
CREATE POLICY "client can read suppliers" ON public.analytics_suppliers
  FOR SELECT TO authenticated USING (public.user_role() = 'client');

COMMIT;
