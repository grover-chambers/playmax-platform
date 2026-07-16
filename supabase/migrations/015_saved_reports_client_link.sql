-- ═══════════════════════════════════════════════════════════════
-- Migration 015: Enhance analytics_saved_reports for client visibility
-- 1. Add client_id to link reports to specific clients (suppliers)
-- 2. Add visible_to_client toggle
-- 3. Add generated_data jsonb to store query results
-- 4. Add RLS policy so clients can read their own visible reports
-- ═══════════════════════════════════════════════════════════════

BEGIN;

-- 1. Add columns to analytics_saved_reports
ALTER TABLE public.analytics_saved_reports
  ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS visible_to_client boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS generated_data jsonb DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_saved_reports_client ON public.analytics_saved_reports(client_id);
CREATE INDEX IF NOT EXISTS idx_saved_reports_visible ON public.analytics_saved_reports(client_id, visible_to_client);

-- 2. Add RLS policy for clients to read their own visible reports
DROP POLICY IF EXISTS "client can read own visible reports" ON public.analytics_saved_reports;
CREATE POLICY "client can read own visible reports" ON public.analytics_saved_reports
  FOR SELECT TO authenticated
  USING (
    visible_to_client = true
    AND client_id IN (
      SELECT id FROM public.clients WHERE user_id = auth.uid()
    )
  );

COMMIT;
