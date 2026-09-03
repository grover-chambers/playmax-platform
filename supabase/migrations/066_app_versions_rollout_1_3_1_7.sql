-- 066: Promote Kanini Field 1.3.1+7 recovery build
-- Census project zsprlozgdxzxeevvetmg
-- This is the CUMULATIVE update — reps jump directly 1.3.0+5 -> 1.3.1+7, no sequence.

BEGIN;
INSERT INTO public.app_versions (id, version_name, version_code, apk_url, notes, is_latest)
VALUES (
  gen_random_uuid(),
  '1.3.1',
  7,
  'https://zsprlozgdxzxeevvetmg.supabase.co/storage/v1/object/public/app-releases/kanini-field-1.3.1-arm64.apk',
  'Recovery: brute-read Hive cache + direct upsert (bypasses edge limit) + diagnostics backup + chunked push/pull + photo retry + open heartbeat. Single update covers all.',
  false
)
ON CONFLICT (version_code) DO UPDATE SET
  version_name = EXCLUDED.version_name,
  apk_url      = EXCLUDED.apk_url,
  notes        = EXCLUDED.notes;

-- To promote (controlled rollout): 
-- UPDATE app_versions SET is_latest=false WHERE version_code<>7;
-- UPDATE app_versions SET is_latest=true WHERE version_code=7;
COMMIT;
