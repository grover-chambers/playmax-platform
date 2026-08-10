-- 058_create_missing_tables.sql
-- Drift repair: migration 052_rls_hardening references public.cms_content and
-- public.analytics_fact_stock_movements, but neither exists in the live DB
-- (031_cms_content.sql and 011_analytics_suppliers_stock_pricing.sql were never
-- applied to this project). Create the missing tables first so 052 can run.

-- CMS content (from 031_cms_content.sql, table + indexes + RLS + policies)
CREATE TABLE IF NOT EXISTS public.cms_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  excerpt text,
  content text,
  category text DEFAULT 'general' CHECK (category IN ('general','insights','guide','update','case_study')),
  featured_image text,
  published boolean DEFAULT false,
  published_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cms_content_published ON public.cms_content(published, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_cms_content_client ON public.cms_content(client_id);

ALTER TABLE public.cms_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin can manage cms content" ON public.cms_content
  FOR ALL TO authenticated USING (public.is_admin());

-- Stock movements fact (from 011_analytics_suppliers_stock_pricing.sql)
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

CREATE INDEX IF NOT EXISTS idx_stock_movements_date ON analytics_fact_stock_movements (movement_date);
CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON analytics_fact_stock_movements (product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_branch ON analytics_fact_stock_movements (branch_id);

ALTER TABLE public.analytics_fact_stock_movements ENABLE ROW LEVEL SECURITY;
