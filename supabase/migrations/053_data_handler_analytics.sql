-- 053_data_handler_analytics.sql — allow data_handler (Ian Gichuki) to operate analytics engine
-- Extends RLS for analytics tables to include finance and data_handler in addition to is_admin
BEGIN;

-- Helper: is_analytics_writer checks admin OR finance OR data_handler
CREATE OR REPLACE FUNCTION public.is_analytics_writer() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_admin() OR public.user_role() = ANY(ARRAY['finance','data_handler'])
$$;

-- analytics_branches
DROP POLICY IF EXISTS "admin can read analytics_branches" ON public.analytics_branches;
DROP POLICY IF EXISTS "admin can insert analytics_branches" ON public.analytics_branches;
DROP POLICY IF EXISTS "admin can update analytics_branches" ON public.analytics_branches;
DROP POLICY IF EXISTS "admin can manage analytics_branches" ON public.analytics_branches;
CREATE POLICY "analytics_writer can read analytics_branches" ON public.analytics_branches FOR SELECT TO authenticated USING (public.is_analytics_writer());
CREATE POLICY "analytics_writer can manage analytics_branches" ON public.analytics_branches FOR ALL TO authenticated USING (public.is_analytics_writer()) WITH CHECK (public.is_analytics_writer());

-- analytics_periods
DROP POLICY IF EXISTS "admin can read analytics_periods" ON public.analytics_periods;
DROP POLICY IF EXISTS "admin can manage analytics_periods" ON public.analytics_periods;
CREATE POLICY "analytics_writer can read analytics_periods" ON public.analytics_periods FOR SELECT TO authenticated USING (public.is_analytics_writer());
CREATE POLICY "analytics_writer can manage analytics_periods" ON public.analytics_periods FOR ALL TO authenticated USING (public.is_analytics_writer()) WITH CHECK (public.is_analytics_writer());

-- analytics_categories
DROP POLICY IF EXISTS "admin can read analytics_categories" ON public.analytics_categories;
DROP POLICY IF EXISTS "admin can manage analytics_categories" ON public.analytics_categories;
CREATE POLICY "analytics_writer can read analytics_categories" ON public.analytics_categories FOR SELECT TO authenticated USING (public.is_analytics_writer());
CREATE POLICY "analytics_writer can manage analytics_categories" ON public.analytics_categories FOR ALL TO authenticated USING (public.is_analytics_writer()) WITH CHECK (public.is_analytics_writer());

-- analytics_subcategories
DROP POLICY IF EXISTS "admin can read analytics_subcategories" ON public.analytics_subcategories;
CREATE POLICY "analytics_writer can read analytics_subcategories" ON public.analytics_subcategories FOR SELECT TO authenticated USING (public.is_analytics_writer());
CREATE POLICY "analytics_writer can manage analytics_subcategories" ON public.analytics_subcategories FOR ALL TO authenticated USING (public.is_analytics_writer()) WITH CHECK (public.is_analytics_writer());

-- analytics_suppliers / manufacturers
DROP POLICY IF EXISTS "staff_read_suppliers" ON public.analytics_suppliers;
DROP POLICY IF EXISTS "admin_manage_suppliers" ON public.analytics_suppliers;
CREATE POLICY "analytics_writer can read suppliers" ON public.analytics_suppliers FOR SELECT TO authenticated USING (public.is_analytics_writer());
CREATE POLICY "analytics_writer can manage suppliers" ON public.analytics_suppliers FOR ALL TO authenticated USING (public.is_analytics_writer()) WITH CHECK (public.is_analytics_writer());

-- analytics_products
DROP POLICY IF EXISTS "admin can read analytics_products" ON public.analytics_products;
DROP POLICY IF EXISTS "admin can manage analytics_products" ON public.analytics_products;
CREATE POLICY "analytics_writer can read analytics_products" ON public.analytics_products FOR SELECT TO authenticated USING (public.is_analytics_writer() OR public.user_role() = 'client' AND EXISTS (SELECT 1 FROM public.portal_analytics_sharing WHERE true));
-- keep client read via scoped policy already exists, so just add writer read
DROP POLICY IF EXISTS "analytics_writer can read analytics_products" ON public.analytics_products;
CREATE POLICY "analytics_writer can read analytics_products" ON public.analytics_products FOR SELECT TO authenticated USING (public.is_analytics_writer());

DROP POLICY IF EXISTS "analytics_writer can manage analytics_products" ON public.analytics_products;
CREATE POLICY "analytics_writer can manage analytics_products" ON public.analytics_products FOR ALL TO authenticated USING (public.is_analytics_writer()) WITH CHECK (public.is_analytics_writer());

-- analytics_staging_uploads
DROP POLICY IF EXISTS "admin can read staging uploads" ON public.analytics_staging_uploads;
DROP POLICY IF EXISTS "admin can manage staging uploads" ON public.analytics_staging_uploads;
DROP POLICY IF EXISTS "staff can read staging uploads" ON public.analytics_staging_uploads;
CREATE POLICY "analytics_writer can read staging uploads" ON public.analytics_staging_uploads FOR SELECT TO authenticated USING (public.is_analytics_writer());
CREATE POLICY "analytics_writer can manage staging uploads" ON public.analytics_staging_uploads FOR ALL TO authenticated USING (public.is_analytics_writer()) WITH CHECK (public.is_analytics_writer());

-- analytics_staging_rows
DROP POLICY IF EXISTS "admin can read staging rows" ON public.analytics_staging_rows;
DROP POLICY IF EXISTS "admin can manage staging rows" ON public.analytics_staging_rows;
CREATE POLICY "analytics_writer can read staging rows" ON public.analytics_staging_rows FOR SELECT TO authenticated USING (public.is_analytics_writer());
CREATE POLICY "analytics_writer can manage staging rows" ON public.analytics_staging_rows FOR ALL TO authenticated USING (public.is_analytics_writer()) WITH CHECK (public.is_analytics_writer());

-- analytics_fact_* — allow writer to read (for reports)
DROP POLICY IF EXISTS "staff_read_pricing" ON public.analytics_fact_pricing;
DROP POLICY IF EXISTS "admin_manage_pricing" ON public.analytics_fact_pricing;
CREATE POLICY "analytics_writer can read pricing" ON public.analytics_fact_pricing FOR SELECT TO authenticated USING (public.is_analytics_writer());
CREATE POLICY "analytics_writer can manage pricing" ON public.analytics_fact_pricing FOR ALL TO authenticated USING (public.is_analytics_writer()) WITH CHECK (public.is_analytics_writer());

DROP POLICY IF EXISTS "staff_read_stock_movements" ON public.analytics_fact_stock_movements;
DROP POLICY IF EXISTS "admin_manage_stock_movements" ON public.analytics_fact_stock_movements;
CREATE POLICY "analytics_writer can read stock_movements" ON public.analytics_fact_stock_movements FOR SELECT TO authenticated USING (public.is_analytics_writer());
CREATE POLICY "analytics_writer can manage stock_movements" ON public.analytics_fact_stock_movements FOR ALL TO authenticated USING (public.is_analytics_writer()) WITH CHECK (public.is_analytics_writer());

-- also ensure supplier staff_read includes data_handler
DROP POLICY IF EXISTS "staff_read_suppliers" ON public.analytics_suppliers;
CREATE POLICY "staff_read_suppliers" ON public.analytics_suppliers FOR SELECT TO authenticated USING (public.user_role() = ANY(ARRAY['super_admin','crm_admin','finance','data_handler']));

DROP POLICY IF EXISTS "staff_read_pricing" ON public.analytics_fact_pricing;
CREATE POLICY "staff_read_pricing" ON public.analytics_fact_pricing FOR SELECT TO authenticated USING (public.user_role() = ANY(ARRAY['super_admin','crm_admin','finance','data_handler']));

DROP POLICY IF EXISTS "staff_read_stock_movements" ON public.analytics_fact_stock_movements;
CREATE POLICY "staff_read_stock_movements" ON public.analytics_fact_stock_movements FOR SELECT TO authenticated USING (public.user_role() = ANY(ARRAY['super_admin','crm_admin','finance','data_handler']));

COMMIT;
