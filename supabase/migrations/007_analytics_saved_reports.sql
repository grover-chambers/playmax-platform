-- ═══════════════════════════════════════════════════════════════
-- Migration 007: Saved reports for the analytics engine
-- ═══════════════════════════════════════════════════════════════

BEGIN;

CREATE TABLE IF NOT EXISTS public.analytics_saved_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  report_type text NOT NULL DEFAULT 'market_share',
  config jsonb NOT NULL DEFAULT '{}',
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_analytics_saved_reports_type ON public.analytics_saved_reports(report_type);
CREATE INDEX IF NOT EXISTS idx_analytics_saved_reports_created_by ON public.analytics_saved_reports(created_by);

ALTER TABLE public.analytics_saved_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin can read analytics_saved_reports" ON public.analytics_saved_reports;
CREATE POLICY "admin can read analytics_saved_reports" ON public.analytics_saved_reports
  FOR SELECT TO authenticated USING (public.is_admin());
DROP POLICY IF EXISTS "admin can insert analytics_saved_reports" ON public.analytics_saved_reports;
CREATE POLICY "admin can insert analytics_saved_reports" ON public.analytics_saved_reports
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "admin can update analytics_saved_reports" ON public.analytics_saved_reports;
CREATE POLICY "admin can update analytics_saved_reports" ON public.analytics_saved_reports
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "admin can delete analytics_saved_reports" ON public.analytics_saved_reports;
CREATE POLICY "admin can delete analytics_saved_reports" ON public.analytics_saved_reports
  FOR DELETE TO authenticated USING (public.is_admin());

DROP TRIGGER IF EXISTS set_analytics_saved_reports_updated_at ON public.analytics_saved_reports;
CREATE TRIGGER set_analytics_saved_reports_updated_at
  BEFORE UPDATE ON public.analytics_saved_reports
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMIT;
