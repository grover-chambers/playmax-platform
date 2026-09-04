-- 070_debug_products_rls.sql — debug why super_admin still 0 on products after 069
-- Also re-assert writer policies with explicit PERMISSIVE and correct names
BEGIN;
-- Ensure is_analytics_writer is correct
CREATE OR REPLACE FUNCTION public.is_analytics_writer() RETURNS boolean
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT public.is_admin() OR public.user_role() = ANY(ARRAY['finance','data_handler'])
$$;

-- Drop any leftover restrictive or misnamed policies on products/facts
DROP POLICY IF EXISTS "analytics_writer can read analytics_products" ON public.analytics_products;
DROP POLICY IF EXISTS "client can read analytics_products" ON public.analytics_products;
DROP POLICY IF EXISTS "client can read analytics_products scoped" ON public.analytics_products;
DROP POLICY IF EXISTS "writer can read products" ON public.analytics_products;
DROP POLICY IF EXISTS "client can read products scoped" ON public.analytics_products;

-- Recreate clean permissive writer + client
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

-- Same for fact_sales
DROP POLICY IF EXISTS "analytics_writer can read fact_sales" ON public.analytics_fact_sales;
DROP POLICY IF EXISTS "client can read analytics_fact_sales" ON public.analytics_fact_sales;
DROP POLICY IF EXISTS "writer can read fact_sales" ON public.analytics_fact_sales;
DROP POLICY IF EXISTS "client can read fact_sales" ON public.analytics_fact_sales;
CREATE POLICY "writer can read fact_sales" ON public.analytics_fact_sales
  FOR SELECT TO authenticated USING (public.is_analytics_writer());
CREATE POLICY "client can read fact_sales" ON public.analytics_fact_sales
  FOR SELECT TO authenticated USING (public.user_role() = 'client');

-- Debug helper: list policies for these tables via RPC
CREATE OR REPLACE FUNCTION public.debug_rls(table_name text)
RETURNS TABLE(policyname text, permissive text, roles text[], cmd text, qual text)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT policyname::text, permissive::text, roles::text[], cmd::text, qual::text
  FROM pg_policies WHERE tablename = table_name;
$$;
COMMIT;
