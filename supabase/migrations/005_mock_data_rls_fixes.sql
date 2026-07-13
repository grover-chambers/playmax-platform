-- ═══════════════════════════════════════════════════════════════
-- Migration 005: Fix mock data tables – add updated_at to tables
-- that were missing it, add RLS policies for automations & templates.
-- ═══════════════════════════════════════════════════════════════

BEGIN;

-- ── 1. Add updated_at to tables that are missing it ──────────

-- messages
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
DROP TRIGGER IF EXISTS set_messages_updated_at ON public.messages;
CREATE TRIGGER set_messages_updated_at
  BEFORE UPDATE ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- deliverables
ALTER TABLE public.deliverables ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
DROP TRIGGER IF EXISTS set_deliverables_updated_at ON public.deliverables;
CREATE TRIGGER set_deliverables_updated_at
  BEFORE UPDATE ON public.deliverables
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- activity_log
ALTER TABLE public.activity_log ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
DROP TRIGGER IF EXISTS set_activity_log_updated_at ON public.activity_log;
CREATE TRIGGER set_activity_log_updated_at
  BEFORE UPDATE ON public.activity_log
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- report_metrics
ALTER TABLE public.report_metrics ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
DROP TRIGGER IF EXISTS set_report_metrics_updated_at ON public.report_metrics;
CREATE TRIGGER set_report_metrics_updated_at
  BEFORE UPDATE ON public.report_metrics
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── 2. Add RLS policies for automations ─────────────────────
DROP POLICY IF EXISTS "admin can read automations" ON public.automations;
DROP POLICY IF EXISTS "admin can insert automations" ON public.automations;
DROP POLICY IF EXISTS "admin can update automations" ON public.automations;
DROP POLICY IF EXISTS "admin can delete automations" ON public.automations;

CREATE POLICY "admin can read automations"
  ON public.automations FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY "admin can insert automations"
  ON public.automations FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "admin can update automations"
  ON public.automations FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "admin can delete automations"
  ON public.automations FOR DELETE TO authenticated
  USING (public.is_admin());

-- ── 3. Add RLS policies for templates ───────────────────────
DROP POLICY IF EXISTS "admin can read templates" ON public.templates;
DROP POLICY IF EXISTS "admin can insert templates" ON public.templates;
DROP POLICY IF EXISTS "admin can update templates" ON public.templates;
DROP POLICY IF EXISTS "admin can delete templates" ON public.templates;

CREATE POLICY "admin can read templates"
  ON public.templates FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY "admin can insert templates"
  ON public.templates FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "admin can update templates"
  ON public.templates FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "admin can delete templates"
  ON public.templates FOR DELETE TO authenticated
  USING (public.is_admin());

COMMIT;
