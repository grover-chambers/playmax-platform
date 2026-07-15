-- 008_portal_user_link.sql
-- Link clients to Supabase auth users and add RLS policies for client portal access.

BEGIN;

-- 1. Add user_id column to clients table
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON public.clients(user_id);

-- 2. RLS policies

-- clients: client can read own record
DROP POLICY IF EXISTS "client can read own record" ON public.clients;
CREATE POLICY "client can read own record" ON public.clients
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- projects: client can read own projects
DROP POLICY IF EXISTS "client can read own projects" ON public.projects;
CREATE POLICY "client can read own projects" ON public.projects
  FOR SELECT TO authenticated
  USING (
    public.user_role() = 'client' AND
    client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid())
  );

-- bookings: client can read own bookings
DROP POLICY IF EXISTS "client can read own bookings" ON public.bookings;
CREATE POLICY "client can read own bookings" ON public.bookings
  FOR SELECT TO authenticated
  USING (
    public.user_role() = 'client' AND
    client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid())
  );

-- invoices: client can read own invoices
DROP POLICY IF EXISTS "client can read own invoices" ON public.invoices;
CREATE POLICY "client can read own invoices" ON public.invoices
  FOR SELECT TO authenticated
  USING (
    public.user_role() = 'client' AND
    client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid())
  );

-- conversations: client can read own conversations
DROP POLICY IF EXISTS "client can read own conversations" ON public.conversations;
CREATE POLICY "client can read own conversations" ON public.conversations
  FOR SELECT TO authenticated
  USING (
    public.user_role() = 'client' AND
    client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid())
  );

-- messages: client can read own messages
DROP POLICY IF EXISTS "client can read own messages" ON public.messages;
CREATE POLICY "client can read own messages" ON public.messages
  FOR SELECT TO authenticated
  USING (
    public.user_role() = 'client' AND
    conversation_id IN (
      SELECT id FROM public.conversations
      WHERE client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid())
    )
  );

-- documents: client can read own visible documents
DROP POLICY IF EXISTS "client can read own visible documents" ON public.documents;
CREATE POLICY "client can read own visible documents" ON public.documents
  FOR SELECT TO authenticated
  USING (
    public.user_role() = 'client' AND
    visible_to_client = true AND
    client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid())
  );

-- reports: client can read own visible reports
DROP POLICY IF EXISTS "client can read own visible reports" ON public.reports;
CREATE POLICY "client can read own visible reports" ON public.reports
  FOR SELECT TO authenticated
  USING (
    public.user_role() = 'client' AND
    visible_to_client = true AND
    client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid())
  );

-- deliverables: client can read own deliverables
DROP POLICY IF EXISTS "client can read own deliverables" ON public.deliverables;
CREATE POLICY "client can read own deliverables" ON public.deliverables
  FOR SELECT TO authenticated
  USING (
    public.user_role() = 'client' AND
    visible_to_client = true AND
    client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid())
  );

-- messages: client can send own messages (INSERT)
DROP POLICY IF EXISTS "client can send own messages" ON public.messages;
CREATE POLICY "client can send own messages" ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK (
    public.user_role() = 'client' AND
    conversation_id IN (
      SELECT id FROM public.conversations
      WHERE client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid())
    )
  );

COMMIT;
