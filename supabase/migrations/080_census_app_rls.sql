-- 080_census_app_rls.sql
-- RLS for visits (rep_id) and consumer_intercepts (enumerator_id) mirroring rep_locations app_scope pattern.
-- Staff read via jwt app_metadata.role. Edge functions use service_role and bypass.
BEGIN;

ALTER TABLE public.visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consumer_intercepts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "visits select own or staff" ON public.visits;
CREATE POLICY "visits select own or staff" ON public.visits
  FOR SELECT TO authenticated USING (
    rep_id = (SELECT uid FROM public.app_scope())
    OR (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin','crm_admin','cms_admin','finance','data_handler')
  );

DROP POLICY IF EXISTS "visits insert own" ON public.visits;
CREATE POLICY "visits insert own" ON public.visits
  FOR INSERT TO authenticated WITH CHECK (rep_id = (SELECT uid FROM public.app_scope()));

DROP POLICY IF EXISTS "consumer_intercepts select own or staff" ON public.consumer_intercepts;
CREATE POLICY "consumer_intercepts select own or staff" ON public.consumer_intercepts
  FOR SELECT TO authenticated USING (
    enumerator_id = (SELECT uid FROM public.app_scope())
    OR (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin','crm_admin','cms_admin','finance','data_handler')
  );

DROP POLICY IF EXISTS "consumer_intercepts insert own" ON public.consumer_intercepts;
CREATE POLICY "consumer_intercepts insert own" ON public.consumer_intercepts
  FOR INSERT TO authenticated WITH CHECK (enumerator_id = (SELECT uid FROM public.app_scope()));

COMMIT;
