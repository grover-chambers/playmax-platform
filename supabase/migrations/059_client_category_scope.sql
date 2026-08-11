-- ================================================================
-- Migration 059: Multi-category client scoping
-- ================================================================
-- Adds a primary category to clients plus a client_categories junction
-- so a client portal can be scoped to one or more FMCG categories
-- (e.g. Maize Flour for NICE, Milk and Dairy for a dairy client).
-- Also adds the client_assigned_category_ids() / portal_can_see_category()
-- helpers used by RLS and the portal API.
-- ================================================================

BEGIN;

-- 1. clients.category_id: primary category (denormalized for fast lookups)
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.analytics_categories(id);

CREATE INDEX IF NOT EXISTS idx_clients_category ON public.clients(category_id);

-- 2. client_categories junction (a client may access several categories)
CREATE TABLE IF NOT EXISTS public.client_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.analytics_categories(id),
  is_primary boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, category_id)
);

CREATE INDEX IF NOT EXISTS idx_client_categories_client ON public.client_categories(client_id);
CREATE INDEX IF NOT EXISTS idx_client_categories_category ON public.client_categories(category_id);

ALTER TABLE public.client_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin manage client_categories" ON public.client_categories;
CREATE POLICY "admin manage client_categories" ON public.client_categories
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "client can read own client_categories" ON public.client_categories;
CREATE POLICY "client can read own client_categories" ON public.client_categories
  FOR SELECT TO authenticated
  USING (client_id IN (SELECT public.auth_client_ids()));

-- 3. Helper: category ids the current auth user is allowed to see
-- (from the client profile, not just sharing rows).
CREATE OR REPLACE FUNCTION public.client_assigned_category_ids() RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth AS $$
  SELECT cc.category_id
  FROM public.client_categories cc
  WHERE cc.client_id IN (SELECT public.auth_client_ids())
  UNION
  SELECT c.category_id
  FROM public.clients c
  WHERE c.id IN (SELECT public.auth_client_ids())
    AND c.category_id IS NOT NULL
$$;

-- 4. Helper: can the current client see this category?
-- True for admins; for clients true when the category is in their profile.
CREATE OR REPLACE FUNCTION public.portal_can_see_category(p_category_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth AS $$
  SELECT public.is_admin() OR EXISTS (
    SELECT 1 FROM public.client_categories cc
    WHERE cc.client_id IN (SELECT public.auth_client_ids())
      AND cc.category_id = p_category_id
  ) OR EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id IN (SELECT public.auth_client_ids())
      AND c.category_id = p_category_id
  );
$$;

-- 5. Backfill: existing analytics clients are Maize Flour clients.
-- Their category is the one they are currently being shared data on.
DO $$
DECLARE
  v_maize uuid := (SELECT id FROM public.analytics_categories WHERE name ILIKE 'maize%' ORDER BY id LIMIT 1);
  v_client uuid;
BEGIN
  IF v_maize IS NOT NULL THEN
    FOR v_client IN
      SELECT DISTINCT sh.client_id FROM public.portal_analytics_sharing sh
      WHERE sh.category_id = v_maize OR sh.category_id IS NULL
    LOOP
      UPDATE public.clients SET category_id = v_maize
      WHERE id = v_client AND category_id IS NULL;
      INSERT INTO public.client_categories (client_id, category_id, is_primary)
      VALUES (v_client, v_maize, true)
      ON CONFLICT (client_id, category_id) DO NOTHING;
    END LOOP;
  END IF;
END $$;

-- 6. Indexes that make portal sharing lookups cheap
CREATE INDEX IF NOT EXISTS idx_sharing_client ON public.portal_analytics_sharing(client_id);
CREATE INDEX IF NOT EXISTS idx_sharing_category ON public.portal_analytics_sharing(category_id);
CREATE INDEX IF NOT EXISTS idx_sharing_client_category
  ON public.portal_analytics_sharing(client_id, category_id) WHERE visible;

COMMIT;
