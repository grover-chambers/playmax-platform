BEGIN;

ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS source_job_id uuid REFERENCES public.report_jobs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'raw' CHECK (kind IN ('raw','ai_summary')),
  ADD COLUMN IF NOT EXISTS storage_url text;

ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS source_report_id uuid REFERENCES public.reports(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_reports_source_job ON public.reports(source_job_id);
CREATE INDEX IF NOT EXISTS idx_documents_source_report ON public.documents(source_report_id);

COMMENT ON COLUMN public.reports.visible_to_client IS
  'Legacy — no longer used for access control. A report is published to a client via a documents row with source_report_id pointing here.';

COMMIT;
