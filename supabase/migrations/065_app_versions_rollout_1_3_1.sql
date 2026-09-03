-- 065: Stage Kanini Field 1.3.1+6 rollout (M4 codified)
-- Census project zsprlozgdxzxeevvetmg — field app update mechanism.
-- This migration does NOT flip is_latest. Upload APK first, then run the
-- second statement to make 1.3.1 the latest for UpdateService.
-- Keep is_latest=false while sideload-testing; flip to true for controlled rollout.

BEGIN;

-- 1) Insert staged row for 1.3.1+6. apk_url must match the app-releases bucket object
-- you upload (public). Keep is_latest=false during test.
INSERT INTO public.app_versions (id, version_name, version_code, apk_url, notes, is_latest)
VALUES (
  gen_random_uuid(),
  '1.3.1',
  6,
  'https://zsprlozgdxzxeevvetmg.supabase.co/storage/v1/object/public/app-releases/kanini-field-1.3.1-arm64.apk',
  'Fix: chunked sync (1.5MB slices), pending_media photo retry, open heartbeat (B1+B2). Unreleased — sideload test only.',
  false
)
ON CONFLICT (version_code) DO UPDATE SET
  version_name = EXCLUDED.version_name,
  apk_url      = EXCLUDED.apk_url,
  notes        = EXCLUDED.notes;

-- 2) To promote 1.3.1+6 to latest (controlled rollout), run:
-- BEGIN;
-- UPDATE public.app_versions SET is_latest = false WHERE version_code <> 6;
-- UPDATE public.app_versions SET is_latest = true  WHERE version_code = 6;
-- COMMIT;
-- App reads via: SELECT * FROM app_versions WHERE is_latest ORDER BY version_code DESC LIMIT 1

COMMIT;
