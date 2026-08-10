-- 057_grant_auth_users_select.sql
-- Portal junction reads (client_users -> auth.users FK resolution) require the
-- `authenticated` role to read auth.users. Fresh Supabase projects (and this
-- one, after the 050 privilege-hardening REVOKEs) do not grant this by default,
-- so every portal API 500s with:
--   permission denied for table users
--     hint: Grant the required privileges to the current role with:
--           GRANT SELECT ON auth.users TO authenticated;
-- This migration restores the minimal read grant needed by client_users RLS
-- reads. It is column-restricted to the id we actually compare against.

GRANT SELECT ON auth.users TO authenticated;
