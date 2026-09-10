-- 079_storage_rls.sql
-- Private buckets shelf-photos & diagnostics: authenticated RLS scoped to app_scope() uid folder prefix.
-- Edge functions use service_role and bypass RLS (policies TO authenticated only).
BEGIN;

INSERT INTO storage.buckets (id, name, public) VALUES ('shelf-photos','shelf-photos', false) ON CONFLICT (id) DO UPDATE SET public=false;
INSERT INTO storage.buckets (id, name, public) VALUES ('diagnostics','diagnostics', false) ON CONFLICT (id) DO UPDATE SET public=false;

-- Enable RLS (already enabled in supabase storage, but ensure)
-- Create policies for shelf-photos
DROP POLICY IF EXISTS "shelf-photos select own folder" ON storage.objects;
CREATE POLICY "shelf-photos select own folder" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id='shelf-photos' AND (storage.foldername(name))[1] = (SELECT uid::text FROM public.app_scope()));

DROP POLICY IF EXISTS "shelf-photos insert own folder" ON storage.objects;
CREATE POLICY "shelf-photos insert own folder" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id='shelf-photos' AND (storage.foldername(name))[1] = (SELECT uid::text FROM public.app_scope()));

DROP POLICY IF EXISTS "shelf-photos update own folder" ON storage.objects;
CREATE POLICY "shelf-photos update own folder" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id='shelf-photos' AND (storage.foldername(name))[1] = (SELECT uid::text FROM public.app_scope()))
  WITH CHECK (bucket_id='shelf-photos' AND (storage.foldername(name))[1] = (SELECT uid::text FROM public.app_scope()));

DROP POLICY IF EXISTS "shelf-photos delete own folder" ON storage.objects;
CREATE POLICY "shelf-photos delete own folder" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id='shelf-photos' AND (storage.foldername(name))[1] = (SELECT uid::text FROM public.app_scope()));

-- diagnostics bucket same pattern
DROP POLICY IF EXISTS "diagnostics select own folder" ON storage.objects;
CREATE POLICY "diagnostics select own folder" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id='diagnostics' AND (storage.foldername(name))[1] = (SELECT uid::text FROM public.app_scope()));

DROP POLICY IF EXISTS "diagnostics insert own folder" ON storage.objects;
CREATE POLICY "diagnostics insert own folder" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id='diagnostics' AND (storage.foldername(name))[1] = (SELECT uid::text FROM public.app_scope()));

DROP POLICY IF EXISTS "diagnostics update own folder" ON storage.objects;
CREATE POLICY "diagnostics update own folder" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id='diagnostics' AND (storage.foldername(name))[1] = (SELECT uid::text FROM public.app_scope()))
  WITH CHECK (bucket_id='diagnostics' AND (storage.foldername(name))[1] = (SELECT uid::text FROM public.app_scope()));

DROP POLICY IF EXISTS "diagnostics delete own folder" ON storage.objects;
CREATE POLICY "diagnostics delete own folder" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id='diagnostics' AND (storage.foldername(name))[1] = (SELECT uid::text FROM public.app_scope()));

COMMIT;
