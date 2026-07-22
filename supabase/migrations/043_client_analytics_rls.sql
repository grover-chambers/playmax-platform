-- Migration 043: Allow client portal users to read analytics data
-- The API already scopes queries via portal_analytics_sharing filters.
-- Without these policies, authenticated clients get 0 rows silently.

-- analytics_fact_sales
DROP POLICY IF EXISTS "client can read analytics_fact_sales" ON public.analytics_fact_sales;
CREATE POLICY "client can read analytics_fact_sales" ON public.analytics_fact_sales
  FOR SELECT TO authenticated
  USING (public.user_role() = 'client');

-- analytics_fact_inventory
DROP POLICY IF EXISTS "client can read analytics_fact_inventory" ON public.analytics_fact_inventory;
CREATE POLICY "client can read analytics_fact_inventory" ON public.analytics_fact_inventory
  FOR SELECT TO authenticated
  USING (public.user_role() = 'client');

-- analytics_fact_pricing
DROP POLICY IF EXISTS "client can read analytics_fact_pricing" ON public.analytics_fact_pricing;
CREATE POLICY "client can read analytics_fact_pricing" ON public.analytics_fact_pricing
  FOR SELECT TO authenticated
  USING (public.user_role() = 'client');

-- analytics_suppliers
DROP POLICY IF EXISTS "client can read analytics_suppliers" ON public.analytics_suppliers;
CREATE POLICY "client can read analytics_suppliers" ON public.analytics_suppliers
  FOR SELECT TO authenticated
  USING (public.user_role() = 'client');

-- analytics_products
DROP POLICY IF EXISTS "client can read analytics_products" ON public.analytics_products;
CREATE POLICY "client can read analytics_products" ON public.analytics_products
  FOR SELECT TO authenticated
  USING (public.user_role() = 'client');

-- analytics_branches
DROP POLICY IF EXISTS "client can read analytics_branches" ON public.analytics_branches;
CREATE POLICY "client can read analytics_branches" ON public.analytics_branches
  FOR SELECT TO authenticated
  USING (public.user_role() = 'client');

-- analytics_categories
DROP POLICY IF EXISTS "client can read analytics_categories" ON public.analytics_categories;
CREATE POLICY "client can read analytics_categories" ON public.analytics_categories
  FOR SELECT TO authenticated
  USING (public.user_role() = 'client');

-- analytics_periods
DROP POLICY IF EXISTS "client can read analytics_periods" ON public.analytics_periods;
CREATE POLICY "client can read analytics_periods" ON public.analytics_periods
  FOR SELECT TO authenticated
  USING (public.user_role() = 'client');
