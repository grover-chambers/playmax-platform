-- ============================================================
-- Migration: Enable admin reads on CENSUS project
-- Project: zsprlozgdxzxeevvetmg  (NOT the main Nice_OS project)
--
-- WHERE TO RUN:
--   Supabase Dashboard → Census project (zsprlozgdxzxeevvetmg)
--   → SQL Editor → Paste this entire script → Run
--
-- WHAT IT DOES:
--   1. Sets the portal@marketlink.co.ke user's JWT role to "authenticated"
--   2. Enables RLS on all existing census tables with a permissive read policy
--   3. Grants service_role SELECT (bypasses RLS) on each existing table
--   4. Verifies the fix with role + count queries
--
-- SAFE TO RUN MULTIPLE TIMES (idempotent). Skips any table that
-- does not exist instead of failing the whole script.
-- ============================================================

-- ── Step 1: Set portal user JWT role to authenticated ─────────
-- The census client authenticates via ROPG as this user.
-- PostgREST uses the JWT role claim for RLS; setting it to
-- "authenticated" ensures standard Supabase RLS policies apply.

UPDATE auth.users
SET raw_app_meta_data = jsonb_set(
  COALESCE(raw_app_meta_data, '{}'::jsonb),
  '{role}',
  '"authenticated"'
)
WHERE email = 'portal@marketlink.co.ke';

-- Confirm the update (should show 1 row with jwt_role = authenticated)
SELECT
  email,
  raw_app_meta_data ->> 'role' AS jwt_role,
  id
FROM auth.users
WHERE email = 'portal@marketlink.co.ke';


-- ── Step 2: Enable RLS + permissive read policies ─────────────
-- For each existing census table: enable RLS (idempotent), drop any
-- prior "census_portal_read" policy, then create a fresh permissive
-- SELECT policy for the "authenticated" role.

DO $$
DECLARE
  tbl   text;
  tables text[] := ARRAY[
    'reps',
    'visits',
    'outlets',
    'retailers',
    'consumer_intercepts',
    'census_batches',
    'rep_locations',
    'rep_access_events',
    'daily_submissions'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    -- Skip gracefully if the table does not exist
    IF NOT EXISTS (
      SELECT 1 FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = tbl
    ) THEN
      RAISE NOTICE '⚠  Skip: public.% does not exist', tbl;
      CONTINUE;
    END IF;

    -- Enable RLS (no-op if already enabled)
    EXECUTE format(
      'ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl
    );

    -- Drop prior policy with this name (safe no-op if absent)
    EXECUTE format(
      'DROP POLICY IF EXISTS "census_portal_read" ON public.%I', tbl
    );

    -- Create permissive SELECT for authenticated role
    EXECUTE format(
      'CREATE POLICY "census_portal_read" ON public.%I '
      'FOR SELECT '
      'USING (auth.role() = %L)',
      tbl,
      'authenticated'
    );

    RAISE NOTICE '✓  Enabled RLS + read policy on public.%', tbl;
  END LOOP;
END $$;


-- ── Step 3: Grant service_role SELECT (bypasses RLS) ──────────
-- For future server-side reads that use the service-role key
-- instead of ROPG, grant SELECT on every existing census table.

DO $$
DECLARE
  tbl   text;
  tables text[] := ARRAY[
    'reps',
    'visits',
    'outlets',
    'retailers',
    'consumer_intercepts',
    'census_batches',
    'rep_locations',
    'rep_access_events',
    'daily_submissions'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = tbl
    ) THEN
      CONTINUE;
    END IF;

    EXECUTE format(
      'GRANT SELECT ON public.%I TO service_role', tbl
    );
    RAISE NOTICE '✓  Granted SELECT on public.% to service_role', tbl;
  END LOOP;
END $$;


-- ── Step 4: Grant view access ─────────────────────────────────
-- Views don't have RLS by default; just ensure SELECT is granted.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'v_rep_latest_location'
  ) THEN
    GRANT SELECT ON public.v_rep_latest_location TO authenticated;
    GRANT SELECT ON public.v_rep_latest_location TO service_role;
    RAISE NOTICE '✓  Granted SELECT on v_rep_latest_location';
  ELSE
    RAISE NOTICE '⚠  v_rep_latest_location view not found — skipping';
  END IF;
END $$;


-- ── Step 5: Verify ───────────────────────────────────────────

-- 5a. Show portal user role
SELECT
  email,
  raw_app_meta_data ->> 'role' AS jwt_role
FROM auth.users
WHERE email = 'portal@marketlink.co.ke';

-- 5b. Show all policies on reps (should include census_portal_read)
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename  = 'reps'
ORDER BY policyname;

-- 5c. Quick sanity: one row from reps (authenticated role in SQL editor
-- runs as postgres, so RLS will NOT filter here — this confirms data exists)
SELECT id, name, email, zone, status
FROM public.reps
ORDER BY name
LIMIT 5;

-- ============================================================
-- DONE. What to check after running:
--   1. Step 1 SELECT must return 1 row with jwt_role = "authenticated"
--   2. Step 5b must list census_portal_read for reps
--   3. Step 5c must return the actual rep rows (NOT empty)
--
-- Then redeploy / restart the Next.js app (or wait for a cold
-- start) so the census client issues a fresh ROPG token with the
-- corrected role claim. The Team dashboard should then list every
-- rep, including offline ones.
-- ============================================================