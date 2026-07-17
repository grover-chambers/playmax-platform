CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'general'
    CHECK (type IN ('deliverable','invoice','message','booking','milestone','general')),
  title text NOT NULL,
  message text,
  link text,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_client ON public.notifications(client_id, read, created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "client can read their notifications" ON public.notifications;
DROP POLICY IF EXISTS "client can update their notifications" ON public.notifications;

CREATE POLICY "client can read their notifications" ON public.notifications
  FOR SELECT TO authenticated
  USING (
    client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid())
  );

CREATE POLICY "client can update their notifications" ON public.notifications
  FOR UPDATE TO authenticated
  USING (
    client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid())
  )
  WITH CHECK (
    client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid())
  );

-- Admins can insert notifications (for sending alerts to clients)
DROP POLICY IF EXISTS "admin can insert notifications" ON public.notifications;
CREATE POLICY "admin can insert notifications" ON public.notifications
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());
