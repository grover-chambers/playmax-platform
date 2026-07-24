-- ================================================================
-- Migration 048: Multi-user support + portal roles
-- ================================================================
-- Adds client_users junction table so multiple auth users can
-- access the same client portal with different roles.
-- ================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS client_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  portal_role TEXT NOT NULL DEFAULT 'viewer' CHECK (portal_role IN ('admin', 'viewer')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(client_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_client_users_user ON client_users(user_id);
CREATE INDEX IF NOT EXISTS idx_client_users_client ON client_users(client_id);

ALTER TABLE client_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin manage client_users" ON client_users;
CREATE POLICY "admin manage client_users" ON client_users
  FOR ALL TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "user read own client_users" ON client_users;
CREATE POLICY "user read own client_users" ON client_users
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

COMMIT;
