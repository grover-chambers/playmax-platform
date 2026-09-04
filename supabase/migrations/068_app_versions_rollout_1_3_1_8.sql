-- 068: Promote Kanini Field 1.3.1+8 (V8) — supersedes 1.3.1+7 RECOVERY
-- Fixes: 067 42P01 for client_categories + Recover always-visible + RLS-correct recovery
-- Census project zsprlozgdxzxeevvetmg — single cumulative jump 5 -> 8, no sequence.
BEGIN;
INSERT INTO public.app_versions (id, version_name, version_code, apk_url, notes, is_latest)
VALUES (
  gen_random_uuid(),
  '1.3.1',
  8,
  'https://zsprlozgdxzxeevvetmg.supabase.co/storage/v1/object/public/app-releases/kanini-field-1.3.1-arm64.apk',
  'V8: Fix 067 42P01, Recover always-visible, direct via sync-push service_role, chunked 1.5MB, diagnostics. Cumulative 5->8.',
  false
)
ON CONFLICT (version_code) DO UPDATE SET
  version_name = EXCLUDED.version_name,
  apk_url      = EXCLUDED.apk_url,
  notes        = EXCLUDED.notes;
-- Promote when ready:
-- BEGIN; UPDATE app_versions SET is_latest=false WHERE version_code<>8; UPDATE app_versions SET is_latest=true WHERE version_code=8; COMMIT;
COMMIT;
