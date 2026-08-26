-- ================================================================
-- Migration 062: Client-team self-service
-- ================================================================
-- Lets a client admin (the paying account owner) manage their own
-- client_users team from the client portal:
--   - list team members
--   - invite new viewers (tier-capped server-side in the API)
--   - remove viewers (the admin row is immutable — the admin is the
--     paying client and can never be deleted/demoted)
--
-- Server-side API invariants (defense in depth; this policy backs them):
--   - only a user who administers the client (clients.user_id owner OR
--     a client_users row with portal_role='admin') may read/manage rows
--     for that client_id
--   - viewers can never manage team rows
--   - staff management via is_admin() remains intact
-- ================================================================

BEGIN;

-- Helper: is the authenticated user an admin of the given client?
CREATE OR REPLACE FUNCTION public.user_is_client_admin(p_client_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = p_client_id AND c.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.client_users cu
    WHERE cu.client_id = p_client_id
      AND cu.user_id = auth.uid()
      AND cu.portal_role = 'admin'
  );
$$;

-- Client admin manages their own client's team rows.
DROP POLICY IF EXISTS "client admin manage own team" ON public.client_users;
CREATE POLICY "client admin manage own team" ON public.client_users
  FOR ALL TO authenticated
  USING (public.user_is_client_admin(client_id))
  WITH CHECK (public.user_is_client_admin(client_id));

COMMIT;
