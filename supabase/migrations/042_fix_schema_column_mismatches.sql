BEGIN;

-- Ensure notifications.user_id exists (migration 040 may not have been applied)
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add company_name as an alias for company on clients (code references both)
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS company_name text GENERATED ALWAYS AS (COALESCE(company, name)) STORED;

COMMIT;
