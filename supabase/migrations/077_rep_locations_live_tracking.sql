-- 077_rep_locations_live_tracking.sql
-- Live GPS tracking for reps: stores current location pings from the app.
-- Separate from visits (which are check-in events) so the War Room shows
-- real-time positions even when reps aren't at an outlet.
BEGIN;

CREATE TABLE IF NOT EXISTS public.rep_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rep_id uuid NOT NULL REFERENCES public.reps(id) ON DELETE CASCADE,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  accuracy_m double precision,
  altitude_m double precision,
  speed_kmh double precision,
  heading_deg double precision,
  battery_pct int,
  is_charging boolean,
  source text NOT NULL DEFAULT 'app_background',
  captured_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rep_locations_rep_time
  ON public.rep_locations (rep_id, captured_at DESC);

-- Keep only the latest N pings per rep (cleanup via pg_cron or app-side TTL).
-- Latest location per rep (for War Room map)
CREATE OR REPLACE VIEW public.v_rep_latest_location AS
SELECT DISTINCT ON (rep_id)
  rep_id,
  lat,
  lng,
  accuracy_m,
  captured_at
FROM public.rep_locations
ORDER BY rep_id, captured_at DESC;

-- RLS: staff can read all, reps can read own, reps can insert own
ALTER TABLE public.rep_locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff can read all rep_locations" ON public.rep_locations;
CREATE POLICY "staff can read all rep_locations" ON public.rep_locations
  FOR SELECT TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin','crm_admin','cms_admin','finance','data_handler')
  );

DROP POLICY IF EXISTS "rep can read own locations" ON public.rep_locations;
CREATE POLICY "rep can read own locations" ON public.rep_locations
  FOR SELECT TO authenticated
  USING (rep_id = auth.uid());

DROP POLICY IF EXISTS "rep can insert own locations" ON public.rep_locations;
CREATE POLICY "rep can insert own locations" ON public.rep_locations
  FOR INSERT TO authenticated
  WITH CHECK (rep_id = auth.uid());

COMMIT;