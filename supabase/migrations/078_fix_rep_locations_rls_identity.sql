-- 078_fix_rep_locations_rls_identity.sql
-- rep_locations.rep_id references reps(id) (= profiles.id = app_scope().uid),
-- which is NOT auth.uid(). The original policies compared rep_id to auth.uid(),
-- so a rep could never read/insert their own locations via REST (edge function
-- bypasses RLS with service role, but the shared identity bug also caused the
-- original location-ping to write the raw auth uid and fail the FK).
--
-- Fix: resolve the caller's profile id with app_scope() (same pattern as the
-- profiles table) in both the read and insert policies.
BEGIN;

ALTER TABLE public.rep_locations DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rep can read own locations" ON public.rep_locations;
CREATE POLICY "rep can read own locations" ON public.rep_locations
  FOR SELECT TO authenticated
  USING (rep_id = (SELECT uid FROM public.app_scope() LIMIT 1));

DROP POLICY IF EXISTS "rep can insert own locations" ON public.rep_locations;
CREATE POLICY "rep can insert own locations" ON public.rep_locations
  FOR INSERT TO authenticated
  WITH CHECK (rep_id = (SELECT uid FROM public.app_scope() LIMIT 1));

ALTER TABLE public.rep_locations ENABLE ROW LEVEL SECURITY;

COMMIT;