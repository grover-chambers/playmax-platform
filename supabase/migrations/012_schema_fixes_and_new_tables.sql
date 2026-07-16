-- ═══════════════════════════════════════════════════════════════
-- Migration 012: Schema fixes + new tables
-- 1. Fix analytics_suppliers (add missing columns from 011)
-- 2. Fix analytics_fact_pricing (rebuild with correct schema)
-- 3. Create audit_log table
-- 4. Create org_settings table
-- 5. Create portal_project_updates table
-- All CREATE POLICY statements use DROP POLICY IF EXISTS first
-- to be idempotent (safe to re-run if partial execution occurred)
-- ═══════════════════════════════════════════════════════════════

BEGIN;

-- ── 1. Fix analytics_suppliers: add missing columns ──────────
ALTER TABLE public.analytics_suppliers
  ADD COLUMN IF NOT EXISTS payment_terms text,
  ADD COLUMN IF NOT EXISTS lead_time_days int,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS country text DEFAULT 'Kenya',
  ADD COLUMN IF NOT EXISTS notes text;

-- ── 2. Fix analytics_fact_pricing: rebuild with merged schema ──
DROP TABLE IF EXISTS public.analytics_fact_pricing CASCADE;

CREATE TABLE public.analytics_fact_pricing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id uuid REFERENCES public.analytics_periods(id),
  product_id uuid NOT NULL REFERENCES public.analytics_products(id),
  branch_id uuid REFERENCES public.analytics_branches(id),
  supplier_id uuid REFERENCES public.analytics_suppliers(id),
  effective_date date DEFAULT CURRENT_DATE,
  standard_cost numeric(15,2),
  selling_price numeric(15,2),
  unit_cost numeric(15,2),
  unit_price numeric(15,2),
  weight_tonnes numeric(15,3),
  tier text DEFAULT 'standard',
  min_quantity numeric(15,3) DEFAULT 0,
  max_quantity numeric(15,3),
  discount_pct numeric(5,2) DEFAULT 0,
  currency text DEFAULT 'KES',
  notes text,
  created_at timestamptz DEFAULT now(),
  UNIQUE (product_id, branch_id, effective_date, tier)
);

CREATE INDEX IF NOT EXISTS idx_pricing_product ON public.analytics_fact_pricing(product_id);
CREATE INDEX IF NOT EXISTS idx_pricing_branch ON public.analytics_fact_pricing(branch_id);
CREATE INDEX IF NOT EXISTS idx_pricing_period ON public.analytics_fact_pricing(period_id);
CREATE INDEX IF NOT EXISTS idx_pricing_supplier ON public.analytics_fact_pricing(supplier_id);
CREATE INDEX IF NOT EXISTS idx_pricing_effective ON public.analytics_fact_pricing(effective_date);

DROP POLICY IF EXISTS "admin can read analytics_fact_pricing" ON public.analytics_fact_pricing;
DROP POLICY IF EXISTS "admin can insert analytics_fact_pricing" ON public.analytics_fact_pricing;
DROP POLICY IF EXISTS "admin can update analytics_fact_pricing" ON public.analytics_fact_pricing;
DROP POLICY IF EXISTS "admin can delete analytics_fact_pricing" ON public.analytics_fact_pricing;
DROP POLICY IF EXISTS "staff_read_pricing" ON public.analytics_fact_pricing;
DROP POLICY IF EXISTS "admin_manage_pricing" ON public.analytics_fact_pricing;

ALTER TABLE public.analytics_fact_pricing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin can read analytics_fact_pricing" ON public.analytics_fact_pricing
  FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "admin can insert analytics_fact_pricing" ON public.analytics_fact_pricing
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "admin can update analytics_fact_pricing" ON public.analytics_fact_pricing
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "admin can delete analytics_fact_pricing" ON public.analytics_fact_pricing
  FOR DELETE TO authenticated USING (public.is_admin());

-- ── 3. Create audit_log table ────────────────────────────────
CREATE TABLE IF NOT EXISTS public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  user_email text,
  user_role text,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  entity_name text,
  details jsonb DEFAULT '{}',
  ip_address text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_user ON public.audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON public.audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON public.audit_log(created_at DESC);

DROP POLICY IF EXISTS "admin can read audit_log" ON public.audit_log;
DROP POLICY IF EXISTS "admin can insert audit_log" ON public.audit_log;

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin can read audit_log" ON public.audit_log
  FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "admin can insert audit_log" ON public.audit_log
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());

-- ── 4. Create org_settings table ─────────────────────────────
CREATE TABLE IF NOT EXISTS public.org_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value jsonb DEFAULT '{}',
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TRIGGER set_org_settings_updated_at
  BEFORE UPDATE ON public.org_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP POLICY IF EXISTS "admin can read org_settings" ON public.org_settings;
DROP POLICY IF EXISTS "admin can insert org_settings" ON public.org_settings;
DROP POLICY IF EXISTS "admin can update org_settings" ON public.org_settings;

ALTER TABLE public.org_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin can read org_settings" ON public.org_settings
  FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "admin can insert org_settings" ON public.org_settings
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "admin can update org_settings" ON public.org_settings
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Seed default settings
INSERT INTO public.org_settings (key, value) VALUES
  ('general', '{"company_name": "PlayMax", "timezone": "Africa/Nairobi", "currency": "KES"}'),
  ('notifications', '{"email_enabled": true, "slack_enabled": false}'),
  ('integrations', '{"resend": true, "cloudinary": true, "whatsapp": false}')
ON CONFLICT (key) DO NOTHING;

-- ── 5. Create portal_project_updates table ───────────────────
CREATE TABLE IF NOT EXISTS public.portal_project_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text,
  update_type text DEFAULT 'status' CHECK (update_type IN ('status','milestone','file','comment')),
  visible_to_client boolean DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_portal_project_updates_project ON public.portal_project_updates(project_id);
CREATE INDEX IF NOT EXISTS idx_portal_project_updates_client ON public.portal_project_updates(client_id);

DROP POLICY IF EXISTS "admin can manage project updates" ON public.portal_project_updates;
DROP POLICY IF EXISTS "client can read their project updates" ON public.portal_project_updates;

ALTER TABLE public.portal_project_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin can manage project updates" ON public.portal_project_updates
  FOR ALL TO authenticated USING (public.is_admin());
CREATE POLICY "client can read their project updates" ON public.portal_project_updates
  FOR SELECT TO authenticated
  USING (
    client_id IN (
      SELECT id FROM public.clients WHERE user_id = auth.uid()
    )
    AND visible_to_client = true
  );

COMMIT;
