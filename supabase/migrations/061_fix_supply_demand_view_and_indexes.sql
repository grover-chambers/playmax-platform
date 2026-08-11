-- ================================================================
-- Migration 061: Fix v_supply_demand_gap + analytics indexes
-- ================================================================
-- The original view referenced snapshot_date / quantity_on_hand /
-- total_value on analytics_fact_inventory, which the schema-lock table
-- (045) replaced with period-based opening/closing stock. Rebuild the view
-- against the real schema. Also adds the category indexes the portal
-- scoping filters rely on. RLS fact-table scoping already runs off the
-- portal_analytics_sharing allowlist (052/056); client_categories keeps the
-- profile in sync via auto-scope (059).
-- ================================================================

BEGIN;

CREATE OR REPLACE VIEW public.v_supply_demand_gap AS
WITH latest_inventory AS (
  SELECT DISTINCT ON (i.product_id, i.branch_id)
    i.product_id,
    i.branch_id,
    i.period_id,
    p.end_date AS snapshot_date,
    i.closing_stock AS quantity_on_hand,
    i.stock_value AS total_value
  FROM public.analytics_fact_inventory i
  JOIN public.analytics_periods p ON p.id = i.period_id
  ORDER BY i.product_id, i.branch_id, p.end_date DESC
),
demand AS (
  SELECT
    s.product_id,
    s.branch_id,
    SUM(s.quantity) AS total_demand,
    SUM(s.total_amount) AS total_revenue
  FROM public.analytics_fact_sales s
  WHERE s.created_at >= NOW() - INTERVAL '90 days'
  GROUP BY s.product_id, s.branch_id
)
SELECT
  COALESCE(li.product_id, d.product_id) AS product_id,
  p.name AS product_name,
  p.stock_code,
  COALESCE(li.branch_id, d.branch_id) AS branch_id,
  b.name AS branch_name,
  COALESCE(li.quantity_on_hand, 0) AS supply_qty,
  COALESCE(d.total_demand, 0) AS demand_qty,
  COALESCE(li.quantity_on_hand, 0) - COALESCE(d.total_demand, 0) AS gap,
  CASE
    WHEN COALESCE(d.total_demand, 0) > COALESCE(li.quantity_on_hand, 0) AND COALESCE(li.quantity_on_hand, 0) > 0
      THEN 'UNDERSUPPLY'
    WHEN COALESCE(li.quantity_on_hand, 0) > COALESCE(d.total_demand, 0) * 3 AND COALESCE(d.total_demand, 0) > 0
      THEN 'OVERSTOCK'
    WHEN COALESCE(li.quantity_on_hand, 0) = 0 AND COALESCE(d.total_demand, 0) > 0
      THEN 'NO_STOCK'
    ELSE 'BALANCED'
  END AS gap_status
FROM latest_inventory li
FULL OUTER JOIN demand d ON li.product_id = d.product_id AND li.branch_id = d.branch_id
LEFT JOIN public.analytics_products p ON p.id = COALESCE(li.product_id, d.product_id)
LEFT JOIN public.analytics_branches b ON b.id = COALESCE(li.branch_id, d.branch_id);

CREATE INDEX IF NOT EXISTS idx_analytics_fact_sales_category
  ON public.analytics_fact_sales(category_id);
CREATE INDEX IF NOT EXISTS idx_analytics_fact_sales_period_category
  ON public.analytics_fact_sales(period_id, category_id);
CREATE INDEX IF NOT EXISTS idx_analytics_fact_sales_supplier
  ON public.analytics_fact_sales(supplier_id);
CREATE INDEX IF NOT EXISTS idx_analytics_fact_inventory_category
  ON public.analytics_fact_inventory(category_id);
CREATE INDEX IF NOT EXISTS idx_analytics_fact_pricing_category
  ON public.analytics_fact_pricing(category_id);

COMMIT;
