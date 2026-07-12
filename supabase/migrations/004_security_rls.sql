-- ═══════════════════════════════════════════════════════════════
-- Migration 004: Security hardening – RLS for reports, tightened
-- policies for bookings, messages, and activity_log.
-- ═══════════════════════════════════════════════════════════════
-- NOTE: Apply supabase/schema.sql FIRST (creates all base tables).
-- This migration only adds policies and the reports table.
-- ═══════════════════════════════════════════════════════════════

BEGIN;

-- ── 0. Ensure reports table exists (was missing DDL in migration 003) ─
-- FK constraints added via DO block so the migration doesn't fail if
-- parent tables haven't been created yet (they're applied in schema.sql).
CREATE TABLE IF NOT EXISTS public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid,
  client_id uuid,
  title text NOT NULL,
  type text NOT NULL DEFAULT 'market_research',
  content text,
  visible_to_client boolean DEFAULT false,
  generated_from uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'projects') THEN
    IF NOT EXISTS (SELECT FROM pg_constraint WHERE conname = 'reports_project_id_fkey') THEN
      ALTER TABLE public.reports ADD CONSTRAINT reports_project_id_fkey
        FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;
    END IF;
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'clients') THEN
    IF NOT EXISTS (SELECT FROM pg_constraint WHERE conname = 'reports_client_id_fkey') THEN
      ALTER TABLE public.reports ADD CONSTRAINT reports_client_id_fkey
        FOREIGN KEY (client_id) REFERENCES public.clients(id);
    END IF;
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'research_projects') THEN
    IF NOT EXISTS (SELECT FROM pg_constraint WHERE conname = 'reports_generated_from_fkey') THEN
      ALTER TABLE public.reports ADD CONSTRAINT reports_generated_from_fkey
        FOREIGN KEY (generated_from) REFERENCES public.research_projects(id);
    END IF;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_reports_project_id ON public.reports(project_id);
CREATE INDEX IF NOT EXISTS idx_reports_client_id ON public.reports(client_id);

-- ── 1. Enable RLS on the reports table ───────────────────────
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

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
DROP POLICY IF EXISTS "authenticated can read bookings" ON public.bookings;
DROP POLICY IF EXISTS "authenticated can insert bookings" ON public.bookings;
DROP POLICY IF EXISTS "authenticated can update bookings" ON public.bookings;

CREATE POLICY "staff can read bookings"
  ON public.bookings FOR SELECT TO authenticated
  USING (public.is_admin() OR public.user_role() = ANY(ARRAY['finance', 'crm_staff']));

CREATE POLICY "admin or finance can insert bookings"
  ON public.bookings FOR INSERT TO authenticated
  WITH CHECK (public.is_admin() OR public.user_role() = 'finance');

CREATE POLICY "admin or finance can update bookings"
  ON public.bookings FOR UPDATE TO authenticated
  USING (public.is_admin() OR public.user_role() = 'finance')
  WITH CHECK (public.is_admin() OR public.user_role() = 'finance');

-- ── 3. Tighten messages RLS ──────────────────────────────────
DROP POLICY IF EXISTS "authenticated can read messages" ON public.messages;
DROP POLICY IF EXISTS "authenticated can insert messages" ON public.messages;

CREATE POLICY "staff can read messages for accessible conversations"
  ON public.messages FOR SELECT TO authenticated
  USING (
    public.is_admin() OR
    conversation_id IN (
      SELECT id FROM public.conversations
      WHERE assigned_to = auth.uid()
    )
  );

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

CREATE POLICY "admin can read all activity_log"
  ON public.activity_log FOR SELECT TO authenticated
  USING (public.is_admin() OR user_id = auth.uid());

CREATE POLICY "admin can insert activity_log"
  ON public.activity_log FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

-- ── 5. Tighten documents RLS for staff ───────────────────────
DROP POLICY IF EXISTS "staff can crud documents for assigned projects" ON public.documents;

CREATE POLICY "staff can read documents for assigned projects"
  ON public.documents FOR SELECT TO authenticated
  USING (
    NOT public.is_admin() AND (
      project_id IN (SELECT id FROM public.projects WHERE assigned_to = auth.uid())
    )
  );

CREATE POLICY "staff can insert documents for assigned projects"
  ON public.documents FOR INSERT TO authenticated
  WITH CHECK (
    NOT public.is_admin() AND (
      project_id IN (SELECT id FROM public.projects WHERE assigned_to = auth.uid())
    )
  );

CREATE POLICY "staff can update documents for assigned projects"
  ON public.documents FOR UPDATE TO authenticated
  USING (
    NOT public.is_admin() AND (
      project_id IN (SELECT id FROM public.projects WHERE assigned_to = auth.uid())
    )
  ) WITH CHECK (
    project_id IN (SELECT id FROM public.projects WHERE assigned_to = auth.uid())
  );

-- Trigger for reports
DROP TRIGGER IF EXISTS set_reports_updated_at ON public.reports;
CREATE TRIGGER set_reports_updated_at
  BEFORE UPDATE ON public.reports
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMIT;
