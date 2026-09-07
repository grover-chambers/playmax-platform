-- 074_census_batches.sql
-- Census batches: first-class batch container for field census records.
-- Each batch groups outlets, visits, contacts, and observations so the
-- dashboard can track incoming data by submission event rather than
-- as an undifferentiated stream.

-- ── census_batches ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS census_batches (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rep_id        UUID NOT NULL REFERENCES reps(id),
  device_id     TEXT NOT NULL DEFAULT '',
  batch_number  TEXT NOT NULL,
  started_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  submitted_at  TIMESTAMPTZ,
  synced_at     TIMESTAMPTZ,
  record_count  INTEGER NOT NULL DEFAULT 0,
  quality_flags TEXT[] NOT NULL DEFAULT '{}',
  status        TEXT NOT NULL DEFAULT 'draft',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_census_batches_number ON census_batches(batch_number);
CREATE INDEX IF NOT EXISTS idx_census_batches_rep ON census_batches(rep_id);
CREATE INDEX IF NOT EXISTS idx_census_batches_status ON census_batches(status);
CREATE INDEX IF NOT EXISTS idx_census_batches_started ON census_batches(started_at DESC);

ALTER TABLE census_batches ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'census_batches' AND policyname = 'census_batches_service_all') THEN
    CREATE POLICY census_batches_service_all ON census_batches
      FOR ALL USING (auth.role() = 'service_role');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'census_batches' AND policyname = 'census_batches_rep_select') THEN
    CREATE POLICY census_batches_rep_select ON census_batches
      FOR SELECT USING (rep_id = (SELECT id FROM reps WHERE auth_id = auth.uid()));
  END IF;
END $$;

-- ── batch_id columns on census entities ──────────────────────────
-- These link every census record back to its originating batch so the
-- dashboard can filter, count, and drill-down by batch.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'outlets' AND column_name = 'batch_id') THEN
    ALTER TABLE outlets ADD COLUMN batch_id UUID REFERENCES census_batches(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'visits' AND column_name = 'batch_id') THEN
    ALTER TABLE visits ADD COLUMN batch_id UUID REFERENCES census_batches(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'consent_records' AND column_name = 'batch_id') THEN
    ALTER TABLE consent_records ADD COLUMN batch_id UUID REFERENCES census_batches(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'outlet_contacts' AND column_name = 'batch_id') THEN
    ALTER TABLE outlet_contacts ADD COLUMN batch_id UUID REFERENCES census_batches(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'outlet_client_links' AND column_name = 'batch_id') THEN
    ALTER TABLE outlet_client_links ADD COLUMN batch_id UUID REFERENCES census_batches(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'retailers' AND column_name = 'batch_id') THEN
    ALTER TABLE retailers ADD COLUMN batch_id UUID REFERENCES census_batches(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'category_observations' AND column_name = 'batch_id') THEN
    ALTER TABLE category_observations ADD COLUMN batch_id UUID REFERENCES census_batches(id);
  END IF;
END $$;

-- Indexes for batch-based queries on the dashboard
CREATE INDEX IF NOT EXISTS idx_outlets_batch ON outlets(batch_id) WHERE batch_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_visits_batch ON visits(batch_id) WHERE batch_id IS NOT NULL;

-- ── Updated_at trigger for census_batches ────────────────────────
CREATE OR REPLACE FUNCTION update_census_batches_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS census_batches_updated_at ON census_batches;
CREATE TRIGGER census_batches_updated_at
  BEFORE UPDATE ON census_batches
  FOR EACH ROW
  EXECUTE FUNCTION update_census_batches_updated_at();
