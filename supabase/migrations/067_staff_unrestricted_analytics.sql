-- 067_staff_unrestricted_analytics.sql
-- Staff (super_admin + data_handler) need NO client scoping for analytics.
-- Per spec: admin has no client, data_handler is staff — they read the DB
-- directly unless explicitly assigned to a client project.
-- Prior migrations left fact tables admin-only, so data_handler was blocked.
-- This migration ensures is_analytics_writer (admin OR finance OR data_handler)
-- can read ALL analytics dimensions/facts without sharing/client checks,
-- and that portal_can_see_category also bypasses for staff.

BEGIN;

-- Ensure helper exists (from 053)
CREATE OR REPLACE FUNCTION public.is_analytics_writer() RETURNS boolean
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT public.is_admin() OR public.user_role() = ANY(ARRAY['finance','data_handler'])
$$;

-- Fix portal_can_see_category to also allow analytics writers (not just is_admin)
CREATE OR REPLACE FUNCTION public.portal_can_see_category(p_category_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth AS $$
  SELECT public.is_analytics_writer() OR EXISTS (
    SELECT 1 FROM public.client_categories cc
    WHERE cc.client_id IN (SELECT public.auth_client_ids())
      AND cc.category_id = p_category_id
  ) OR EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id IN (SELECT public.auth_client_ids())
      AND c.category_id = p_category_id
  );
$$;

-- analytics_fact_sales — allow writer + keep client
DROP POLICY IF EXISTS "analytics_writer can read fact_sales" ON public.analytics_fact_sales;
CREATE POLICY "analytics_writer can read fact_sales" ON public.analytics_fact_sales
  FOR SELECT TO authenticated USING (public.is_analytics_writer());
DROP POLICY IF EXISTS "analytics_writer can manage fact_sales" ON public.analytics_fact_sales;
CREATE POLICY "analytics_writer can manage fact_sales" ON public.analytics_fact_sales
  FOR ALL TO authenticated USING (public.is_analytics_writer()) WITH CHECK (public.is_analytics_writer());

-- analytics_fact_inventory
DROP POLICY IF EXISTS "analytics_writer can read fact_inventory" ON public.analytics_fact_inventory;
CREATE POLICY "analytics_writer can read fact_inventory" ON public.analytics_fact_inventory
  FOR SELECT TO authenticated USING (public.is_analytics_writer());
DROP POLICY IF EXISTS "analytics_writer can manage fact_inventory" ON public.analytics_fact_inventory;
CREATE POLICY "analytics_writer can manage fact_inventory" ON public.analytics_fact_inventory
  FOR ALL TO authenticated USING (public.is_analytics_writer()) WITH CHECK (public.is_analytics_writer());

-- analytics_manufacturers (was admin-only, never updated for writer)
DROP POLICY IF EXISTS "analytics_writer can read manufacturers" ON public.analytics_manufacturers;
CREATE POLICY "analytics_writer can read manufacturers" ON public.analytics_manufacturers
  FOR SELECT TO authenticated USING (public.is_analytics_writer());
DROP POLICY IF EXISTS "analytics_writer can manage manufacturers" ON public.analytics_manufacturers;
CREATE POLICY "analytics_writer can manage manufacturers" ON public.analytics_manufacturers
  FOR ALL TO authenticated USING (public.is_analytics_writer()) WITH CHECK (public.is_analytics_writer());

-- Ensure branches/categories/periods/products already have writer policies from 053,
-- but re-assert to cover any drift where client policy might shadow
DROP POLICY IF EXISTS "client can read analytics_branches" ON public.analytics_branches;
CREATE POLICY "client can read analytics_branches" ON public.analytics_branches
  FOR SELECT TO authenticated USING (public.user_role() = 'client');
-- keep writer policy from 053 already exists; ensure it stays

DROP POLICY IF EXISTS "client can read analytics_categories" ON public.analytics_categories;
CREATE POLICY "client can read analytics_categories" ON public.analytics_categories
  FOR SELECT TO authenticated USING (public.user_role() = 'client');

DROP POLICY IF EXISTS "client can read analytics_periods" ON public.analytics_periods;
CREATE POLICY "client can read analytics_periods" ON public.analytics_periods
  FOR SELECT TO authenticated USING (public.user_role() = 'client');

COMMIT;
