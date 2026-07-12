-- ═══════════════════════════════════════════════════════════════
-- Migration 004: Security hardening – RLS for reports, tightened
-- policies for bookings, messages, and activity_log.
-- ═══════════════════════════════════════════════════════════════

BEGIN;

-- ── 1. Enable RLS on the reports table ───────────────────────
ALTER TABLE IF EXISTS public.reports ENABLE ROW LEVEL SECURITY;

-- Reports: admins & finance can read all
CREATE POLICY "admin or finance can read reports"
  ON public.reports FOR SELECT TO authenticated
  USING (public.is_admin() OR public.user_role() = 'finance');

-- Reports: only admins can write (insert/update/delete)
CREATE POLICY "admin can insert reports"
  ON public.reports FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "admin can update reports"
  ON public.reports FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "admin can delete reports"
  ON public.reports FOR DELETE TO authenticated
  USING (public.is_admin());

-- Clients can see reports marked visible_to_client for their projects
CREATE POLICY "clients can read visible reports"
  ON public.reports FOR SELECT TO authenticated
  USING (
    visible_to_client = true AND (
      client_id IN (SELECT c.id FROM public.clients c WHERE c.assigned_to = auth.uid())
      OR
      project_id IN (SELECT p.id FROM public.projects p WHERE p.id = project_id)
    )
  );

-- ── 2. Tighten bookings RLS ─────────────────────────────────
-- Drop the overly permissive policies first
DROP POLICY IF EXISTS "authenticated can read bookings" ON public.bookings;
DROP POLICY IF EXISTS "authenticated can insert bookings" ON public.bookings;
DROP POLICY IF EXISTS "authenticated can update bookings" ON public.bookings;

-- Bookings: admin, finance, and crm_staff can read all
CREATE POLICY "staff can read bookings"
  ON public.bookings FOR SELECT TO authenticated
  USING (public.is_admin() OR public.user_role() = ANY(ARRAY['finance', 'crm_staff']));

-- Bookings: admins and finance can insert
CREATE POLICY "admin or finance can insert bookings"
  ON public.bookings FOR INSERT TO authenticated
  WITH CHECK (public.is_admin() OR public.user_role() = 'finance');

-- Bookings: admins and finance can update
CREATE POLICY "admin or finance can update bookings"
  ON public.bookings FOR UPDATE TO authenticated
  USING (public.is_admin() OR public.user_role() = 'finance')
  WITH CHECK (public.is_admin() OR public.user_role() = 'finance');

-- ── 3. Tighten messages RLS ──────────────────────────────────
DROP POLICY IF EXISTS "authenticated can read messages" ON public.messages;
DROP POLICY IF EXISTS "authenticated can insert messages" ON public.messages;

-- Messages: only staff with access to the parent conversation can read
CREATE POLICY "staff can read messages for accessible conversations"
  ON public.messages FOR SELECT TO authenticated
  USING (
    public.is_admin() OR
    conversation_id IN (
      SELECT id FROM public.conversations
      WHERE assigned_to = auth.uid()
    )
  );

-- Messages: only staff with access to the parent conversation can insert
CREATE POLICY "staff can insert messages for accessible conversations"
  ON public.messages FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin() OR
    conversation_id IN (
      SELECT id FROM public.conversations
      WHERE assigned_to = auth.uid()
    )
  );

-- ── 4. Tighten activity_log RLS ──────────────────────────────
DROP POLICY IF EXISTS "authenticated can read activity_log" ON public.activity_log;
DROP POLICY IF EXISTS "authenticated can insert activity_log" ON public.activity_log;

-- Activity log: admin can read all; staff can read entries they are related to
CREATE POLICY "admin can read all activity_log"
  ON public.activity_log FOR SELECT TO authenticated
  USING (public.is_admin() OR user_id = auth.uid());

-- Activity log: only admin can insert
CREATE POLICY "admin can insert activity_log"
  ON public.activity_log FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

-- ── 5. Tighten documents RLS for staff ───────────────────────
-- Drop the overly-permissive staff policy
DROP POLICY IF EXISTS "staff can crud documents for assigned projects" ON public.documents;

-- Staff can SELECT documents for assigned projects
CREATE POLICY "staff can read documents for assigned projects"
  ON public.documents FOR SELECT TO authenticated
  USING (
    NOT public.is_admin() AND (
      project_id IN (SELECT id FROM public.projects WHERE assigned_to = auth.uid())
    )
  );

-- Staff can INSERT documents for assigned projects
CREATE POLICY "staff can insert documents for assigned projects"
  ON public.documents FOR INSERT TO authenticated
  WITH CHECK (
    NOT public.is_admin() AND (
      project_id IN (SELECT id FROM public.projects WHERE assigned_to = auth.uid())
    )
  );

-- Staff can UPDATE (not delete) documents for assigned projects
CREATE POLICY "staff can update documents for assigned projects"
  ON public.documents FOR UPDATE TO authenticated
  USING (
    NOT public.is_admin() AND (
      project_id IN (SELECT id FROM public.projects WHERE assigned_to = auth.uid())
    )
  ) WITH CHECK (
    project_id IN (SELECT id FROM public.projects WHERE assigned_to = auth.uid())
  );

COMMIT;
