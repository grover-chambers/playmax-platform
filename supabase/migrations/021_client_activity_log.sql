CREATE TABLE IF NOT EXISTS public.client_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  activity_type text NOT NULL
    CHECK (activity_type IN ('project_update','invoice_event','booking_event','deliverable_event','message_event','milestone_event','payment_event','general')),
  title text NOT NULL,
  description text,
  entity_type text,
  entity_id text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_activity_client ON public.client_activity_log(client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_client_activity_type ON public.client_activity_log(client_id, activity_type);

ALTER TABLE public.client_activity_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "client can read their activity" ON public.client_activity_log;
DROP POLICY IF EXISTS "admin can manage activity" ON public.client_activity_log;

CREATE POLICY "client can read their activity" ON public.client_activity_log
  FOR SELECT TO authenticated
  USING (
    client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid())
  );

CREATE POLICY "admin can manage activity" ON public.client_activity_log
  FOR ALL TO authenticated USING (public.is_admin());
