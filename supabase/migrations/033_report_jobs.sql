-- Background report generation job queue
CREATE TABLE IF NOT EXISTS public.report_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.research_projects(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  report_type text NOT NULL DEFAULT 'ai_analysis',
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','processing','complete','failed')),
  algorithms text[] NOT NULL DEFAULT '{}',
  progress integer DEFAULT 0,
  result_url text,
  error_message text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_report_jobs_status ON public.report_jobs(status);
CREATE INDEX IF NOT EXISTS idx_report_jobs_project ON public.report_jobs(project_id);

ALTER TABLE public.report_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin can manage report jobs" ON public.report_jobs
  FOR ALL TO authenticated USING (
    public.is_admin()
  );
