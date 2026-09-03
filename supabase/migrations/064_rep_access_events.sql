-- 064_rep_access_events.sql — per-rep login/access + app-version log (Kanini Field / census DB)
-- Applies to the CENSUS project (zsprlozgdxzxeevvetmg), not the main analytics DB.
-- Run in Supabase Dashboard -> SQL Editor (or via supabase db push on that project).

BEGIN;

-- Per-rep device/access activity. One row per observed event so we keep a
-- history (logins, syncs, app opens) and can derive "last" via ORDER BY
-- created_at DESC. Rep identity is keyed by the rep's auth email rather than
-- a mutable UUID so it survives account relinks and matches routes_master.
CREATE TABLE IF NOT EXISTS public.rep_access_events (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  rep_email    text NOT NULL,
  device_id    text,
  event_type   text NOT NULL DEFAULT 'login',   -- login | sync | open
  app_version  text,                            -- e.g. "1.3.0"
  version_code int,                             -- e.g. 5
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS rep_access_events_rep_time_idx
  ON public.rep_access_events (rep_email, created_at DESC);
CREATE INDEX IF NOT EXISTS rep_access_events_created_idx
  ON public.rep_access_events (created_at DESC);

ALTER TABLE public.rep_access_events ENABLE ROW LEVEL SECURITY;

-- Anyone signed in may read the access log (portal monitoring, leads, admin).
-- Data is low-sensitivity; the portal user (portal@marketlink.co.ke) reads it
-- to render the activity view, and leads/super_admins can too.
CREATE POLICY "authenticated can read rep_access_events"
  ON public.rep_access_events FOR SELECT TO authenticated
  USING (true);

-- A rep may only insert rows about themselves; identity is pinned to the JWT
-- email so a rep can never log events for another rep.
CREATE POLICY "rep can insert own rep_access_events"
  ON public.rep_access_events FOR INSERT TO authenticated
  WITH CHECK (
    rep_email = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

-- No authenticated UPDATE/DELETE (append-only audit); service_role bypasses RLS.

COMMIT;
