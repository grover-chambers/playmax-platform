-- 009_portal_settings_rls.sql
-- Allow clients to update own profile and read shared analytics data.

BEGIN;

-- 1. Client can update own record (name, phone only — enforced in API)
DROP POLICY IF EXISTS "client can update own record" ON public.clients;
CREATE POLICY "client can update own record" ON public.clients
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 2. Analytics sharing table — admin controls which data clients see
CREATE TABLE IF NOT EXISTS public.portal_analytics_sharing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  period_id uuid NOT NULL REFERENCES public.analytics_periods(id),
  branch_id uuid REFERENCES public.analytics_branches(id),
  category_id uuid REFERENCES public.analytics_categories(id),
  visible boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE (client_id, period_id, branch_id, category_id)
);

ALTER TABLE public.portal_analytics_sharing ENABLE ROW LEVEL SECURITY;

-- Admin can manage sharing
CREATE POLICY "admin manage portal analytics sharing" ON public.portal_analytics_sharing
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Client can read own sharing records
CREATE POLICY "client can read own analytics sharing" ON public.portal_analytics_sharing
  FOR SELECT TO authenticated
  USING (
    public.user_role() = 'client' AND
    client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid())
  );

-- 3. Client can read products (catalog reference)
DROP POLICY IF EXISTS "client can read analytics products" ON public.analytics_products;
CREATE POLICY "client can read analytics products" ON public.analytics_products
  FOR SELECT TO authenticated
  USING (public.user_role() = 'client');

-- 4. Client can read categories (labels)
DROP POLICY IF EXISTS "client can read analytics categories" ON public.analytics_categories;
CREATE POLICY "client can read analytics categories" ON public.analytics_categories
  FOR SELECT TO authenticated
  USING (public.user_role() = 'client');

-- 5. Client can read branches (labels)
DROP POLICY IF EXISTS "client can read analytics branches" ON public.analytics_branches;
CREATE POLICY "client can read analytics branches" ON public.analytics_branches
  FOR SELECT TO authenticated
  USING (public.user_role() = 'client');

-- 6. Client can read periods (labels)
DROP POLICY IF EXISTS "client can read analytics periods" ON public.analytics_periods;
CREATE POLICY "client can read analytics periods" ON public.analytics_periods
  FOR SELECT TO authenticated
  USING (public.user_role() = 'client');

COMMIT;
