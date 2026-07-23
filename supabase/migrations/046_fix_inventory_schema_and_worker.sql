-- Migration 046: Fix inventory schema drift + ETL worker support
-- 045's DROP TABLE CASCADE on analytics_fact_inventory lost supplier_id, sub_category_id, and 4 indexes.
-- This migration restores them and adds worker infrastructure.

BEGIN;

-- ══════════════════════════════════════════════════════════
-- 1. analytics_fact_inventory — restore missing columns
-- ══════════════════════════════════════════════════════════
ALTER TABLE public.analytics_fact_inventory
  ADD COLUMN IF NOT EXISTS supplier_id uuid REFERENCES public.analytics_suppliers(id),
  ADD COLUMN IF NOT EXISTS sub_category_id uuid;

-- ══════════════════════════════════════════════════════════
-- 2. analytics_fact_inventory — restore lost indexes
-- ══════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_fact_inventory_supplier
  ON public.analytics_fact_inventory(supplier_id);
CREATE INDEX IF NOT EXISTS idx_analytics_fact_inventory_product
  ON public.analytics_fact_inventory(product_id);
CREATE INDEX IF NOT EXISTS idx_analytics_fact_inventory_branch
  ON public.analytics_fact_inventory(branch_id);

-- ══════════════════════════════════════════════════════════
-- 3. reports — add unique constraint for idempotent ETL inserts
-- ══════════════════════════════════════════════════════════
DO $$
BEGIN
  -- Add source_job_id column if it doesn't exist (used for idempotent report creation)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'reports'
    AND column_name = 'source_job_id'
  ) THEN
    ALTER TABLE public.reports ADD COLUMN source_job_id uuid;
  END IF;

  -- Add unique constraint on source_job_id (excluding nulls)
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'reports_source_job_id_unique'
  ) THEN
    CREATE UNIQUE INDEX reports_source_job_id_unique
      ON public.reports(source_job_id)
      WHERE source_job_id IS NOT NULL;
  END IF;
END $$;

-- ══════════════════════════════════════════════════════════
-- 4. claim_job() — atomic job claiming RPC for ETL worker
-- ══════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.claim_job(job_id uuid)
RETURNS SETOF public.report_jobs
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE public.report_jobs
  SET status = 'processing', progress = 10, updated_at = now()
  WHERE id = job_id AND status = 'queued'
  RETURNING *;
$$;

-- ══════════════════════════════════════════════════════════
-- 5. append_report_to_project() — atomic metadata append for ETL worker
-- ══════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.append_report_to_project(
  p_project_id uuid,
  p_report jsonb
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE public.research_projects
  SET metadata = jsonb_set(
    COALESCE(metadata, '{}'::jsonb),
    '{reports}',
    COALESCE(metadata->'reports', '[]'::jsonb) || p_report
  )
  WHERE id = p_project_id;
$$;

COMMIT;
