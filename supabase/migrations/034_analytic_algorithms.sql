-- 5 Analytic Algorithms for the Research AI Engine

-- 1. Competition Matrix: products in same subcategory from different suppliers
CREATE OR REPLACE VIEW v_competition_matrix AS
SELECT
  p1.id AS product_id,
  p1.name AS product_name,
  p1.stock_code,
  sc.name AS subcategory,
  s1.name AS supplier,
  s2.name AS competitor_supplier,
  p2.name AS competitor_product,
  p2.stock_code AS competitor_code,
  AVG(f1.unit_price) FILTER (WHERE f1.product_id = p1.id) AS our_avg_price,
  AVG(f2.unit_price) FILTER (WHERE f2.product_id = p2.id) AS competitor_avg_price,
  SUM(f1.quantity) FILTER (WHERE f1.product_id = p1.id) AS our_volume,
  SUM(f2.quantity) FILTER (WHERE f2.product_id = p2.id) AS competitor_volume
FROM analytics_products p1
JOIN analytics_subcategories sc ON p1.sub_category_id = sc.id
JOIN analytics_supplier_products sp1 ON sp1.product_id = p1.id
JOIN analytics_suppliers s1 ON s1.id = sp1.supplier_id
JOIN analytics_supplier_products sp2 ON sp2.supplier_id != sp1.supplier_id
JOIN analytics_products p2 ON p2.id = sp2.product_id AND p2.sub_category_id = p1.sub_category_id AND p2.id != p1.id
JOIN analytics_suppliers s2 ON s2.id = sp2.supplier_id
LEFT JOIN analytics_fact_sales f1 ON f1.product_id = p1.id
LEFT JOIN analytics_fact_sales f2 ON f2.product_id = p2.id
GROUP BY p1.id, p1.name, p1.stock_code, sc.name, s1.name, s2.name, p2.name, p2.stock_code;

-- 2. Category Analysis: revenue, growth, product count per category
CREATE OR REPLACE VIEW v_category_analysis AS
SELECT
  c.id AS category_id,
  c.name AS category,
  COUNT(DISTINCT p.id) AS product_count,
  SUM(fs.total_amount) AS total_revenue,
  SUM(fs.quantity) AS total_units,
  AVG(fs.unit_price) AS avg_unit_price,
  DATE_TRUNC('month', per.start_date)::date AS month
FROM analytics_categories c
JOIN analytics_products p ON p.category_id = c.id
JOIN analytics_fact_sales fs ON fs.product_id = p.id
JOIN analytics_periods per ON per.id = fs.period_id
GROUP BY c.id, c.name, DATE_TRUNC('month', per.start_date)
ORDER BY c.name, month DESC;

-- 3. Branch / Region Mapping: top products per branch
CREATE OR REPLACE VIEW v_branch_analysis AS
WITH branch_sales AS (
  SELECT
    b.id AS branch_id,
    b.name AS branch_name,
    b.city,
    b.region,
    p.id AS product_id,
    p.name AS product_name,
    SUM(fs.total_amount) AS revenue,
    SUM(fs.quantity) AS volume,
    ROW_NUMBER() OVER (PARTITION BY b.id ORDER BY SUM(fs.total_amount) DESC) AS rank
  FROM analytics_branches b
  JOIN analytics_fact_sales fs ON fs.branch_id = b.id
  JOIN analytics_products p ON p.id = fs.product_id
  GROUP BY b.id, b.name, b.city, b.region, p.id, p.name
)
SELECT * FROM branch_sales;

-- 4. Consumer Behaviour: purchase frequency, trend direction
CREATE OR REPLACE VIEW v_consumer_behaviour AS
SELECT
  p.id AS product_id,
  p.name AS product_name,
  p.stock_code,
  COUNT(DISTINCT fs.period_id) AS periods_with_sales,
  SUM(fs.quantity) AS total_quantity,
  SUM(fs.total_amount) AS total_revenue,
  AVG(fs.quantity) AS avg_qty_per_period,
  CASE
    WHEN SUM(fs.quantity) > 0 THEN ROUND(SUM(fs.total_amount) / SUM(fs.quantity)::numeric, 2)
    ELSE 0
  END AS avg_price_realized,
  COUNT(DISTINCT fs.branch_id) AS branches_present
FROM analytics_products p
JOIN analytics_fact_sales fs ON fs.product_id = p.id
GROUP BY p.id, p.name, p.stock_code;

-- 5. Supply / Demand Gap: inventory vs sales differential
CREATE OR REPLACE VIEW v_supply_demand_gap AS
WITH latest_inventory AS (
  SELECT DISTINCT ON (product_id, branch_id)
    product_id,
    branch_id,
    snapshot_date,
    quantity_on_hand,
    total_value
  FROM analytics_fact_inventory
  ORDER BY product_id, branch_id, snapshot_date DESC
),
demand AS (
  SELECT
    product_id,
    branch_id,
    SUM(quantity) AS total_demand,
    SUM(total_amount) AS total_revenue
  FROM analytics_fact_sales
  WHERE created_at >= NOW() - INTERVAL '90 days'
  GROUP BY product_id, branch_id
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
JOIN analytics_products p ON p.id = COALESCE(li.product_id, d.product_id)
LEFT JOIN analytics_branches b ON b.id = COALESCE(li.branch_id, d.branch_id);
