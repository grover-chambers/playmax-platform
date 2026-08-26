-- 062_client_modules.sql
-- Tracks which external modules are activated per client.
-- Part of the PlayMax x NAMPARK RMS x Kanini Rep App integration spec (step 5).
-- A client must have an active row here before the module ingestion endpoint
-- will accept data on its behalf (fail-closed by design).

CREATE TABLE IF NOT EXISTS public.client_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  module_type text NOT NULL CHECK (module_type IN ('route_mapping')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','disabled')),
  route_group text CHECK (route_group IN ('RG-A', 'RG-B', 'RG-C', 'RG-D', 'RG-E', 'RG-F', 'RG-G')),
  activated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (client_id, module_type)
);

CREATE INDEX IF NOT EXISTS idx_client_modules_client_id ON public.client_modules(client_id);

ALTER TABLE public.client_modules ENABLE ROW LEVEL SECURITY;

-- Portal clients may read their own module rows; staff operate via service role.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'client_modules'
      AND policyname = 'client_modules_client_read'
  ) THEN
    CREATE POLICY client_modules_client_read ON public.client_modules
      FOR SELECT
      USING (
        EXISTS (
          SELECT cu.client_id FROM public.client_users cu
          WHERE cu.user_id = auth.uid() AND cu.client_id = client_modules.client_id
        )
      );
  END IF;
END $$;
