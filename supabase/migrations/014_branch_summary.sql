-- Migration 014: Branch summary fact table for Grand Total / aggregate metrics
-- Captures branch-level totals from per-store sales files for market share analysis
-- These rows are skipped from normal staging but captured here for dashboards

-- Branch-level summary: one row per branch × period × supplier
CREATE TABLE IF NOT EXISTS analytics_fact_branch_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id UUID REFERENCES analytics_staging_uploads(id) ON DELETE SET NULL,
  branch_id UUID REFERENCES analytics_branches(id) ON DELETE SET NULL,
  period_id UUID REFERENCES analytics_periods(id) ON DELETE SET NULL,
  supplier_name TEXT,
  total_quantity NUMERIC,
  total_weight_tonnes NUMERIC,
  total_amount NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for dashboard queries
CREATE INDEX IF NOT EXISTS idx_branch_summary_branch_period
  ON analytics_fact_branch_summary(branch_id, period_id);

CREATE INDEX IF NOT EXISTS idx_branch_summary_period
  ON analytics_fact_branch_summary(period_id);

-- Unique constraint: one summary per branch × period × supplier
CREATE UNIQUE INDEX IF NOT EXISTS idx_branch_summary_unique
  ON analytics_fact_branch_summary(branch_id, period_id, supplier_name)
  WHERE supplier_name IS NOT NULL;

-- RLS: admins can read/write, clients see only shared summaries
ALTER TABLE analytics_fact_branch_summary ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS "admin can read branch_summary" ON analytics_fact_branch_summary;
  DROP POLICY IF EXISTS "admin can write branch_summary" ON analytics_fact_branch_summary;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "admin can read branch_summary" ON analytics_fact_branch_summary
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM analytics_staging_uploads u
      WHERE u.uploaded_by = auth.uid()
    )
    OR auth.jwt()->>'role' IN ('super_admin', 'crm_admin')
  );

CREATE POLICY "admin can write branch_summary" ON analytics_fact_branch_summary
  FOR ALL USING (
    auth.jwt()->>'role' IN ('super_admin', 'crm_admin')
  );

COMMENT ON TABLE analytics_fact_branch_summary IS
  'Branch-level aggregate metrics from Grand Total rows in per-store sales files. '
  'Used for market share analysis, competitor performance, and branch KPI dashboards. '
  'Grain: branch × period × supplier.';
