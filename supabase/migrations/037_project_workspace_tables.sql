-- ═══════════════════════════════════════════════════════════════
-- Migration 037: Project Workspace tables
-- 1. project_notes — persistent sticky notes on canvas
-- 2. project_members — team membership per project
-- 3. project_messages — project-scoped chat
-- 4. project_analytics_reports — link analytics reports to projects
-- 5. ALTER analytics_saved_reports — add project_id column
-- ═══════════════════════════════════════════════════════════════

BEGIN;

-- ── 1. project_notes ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.project_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  x double precision NOT NULL DEFAULT 200,
  y double precision NOT NULL DEFAULT 200,
  content text NOT NULL DEFAULT 'New note',
  color text NOT NULL DEFAULT '#FCD34D',
  author_id uuid REFERENCES auth.users(id),
  author_name text DEFAULT '',
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_notes_project ON public.project_notes(project_id);

DROP TRIGGER IF EXISTS set_project_notes_updated_at ON public.project_notes;
CREATE TRIGGER set_project_notes_updated_at
  BEFORE UPDATE ON public.project_notes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.project_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin can manage project_notes" ON public.project_notes;
CREATE POLICY "admin can manage project_notes" ON public.project_notes
  FOR ALL TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "client can read project_notes" ON public.project_notes;
CREATE POLICY "client can read project_notes" ON public.project_notes
  FOR SELECT TO authenticated
  USING (
    project_id IN (
      SELECT p.id FROM public.projects p
      JOIN public.clients c ON c.id = p.client_id
      WHERE c.user_id = auth.uid()
    )
  );

-- ── 2. project_members ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.project_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text DEFAULT 'member' CHECK (role IN ('lead','member','viewer')),
  joined_at timestamptz DEFAULT now(),
  UNIQUE(project_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_project_members_project ON public.project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user ON public.project_members(user_id);

ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin can manage project_members" ON public.project_members;
CREATE POLICY "admin can manage project_members" ON public.project_members
  FOR ALL TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "client can read project_members" ON public.project_members;
CREATE POLICY "client can read project_members" ON public.project_members
  FOR SELECT TO authenticated
  USING (
    project_id IN (
      SELECT p.id FROM public.projects p
      JOIN public.clients c ON c.id = p.client_id
      WHERE c.user_id = auth.uid()
    )
  );

-- ── 3. project_messages ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.project_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  author_id uuid REFERENCES auth.users(id),
  author_name text DEFAULT '',
  text text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_messages_project ON public.project_messages(project_id);
CREATE INDEX IF NOT EXISTS idx_project_messages_created ON public.project_messages(project_id, created_at);

ALTER TABLE public.project_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin can manage project_messages" ON public.project_messages;
CREATE POLICY "admin can manage project_messages" ON public.project_messages
  FOR ALL TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "client can read project_messages" ON public.project_messages;
CREATE POLICY "client can read project_messages" ON public.project_messages
  FOR SELECT TO authenticated
  USING (
    project_id IN (
      SELECT p.id FROM public.projects p
      JOIN public.clients c ON c.id = p.client_id
      WHERE c.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "client can send project_messages" ON public.project_messages;
CREATE POLICY "client can send project_messages" ON public.project_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    project_id IN (
      SELECT p.id FROM public.projects p
      JOIN public.clients c ON c.id = p.client_id
      WHERE c.user_id = auth.uid()
    )
  );

-- ── 4. project_analytics_reports ──────────────────────────
CREATE TABLE IF NOT EXISTS public.project_analytics_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  report_id uuid NOT NULL REFERENCES public.analytics_saved_reports(id) ON DELETE CASCADE,
  linked_by uuid REFERENCES auth.users(id),
  linked_at timestamptz DEFAULT now(),
  UNIQUE(project_id, report_id)
);

CREATE INDEX IF NOT EXISTS idx_par_project ON public.project_analytics_reports(project_id);
CREATE INDEX IF NOT EXISTS idx_par_report ON public.project_analytics_reports(report_id);

ALTER TABLE public.project_analytics_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin can manage project_analytics_reports" ON public.project_analytics_reports;
CREATE POLICY "admin can manage project_analytics_reports" ON public.project_analytics_reports
  FOR ALL TO authenticated USING (public.is_admin());

-- ── 5. ALTER analytics_saved_reports — add project_id ─────
ALTER TABLE public.analytics_saved_reports
  ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_saved_reports_project ON public.analytics_saved_reports(project_id);

COMMIT;
