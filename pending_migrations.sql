-- ═══ 017_deliverable_approval.sql ═══
-- Add approval workflow columns to deliverables table
ALTER TABLE public.deliverables
  ADD COLUMN IF NOT EXISTS approval_status text DEFAULT 'pending'
    CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  ADD COLUMN IF NOT EXISTS client_feedback text,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES auth.users(id);

-- Index for filtering by approval status
CREATE INDEX IF NOT EXISTS idx_deliverables_approval ON public.deliverables(approval_status, client_id);


-- ═══ 018_notifications.sql ═══
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


-- ═══ 019_milestones.sql ═══
CREATE TABLE IF NOT EXISTS public.project_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  due_date date,
  status text DEFAULT 'pending'
    CHECK (status IN ('pending','in_progress','completed','cancelled')),
  sort_order int DEFAULT 0,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_milestones_project ON public.project_milestones(project_id);
CREATE INDEX IF NOT EXISTS idx_milestones_client ON public.project_milestones(client_id);

DROP TRIGGER IF EXISTS set_milestones_updated_at ON public.project_milestones;
CREATE TRIGGER set_milestones_updated_at
  BEFORE UPDATE ON public.project_milestones
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.project_milestones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin can manage milestones" ON public.project_milestones;
DROP POLICY IF EXISTS "client can read their milestones" ON public.project_milestones;

CREATE POLICY "admin can manage milestones" ON public.project_milestones
  FOR ALL TO authenticated USING (public.is_admin());

CREATE POLICY "client can read their milestones" ON public.project_milestones
  FOR SELECT TO authenticated
  USING (
    client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid())
  );


-- ═══ 020_invoice_payments.sql ═══
CREATE TABLE IF NOT EXISTS public.invoice_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  method text NOT NULL CHECK (method IN ('mpesa','card','bank_transfer','cash','other')),
  reference text,
  amount numeric(15,2) NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending','completed','failed','refunded')),
  mpesa_receipt text,
  mpesa_phone text,
  paid_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoice_payments_invoice ON public.invoice_payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_payments_client ON public.invoice_payments(client_id);

ALTER TABLE public.invoice_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "client can read their payments" ON public.invoice_payments;
DROP POLICY IF EXISTS "client can insert their payments" ON public.invoice_payments;
DROP POLICY IF EXISTS "admin can manage payments" ON public.invoice_payments;

CREATE POLICY "client can read their payments" ON public.invoice_payments
  FOR SELECT TO authenticated
  USING (
    client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid())
  );

CREATE POLICY "client can insert their payments" ON public.invoice_payments
  FOR INSERT TO authenticated
  WITH CHECK (
    client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid())
  );

CREATE POLICY "admin can manage payments" ON public.invoice_payments
  FOR ALL TO authenticated USING (public.is_admin());


-- ═══ 021_client_activity_log.sql ═══
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
