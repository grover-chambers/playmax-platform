-- ================================================================
-- Migration 050: Move user roles from user_metadata → app_metadata
-- ================================================================
-- SECURITY FIX (C1): `user_metadata` is writable by any authenticated
-- user via `auth.updateUser({ data: { role: "super_admin" } })`. This
-- made every downstream check (RLS `user_role()`, middleware guards,
-- admin route checks) trivially bypassable.
--
-- Roles now live in `app_metadata`, which can ONLY be written with the
-- service-role key through the Admin API. The public updateUser() API
-- cannot modify app_metadata.
--
-- This migration:
--   1. Backfills existing roles from user_metadata → app_metadata.
--   2. Recreates user_role()/is_admin() to read from app_metadata.
-- ================================================================

BEGIN;

-- ── 1. Backfill: copy user_metadata.role → app_metadata.role ──────
-- (Only where app_metadata has no role yet, so server-set roles win.)
UPDATE auth.users
SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb)
                        || jsonb_build_object('role', raw_user_meta_data -> 'role')
WHERE raw_user_meta_data ? 'role'
  AND NOT COALESCE(raw_app_meta_data, '{}'::jsonb) ? 'role';

-- ── 2. Redefine helpers to read app_metadata ──────────────────────
CREATE OR REPLACE FUNCTION public.user_role() RETURNS text AS $$
  SELECT COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', 'client');
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION public.is_admin() RETURNS boolean AS $$
  SELECT public.user_role() = ANY(ARRAY['super_admin', 'crm_admin', 'cms_admin']);
$$ LANGUAGE sql STABLE;

COMMIT;
