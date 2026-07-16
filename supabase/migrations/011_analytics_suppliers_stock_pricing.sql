-- Extend analytics schema with suppliers, stock movements, and pricing fact tables.

-- ── Dimension: Suppliers ────────────────────────────────
CREATE TABLE IF NOT EXISTS public.analytics_suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text,
  contact_person text,
  phone text,
  email text,
  payment_terms text,
  lead_time_days int,
  address text,
  city text,
  country text DEFAULT 'Kenya',
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (name)
);

-- ── Fact: Stock movements ───────────────────────────────
CREATE TABLE IF NOT EXISTS public.analytics_fact_stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  movement_date date NOT NULL,
  product_id uuid NOT NULL REFERENCES public.analytics_products(id),
  branch_id uuid REFERENCES public.analytics_branches(id),
  supplier_id uuid REFERENCES public.analytics_suppliers(id),
  movement_type text NOT NULL CHECK (movement_type IN ('in', 'out', 'adjustment', 'transfer', 'return')),
  quantity numeric(15,3) NOT NULL DEFAULT 0,
  unit_cost numeric(15,2),
  total_cost numeric(15,2),
  reference_number text,
  batch_number text,
  expiry_date date,
  warehouse text,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- ── Fact: Pricing ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.analytics_fact_pricing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.analytics_products(id),
  branch_id uuid REFERENCES public.analytics_branches(id),
  effective_date date NOT NULL DEFAULT CURRENT_DATE,
  expiry_date date,
  unit_price numeric(15,2) NOT NULL,
  unit_cost numeric(15,2),
  tier text DEFAULT 'standard',
  min_quantity numeric(15,3) DEFAULT 0,
  max_quantity numeric(15,3),
  discount_pct numeric(5,2) DEFAULT 0,
  currency text DEFAULT 'KES',
  notes text,
  created_at timestamptz DEFAULT now(),
  UNIQUE (product_id, branch_id, effective_date, tier)
);

-- ── RLS policies ────────────────────────────────────────
ALTER TABLE public.analytics_suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_fact_stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_fact_pricing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_read_suppliers" ON analytics_suppliers
  FOR SELECT USING (
    auth.jwt() ->> 'role' IN ('super_admin', 'crm_admin', 'finance')
  );
CREATE POLICY "admin_manage_suppliers" ON analytics_suppliers
  FOR ALL USING (
    auth.jwt() ->> 'role' IN ('super_admin', 'crm_admin')
  );

CREATE POLICY "staff_read_stock_movements" ON analytics_fact_stock_movements
  FOR SELECT USING (
    auth.jwt() ->> 'role' IN ('super_admin', 'crm_admin', 'finance')
  );
CREATE POLICY "admin_manage_stock_movements" ON analytics_fact_stock_movements
  FOR ALL USING (
    auth.jwt() ->> 'role' IN ('super_admin', 'crm_admin')
  );

CREATE POLICY "staff_read_pricing" ON analytics_fact_pricing
  FOR SELECT USING (
    auth.jwt() ->> 'role' IN ('super_admin', 'crm_admin', 'finance')
  );
CREATE POLICY "admin_manage_pricing" ON analytics_fact_pricing
  FOR ALL USING (
    auth.jwt() ->> 'role' IN ('super_admin', 'crm_admin')
  );

-- ── Indexes for common query patterns ───────────────────
CREATE INDEX IF NOT EXISTS idx_stock_movements_date ON analytics_fact_stock_movements (movement_date);
CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON analytics_fact_stock_movements (product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_branch ON analytics_fact_stock_movements (branch_id);
CREATE INDEX IF NOT EXISTS idx_pricing_product ON analytics_fact_pricing (product_id);
CREATE INDEX IF NOT EXISTS idx_pricing_effective ON analytics_fact_pricing (effective_date);
CREATE INDEX IF NOT EXISTS idx_suppliers_name ON analytics_suppliers (name);
