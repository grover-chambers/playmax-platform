-- ── Documents table (supersedes deliverables for client-facing files) ──
CREATE TABLE IF NOT EXISTS public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id),
  name text NOT NULL,
  type text NOT NULL DEFAULT 'other' CHECK (type IN ('pdf','docx','xlsx','image','other')),
  url text NOT NULL,
  cloudinary_public_id text,
  size int DEFAULT 0,
  uploaded_by uuid REFERENCES auth.users(id),
  visible_to_client boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add Cloudinary support to existing deliverables
ALTER TABLE public.deliverables
  ADD COLUMN IF NOT EXISTS cloudinary_public_id text,
  ADD COLUMN IF NOT EXISTS visible_to_client boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES public.clients(id);

-- ── Reports table — enriched for client dashboard charts ──
CREATE TABLE IF NOT EXISTS public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid,
  client_id uuid,
  title text NOT NULL,
  type text NOT NULL DEFAULT 'market_research',
  content text,
  visible_to_client boolean DEFAULT false,
  generated_from uuid REFERENCES public.research_projects(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.report_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid REFERENCES public.reports(id) ON DELETE CASCADE,
  metric_key text NOT NULL,
  metric_label text NOT NULL,
  metric_value numeric NOT NULL,
  unit text DEFAULT '',
  chart_type text DEFAULT 'number' CHECK (chart_type IN ('number','bar','line','pie')),
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_documents_project_id ON public.documents(project_id);
CREATE INDEX IF NOT EXISTS idx_documents_client_id ON public.documents(client_id);
CREATE INDEX IF NOT EXISTS idx_report_metrics_report_id ON public.report_metrics(report_id);

-- RLS
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_metrics ENABLE ROW LEVEL SECURITY;

-- Documents RLS
CREATE POLICY "admin can crud documents" ON public.documents
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "staff can crud documents for assigned projects" ON public.documents
  FOR ALL TO authenticated USING (
    NOT public.is_admin() AND (
      project_id IN (SELECT id FROM public.projects WHERE assigned_to = auth.uid())
      OR
      EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.assigned_to = auth.uid())
    )
  ) WITH CHECK (
    project_id IN (SELECT id FROM public.projects WHERE assigned_to = auth.uid())
  );

CREATE POLICY "clients can read visible documents" ON public.documents
  FOR SELECT TO authenticated USING (
    visible_to_client = true AND client_id IN (SELECT id FROM public.clients WHERE assigned_to = auth.uid())
  );

-- Reports RLS
CREATE POLICY "admin can crud reports" ON public.reports
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Report metrics RLS
CREATE POLICY "admin can crud report metrics" ON public.report_metrics
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "clients can read visible report metrics" ON public.report_metrics
  FOR SELECT TO authenticated USING (
    report_id IN (SELECT id FROM public.reports WHERE visible_to_client = true)
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_reports_project_id ON public.reports(project_id);
CREATE INDEX IF NOT EXISTS idx_reports_client_id ON public.reports(client_id);

-- Triggers
CREATE TRIGGER set_reports_updated_at
  BEFORE UPDATE ON public.reports
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_documents_updated_at
  BEFORE UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMIT;
