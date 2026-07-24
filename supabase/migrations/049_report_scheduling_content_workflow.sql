-- Report scheduling
CREATE TABLE IF NOT EXISTS report_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  report_type TEXT NOT NULL,
  frequency TEXT NOT NULL CHECK (frequency IN ('weekly', 'monthly', 'quarterly')),
  next_run_at TIMESTAMPTZ,
  last_run_at TIMESTAMPTZ,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_report_schedules_next ON report_schedules(next_run_at) WHERE enabled = true;

-- Content workflow status (only if cms_content table exists)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'cms_content') THEN
    ALTER TABLE cms_content ADD COLUMN IF NOT EXISTS workflow_status TEXT NOT NULL DEFAULT 'draft';
    ALTER TABLE cms_content ADD COLUMN IF NOT EXISTS published_by UUID;
    ALTER TABLE cms_content ADD COLUMN IF NOT EXISTS review_notes TEXT;
  END IF;
END $$;

-- Document download tracking (only if documents table exists)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'documents') THEN
    ALTER TABLE documents ADD COLUMN IF NOT EXISTS download_count INTEGER NOT NULL DEFAULT 0;
  END IF;
END $$;

-- Deliverable download tracking (only if deliverables table exists)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'deliverables') THEN
    ALTER TABLE deliverables ADD COLUMN IF NOT EXISTS download_count INTEGER NOT NULL DEFAULT 0;
  END IF;
END $$;
