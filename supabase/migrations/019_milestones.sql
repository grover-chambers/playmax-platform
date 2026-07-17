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
