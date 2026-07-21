export type ChartType =
  | "doughnut" | "bar" | "bar_h" | "line" | "line_multi"
  | "scatter" | "radar" | "heatmap" | "table" | "table_flag"
  | "table_trend" | "table_bar" | "treemap" | "waterfall"
  | "area_stack" | "bar_grouped" | "bar_div" | "gauge"
  | "box_plot" | "lollipop";

export interface FilterDef {
  key: string;
  label: string;
  type: "date_range" | "single_select" | "multi_select" | "search_select" | "toggle" | "chip_multi" | "number";
}

export interface ReportSubtype {
  id: string;
  name: string;
  chart: ChartType;
  desc: string;
  filters: FilterDef[];
  /** Parameterised SQL template. Placeholders: :period_ids, :category_id, :sub_category_id, :branch_id, :supplier_ids, :product_id, :date_start, :date_end, :current_period_ids, :prev_period_ids */
  sql: string;
}

export interface ReportCategory {
  id: string;
  label: string;
  icon: string;
  colour: string;
  desc: string;
  subtypes: ReportSubtype[];
}

export const REPORT_CATEGORIES: ReportCategory[] = [
  {
    id: "market_share",
    label: "Market Share",
    icon: "📊",
    colour: "#F4C300",
    desc: "Who owns what slice of each category. Revenue and volume share across suppliers and products.",
    subtypes: [
      {
        id: "cat_market_share_donut",
        name: "Category Market Share Overview",
        chart: "doughnut",
        desc: "Revenue % owned by each supplier within a selected category",
        filters: [
          { key: "date_range", label: "Date range", type: "date_range" },
          { key: "category", label: "Category", type: "single_select" },
          { key: "subcategory", label: "Sub-category", type: "single_select" },
          { key: "branch", label: "Branch", type: "multi_select" },
        ],
        sql: `SELECT s.name AS supplier_name, c.name AS category,
  SUM(fs.total_amount) AS revenue,
  ROUND(SUM(fs.total_amount) * 100.0 / NULLIF(SUM(SUM(fs.total_amount)) OVER (PARTITION BY c.name), 0), 2) AS share_pct,
  RANK() OVER (PARTITION BY c.name ORDER BY SUM(fs.total_amount) DESC) AS rank
FROM analytics_fact_sales fs
JOIN analytics_products p ON p.id = fs.product_id
JOIN analytics_suppliers s ON s.id = COALESCE(fs.supplier_id, p.default_supplier_id)
JOIN analytics_categories c ON c.id = COALESCE(fs.category_id, p.category_id)
LEFT JOIN analytics_subcategories sc ON sc.id = p.sub_category_id
WHERE (:period_ids IS NULL OR fs.period_id = ANY(:period_ids))
  AND (:category_id IS NULL OR c.id = :category_id)
  AND (:sub_category_id IS NULL OR sc.id = :sub_category_id)
  AND (:branch_id IS NULL OR fs.branch_id = :branch_id)
GROUP BY s.name, c.name
ORDER BY c.name, revenue DESC`,
      },
      {
        id: "supplier_dominance",
        name: "Supplier Dominance Map",
        chart: "bar_h",
        desc: "Top 10 suppliers ranked by total revenue share",
        filters: [
          { key: "date_range", label: "Date range", type: "date_range" },
          { key: "category", label: "Category", type: "single_select" },
          { key: "branch", label: "Branch", type: "multi_select" },
        ],
        sql: `SELECT s.name AS supplier_name,
  SUM(fs.total_amount) AS revenue,
  COUNT(DISTINCT p.id) AS product_count,
  ROUND(SUM(fs.total_amount) * 100.0 / NULLIF(SUM(SUM(fs.total_amount)) OVER (), 0), 2) AS share_pct
FROM analytics_fact_sales fs
JOIN analytics_products p ON p.id = fs.product_id
JOIN analytics_suppliers s ON s.id = COALESCE(fs.supplier_id, p.default_supplier_id)
LEFT JOIN analytics_categories c ON c.id = COALESCE(fs.category_id, p.category_id)
WHERE (:period_ids IS NULL OR fs.period_id = ANY(:period_ids))
  AND (:category_id IS NULL OR c.id = :category_id)
  AND (:branch_id IS NULL OR fs.branch_id = :branch_id)
GROUP BY s.name
ORDER BY revenue DESC
LIMIT 10`,
      },
      {
        id: "sku_share_breakdown",
        name: "SKU Market Share Breakdown",
        chart: "bar_h",
        desc: "Every SKU shown proportionally by revenue share",
        filters: [
          { key: "date_range", label: "Date range", type: "date_range" },
          { key: "category", label: "Category", type: "single_select" },
          { key: "subcategory", label: "Sub-category", type: "single_select" },
          { key: "branch", label: "Branch", type: "multi_select" },
        ],
        sql: `SELECT p.name AS product_name, p.stock_code,
  SUM(fs.total_amount) AS revenue,
  ROUND(SUM(fs.total_amount) * 100.0 / NULLIF(SUM(SUM(fs.total_amount)) OVER (), 0), 3) AS share_pct
FROM analytics_fact_sales fs
JOIN analytics_products p ON p.id = fs.product_id
LEFT JOIN analytics_subcategories sc ON sc.id = p.sub_category_id
LEFT JOIN analytics_categories c ON c.id = COALESCE(fs.category_id, p.category_id)
WHERE (:period_ids IS NULL OR fs.period_id = ANY(:period_ids))
  AND (:category_id IS NULL OR c.id = :category_id)
  AND (:sub_category_id IS NULL OR sc.id = :sub_category_id)
  AND (:branch_id IS NULL OR fs.branch_id = :branch_id)
GROUP BY p.name, p.stock_code
ORDER BY revenue DESC
LIMIT 50`,
      },
      {
        id: "share_trend_mom",
        name: "Market Share Trend (MoM)",
        chart: "line_multi",
        desc: "How market share has shifted month-on-month for top 5 suppliers",
        filters: [
          { key: "date_range", label: "Date range", type: "date_range" },
          { key: "category", label: "Category", type: "single_select" },
        ],
        sql: `WITH monthly AS (
  SELECT s.name AS supplier_name,
    per.label AS period_label,
    per.start_date,
    SUM(fs.total_amount) AS revenue
  FROM analytics_fact_sales fs
  JOIN analytics_products p ON p.id = fs.product_id
  JOIN analytics_suppliers s ON s.id = COALESCE(fs.supplier_id, p.default_supplier_id)
  JOIN analytics_periods per ON per.id = fs.period_id
  LEFT JOIN analytics_categories c ON c.id = COALESCE(fs.category_id, p.category_id)
  WHERE (:period_ids IS NULL OR fs.period_id = ANY(:period_ids))
    AND (:category_id IS NULL OR c.id = :category_id)
  GROUP BY s.name, per.label, per.start_date
),
ranked AS (
  SELECT supplier_name, SUM(revenue) AS total_rev
  FROM monthly GROUP BY supplier_name
  ORDER BY total_rev DESC LIMIT 5
)
SELECT m.supplier_name, m.period_label, m.revenue,
  ROUND(m.revenue * 100.0 / NULLIF(SUM(m.revenue) OVER (PARTITION BY m.period_label), 0), 2) AS share_pct
FROM monthly m
JOIN ranked r ON r.supplier_name = m.supplier_name
ORDER BY m.supplier_name, m.start_date`,
      },
      {
        id: "competitive_share_shift",
        name: "Competitive Share Shift",
        chart: "bar_div",
        desc: "Which supplier gained/lost share this period vs last",
        filters: [
          { key: "date_range", label: "Date range", type: "date_range" },
          { key: "category", label: "Category", type: "single_select" },
          { key: "branch", label: "Branch", type: "multi_select" },
        ],
        sql: `WITH current AS (
  SELECT COALESCE(fs.supplier_id, p.default_supplier_id) AS sup_id,
    SUM(fs.total_amount) AS revenue
  FROM analytics_fact_sales fs
  JOIN analytics_products p ON p.id = fs.product_id
  WHERE (:current_period_ids IS NULL OR fs.period_id = ANY(:current_period_ids))
    AND (:category_id IS NULL OR COALESCE(fs.category_id, p.category_id) = :category_id)
    AND (:branch_id IS NULL OR fs.branch_id = :branch_id)
  GROUP BY COALESCE(fs.supplier_id, p.default_supplier_id)
),
previous AS (
  SELECT COALESCE(fs.supplier_id, p.default_supplier_id) AS sup_id,
    SUM(fs.total_amount) AS revenue
  FROM analytics_fact_sales fs
  JOIN analytics_products p ON p.id = fs.product_id
  WHERE (:prev_period_ids IS NULL OR fs.period_id = ANY(:prev_period_ids))
    AND (:category_id IS NULL OR COALESCE(fs.category_id, p.category_id) = :category_id)
    AND (:branch_id IS NULL OR fs.branch_id = :branch_id)
  GROUP BY COALESCE(fs.supplier_id, p.default_supplier_id)
),
current_total AS (SELECT SUM(revenue) AS t FROM current),
prev_total AS (SELECT SUM(revenue) AS t FROM previous)
SELECT s.name AS supplier_name,
  ROUND(COALESCE(c.revenue, 0) * 100.0 / NULLIF((SELECT t FROM current_total), 0), 2) AS current_share,
  ROUND(COALESCE(p.revenue, 0) * 100.0 / NULLIF((SELECT t FROM prev_total), 0), 2) AS prev_share,
  ROUND(COALESCE(c.revenue, 0) * 100.0 / NULLIF((SELECT t FROM current_total), 0)
    - COALESCE(p.revenue, 0) * 100.0 / NULLIF((SELECT t FROM prev_total), 0), 2) AS shift_pp
FROM analytics_suppliers s
LEFT JOIN current c ON c.sup_id = s.id
LEFT JOIN previous p ON p.sup_id = s.id
WHERE COALESCE(c.revenue, 0) > 0 OR COALESCE(p.revenue, 0) > 0
ORDER BY ABS(shift_pp) DESC
LIMIT 15`,
      },
    ],
  },
  {
    id: "category_perf",
    label: "Category Performance",
    icon: "📈",
    colour: "#22C55E",
    desc: "Revenue, volume and growth across 40 categories and subcategories.",
    subtypes: [
      {
        id: "cat_revenue_leaderboard",
        name: "Category Revenue Leaderboard",
        chart: "bar_h",
        desc: "All categories ranked by total revenue in period",
        filters: [
          { key: "date_range", label: "Date range", type: "date_range" },
          { key: "branch", label: "Branch", type: "multi_select" },
          { key: "metric", label: "Primary metric", type: "toggle" },
        ],
        sql: `SELECT c.name AS category,
  SUM(fs.total_amount) AS revenue,
  SUM(fs.quantity) AS units,
  COUNT(DISTINCT p.id) AS product_count,
  ROUND(SUM(fs.total_amount) * 100.0 / NULLIF(SUM(SUM(fs.total_amount)) OVER (), 0), 2) AS share_pct
FROM analytics_fact_sales fs
JOIN analytics_products p ON p.id = fs.product_id
JOIN analytics_categories c ON c.id = COALESCE(fs.category_id, p.category_id)
WHERE (:period_ids IS NULL OR fs.period_id = ANY(:period_ids))
  AND (:branch_id IS NULL OR fs.branch_id = :branch_id)
GROUP BY c.name
ORDER BY revenue DESC`,
      },
      {
        id: "cat_growth_matrix",
        name: "Category Growth Rate Matrix",
        chart: "heatmap",
        desc: "MoM growth rate for each category — green = growing, red = declining",
        filters: [
          { key: "date_range", label: "Date range", type: "date_range" },
          { key: "branch", label: "Branch", type: "multi_select" },
        ],
        sql: `WITH monthly AS (
  SELECT COALESCE(fs.category_id, p.category_id) AS cat_id,
    per.label AS period_label,
    per.start_date,
    SUM(fs.total_amount) AS revenue
  FROM analytics_fact_sales fs
  JOIN analytics_products p ON p.id = fs.product_id
  JOIN analytics_periods per ON per.id = fs.period_id
  WHERE (:period_ids IS NULL OR fs.period_id = ANY(:period_ids))
    AND (:branch_id IS NULL OR fs.branch_id = :branch_id)
  GROUP BY COALESCE(fs.category_id, p.category_id), per.label, per.start_date
)
SELECT c.name AS category, m.period_label,
  ROUND((m.revenue - LAG(m.revenue) OVER (PARTITION BY m.cat_id ORDER BY m.start_date))
    * 100.0 / NULLIF(LAG(m.revenue) OVER (PARTITION BY m.cat_id ORDER BY m.start_date), 0), 2) AS mom_growth_pct
FROM monthly m
JOIN analytics_categories c ON c.id = m.cat_id
ORDER BY c.name, m.start_date`,
      },
      {
        id: "subcategory_drilldown",
        name: "Subcategory Drill-Down",
        chart: "bar",
        desc: "Within a selected category, revenue by subcategory",
        filters: [
          { key: "date_range", label: "Date range", type: "date_range" },
          { key: "category", label: "Category", type: "single_select" },
          { key: "branch", label: "Branch", type: "multi_select" },
        ],
        sql: `SELECT sc.name AS subcategory,
  SUM(fs.total_amount) AS revenue,
  SUM(fs.quantity) AS units,
  COUNT(DISTINCT p.id) AS product_count
FROM analytics_fact_sales fs
JOIN analytics_products p ON p.id = fs.product_id
JOIN analytics_subcategories sc ON sc.id = p.sub_category_id
JOIN analytics_categories c ON c.id = sc.category_id
WHERE (:period_ids IS NULL OR fs.period_id = ANY(:period_ids))
  AND (:category_id IS NULL OR c.id = :category_id)
  AND (:branch_id IS NULL OR fs.branch_id = :branch_id)
GROUP BY sc.name
ORDER BY revenue DESC`,
      },
      {
        id: "top_skus_per_category",
        name: "Top SKUs per Category",
        chart: "table_bar",
        desc: "Top 10 SKUs per category with revenue, qty, and rank change",
        filters: [
          { key: "date_range", label: "Date range", type: "date_range" },
          { key: "category", label: "Category", type: "single_select" },
          { key: "subcategory", label: "Sub-category", type: "single_select" },
          { key: "branch", label: "Branch", type: "multi_select" },
        ],
        sql: `SELECT p.name AS product_name, p.stock_code,
  c.name AS category,
  SUM(fs.total_amount) AS revenue,
  SUM(fs.quantity) AS units,
  COUNT(DISTINCT fs.branch_id) AS branches_present,
  ROUND(AVG(fs.unit_price), 2) AS avg_price
FROM analytics_fact_sales fs
JOIN analytics_products p ON p.id = fs.product_id
JOIN analytics_categories c ON c.id = COALESCE(fs.category_id, p.category_id)
LEFT JOIN analytics_subcategories sc ON sc.id = p.sub_category_id
WHERE (:period_ids IS NULL OR fs.period_id = ANY(:period_ids))
  AND (:category_id IS NULL OR c.id = :category_id)
  AND (:sub_category_id IS NULL OR sc.id = :sub_category_id)
  AND (:branch_id IS NULL OR fs.branch_id = :branch_id)
GROUP BY p.name, p.stock_code, c.name
ORDER BY revenue DESC
LIMIT 10`,
      },
      {
        id: "cat_volume_vs_revenue",
        name: "Category Volume vs Revenue",
        chart: "scatter",
        desc: "Plot: qty sold (x) vs revenue (y) per category — reveals pricing power",
        filters: [
          { key: "date_range", label: "Date range", type: "date_range" },
          { key: "branch", label: "Branch", type: "multi_select" },
        ],
        sql: `SELECT c.name AS category,
  SUM(fs.quantity) AS total_units,
  SUM(fs.total_amount) AS total_revenue,
  ROUND(SUM(fs.total_amount) / NULLIF(SUM(fs.quantity), 0), 2) AS avg_price_per_unit,
  COUNT(DISTINCT p.id) AS product_count
FROM analytics_fact_sales fs
JOIN analytics_products p ON p.id = fs.product_id
JOIN analytics_categories c ON c.id = COALESCE(fs.category_id, p.category_id)
WHERE (:period_ids IS NULL OR fs.period_id = ANY(:period_ids))
  AND (:branch_id IS NULL OR fs.branch_id = :branch_id)
GROUP BY c.name
ORDER BY total_revenue DESC`,
      },
      {
        id: "cat_seasonality",
        name: "Category Seasonality",
        chart: "line_multi",
        desc: "Revenue trend across periods per category — shows seasonal patterns",
        filters: [
          { key: "category", label: "Category", type: "single_select" },
          { key: "date_range", label: "Date range", type: "date_range" },
        ],
        sql: `SELECT c.name AS category,
  per.label AS period_label,
  per.start_date,
  SUM(fs.total_amount) AS revenue,
  SUM(fs.quantity) AS units
FROM analytics_fact_sales fs
JOIN analytics_products p ON p.id = fs.product_id
JOIN analytics_categories c ON c.id = COALESCE(fs.category_id, p.category_id)
JOIN analytics_periods per ON per.id = fs.period_id
WHERE (:period_ids IS NULL OR fs.period_id = ANY(:period_ids))
  AND (:category_id IS NULL OR c.id = :category_id)
GROUP BY c.name, per.label, per.start_date
ORDER BY c.name, per.start_date`,
      },
    ],
  },
  {
    id: "competitor",
    label: "Competitor Comparison",
    icon: "⚔️",
    colour: "#EC4899",
    desc: "Head-to-head between suppliers and products in the same subcategory.",
    subtypes: [
      {
        id: "h2h_supplier",
        name: "Head-to-Head Supplier Comparison",
        chart: "bar_grouped",
        desc: "Compare 2-5 selected suppliers: revenue, qty, avg price side by side",
        filters: [
          { key: "date_range", label: "Date range", type: "date_range" },
          { key: "category", label: "Category", type: "single_select" },
          { key: "subcategory", label: "Sub-category", type: "single_select" },
          { key: "suppliers_multi", label: "Suppliers (compare)", type: "multi_select" },
          { key: "branch", label: "Branch", type: "multi_select" },
        ],
        sql: `SELECT s.name AS supplier_name,
  COALESCE(c.name, 'Uncategorized') AS category,
  COUNT(DISTINCT p.id) AS sku_count,
  SUM(fs.quantity) AS total_qty,
  SUM(fs.total_amount) AS total_revenue,
  ROUND(AVG(fs.unit_price), 2) AS avg_price,
  ROUND(SUM(fs.total_amount) * 100.0 / NULLIF(SUM(SUM(fs.total_amount)) OVER (), 0), 2) AS share_pct
FROM analytics_fact_sales fs
JOIN analytics_products p ON p.id = fs.product_id
JOIN analytics_suppliers s ON s.id = COALESCE(fs.supplier_id, p.default_supplier_id)
LEFT JOIN analytics_categories c ON c.id = COALESCE(fs.category_id, p.category_id)
LEFT JOIN analytics_subcategories sc ON sc.id = p.sub_category_id
WHERE (:period_ids IS NULL OR fs.period_id = ANY(:period_ids))
  AND (:supplier_ids IS NULL OR COALESCE(fs.supplier_id, p.default_supplier_id) = ANY(:supplier_ids))
  AND (:category_id IS NULL OR c.id = :category_id)
  AND (:sub_category_id IS NULL OR sc.id = :sub_category_id)
  AND (:branch_id IS NULL OR fs.branch_id = :branch_id)
GROUP BY s.name, c.name
ORDER BY s.name, total_revenue DESC`,
      },
      {
        id: "price_gap",
        name: "Price Gap Analysis",
        chart: "bar_div",
        desc: "For each subcategory: price difference between leading product and competitors",
        filters: [
          { key: "date_range", label: "Date range", type: "date_range" },
          { key: "category", label: "Category", type: "single_select" },
          { key: "subcategory", label: "Sub-category", type: "single_select" },
        ],
        sql: `WITH avg_prices AS (
  SELECT p.sub_category_id, COALESCE(fs.supplier_id, p.default_supplier_id) AS sup_id,
    AVG(fs.unit_price) AS avg_price
  FROM analytics_fact_sales fs
  JOIN analytics_products p ON p.id = fs.product_id
  WHERE (:period_ids IS NULL OR fs.period_id = ANY(:period_ids))
    AND (:category_id IS NULL OR COALESCE(fs.category_id, p.category_id) = :category_id)
    AND (:sub_category_id IS NULL OR p.sub_category_id = :sub_category_id)
  GROUP BY p.sub_category_id, COALESCE(fs.supplier_id, p.default_supplier_id)
),
leaders AS (
  SELECT sub_category_id, MIN(avg_price) AS leader_price
  FROM avg_prices GROUP BY sub_category_id
)
SELECT sc.name AS subcategory,
  s.name AS supplier_name,
  ap.avg_price,
  l.leader_price,
  ROUND(ap.avg_price - l.leader_price, 2) AS price_gap,
  ROUND((ap.avg_price - l.leader_price) * 100.0 / NULLIF(l.leader_price, 0), 2) AS gap_pct
FROM avg_prices ap
JOIN analytics_subcategories sc ON sc.id = ap.sub_category_id
JOIN leaders l ON l.sub_category_id = ap.sub_category_id
JOIN analytics_suppliers s ON s.id = ap.sup_id
ORDER BY sc.name, price_gap DESC`,
      },
      {
        id: "competitive_displacement",
        name: "Competitive Displacement Map",
        chart: "area_stack",
        desc: "Which suppliers are taking volume from whom over time",
        filters: [
          { key: "date_range", label: "Date range", type: "date_range" },
          { key: "category", label: "Category", type: "single_select" },
          { key: "subcategory", label: "Sub-category", type: "single_select" },
          { key: "branch", label: "Branch", type: "multi_select" },
        ],
        sql: `SELECT per.label AS period_label, per.start_date,
  s.name AS supplier_name,
  SUM(fs.total_amount) AS revenue
FROM analytics_fact_sales fs
JOIN analytics_products p ON p.id = fs.product_id
JOIN analytics_suppliers s ON s.id = COALESCE(fs.supplier_id, p.default_supplier_id)
JOIN analytics_periods per ON per.id = fs.period_id
LEFT JOIN analytics_categories c ON c.id = COALESCE(fs.category_id, p.category_id)
LEFT JOIN analytics_subcategories sc ON sc.id = p.sub_category_id
WHERE (:period_ids IS NULL OR fs.period_id = ANY(:period_ids))
  AND (:category_id IS NULL OR c.id = :category_id)
  AND (:sub_category_id IS NULL OR sc.id = :sub_category_id)
  AND (:branch_id IS NULL OR fs.branch_id = :branch_id)
GROUP BY per.label, per.start_date, s.name
ORDER BY per.start_date, s.name`,
      },
      {
        id: "similar_product_matrix",
        name: "Similar Product Matrix",
        chart: "table",
        desc: "All products in same subcategory with price, volume, and supplier — find alternatives",
        filters: [
          { key: "date_range", label: "Date range", type: "date_range" },
          { key: "category", label: "Category", type: "single_select" },
          { key: "subcategory", label: "Sub-category", type: "single_select" },
        ],
        sql: `SELECT p.name AS product_name, p.stock_code,
  s.name AS supplier_name,
  sc.name AS subcategory,
  ROUND(AVG(fs.unit_price), 2) AS avg_price,
  SUM(fs.quantity) AS total_units,
  SUM(fs.total_amount) AS total_revenue
FROM analytics_products p
JOIN analytics_subcategories sc ON sc.id = p.sub_category_id
LEFT JOIN analytics_suppliers s ON s.id = p.default_supplier_id
LEFT JOIN analytics_fact_sales fs ON fs.product_id = p.id
  AND (:period_ids IS NULL OR fs.period_id = ANY(:period_ids))
WHERE (:category_id IS NULL OR sc.category_id = :category_id)
  AND (:sub_category_id IS NULL OR sc.id = :sub_category_id)
GROUP BY p.name, p.stock_code, s.name, sc.name
HAVING SUM(fs.total_amount) > 0
ORDER BY subcategory, total_revenue DESC`,
      },
      {
        id: "competitor_volume_ratio",
        name: "Competitor Volume Ratio",
        chart: "radar",
        desc: "Spider chart: rate suppliers on 5 dimensions — price, volume, growth, reach, share",
        filters: [
          { key: "date_range", label: "Date range", type: "date_range" },
          { key: "category", label: "Category", type: "single_select" },
          { key: "subcategory", label: "Sub-category", type: "single_select" },
        ],
        sql: `WITH stats AS (
  SELECT COALESCE(fs.supplier_id, p.default_supplier_id) AS sup_id,
    COUNT(DISTINCT p.id) AS sku_count,
    SUM(fs.quantity) AS total_units,
    SUM(fs.total_amount) AS total_revenue,
    AVG(fs.unit_price) AS avg_price,
    COUNT(DISTINCT fs.branch_id) AS branch_reach,
    COUNT(DISTINCT fs.period_id) AS periods_active
  FROM analytics_fact_sales fs
  JOIN analytics_products p ON p.id = fs.product_id
  LEFT JOIN analytics_categories c ON c.id = COALESCE(fs.category_id, p.category_id)
  LEFT JOIN analytics_subcategories sc ON sc.id = p.sub_category_id
  WHERE (:period_ids IS NULL OR fs.period_id = ANY(:period_ids))
    AND (:category_id IS NULL OR c.id = :category_id)
    AND (:sub_category_id IS NULL OR sc.id = :sub_category_id)
  GROUP BY COALESCE(fs.supplier_id, p.default_supplier_id)
),
maxes AS (
  SELECT
    MAX(total_revenue) AS max_rev,
    MAX(total_units) AS max_units,
    MAX(sku_count) AS max_sku,
    MAX(branch_reach) AS max_reach,
    MAX(periods_active) AS max_periods
  FROM stats
)
SELECT s.name AS supplier_name,
  ROUND(st.total_revenue * 100.0 / NULLIF(m.max_rev, 0), 0) AS revenue_score,
  ROUND(st.total_units * 100.0 / NULLIF(m.max_units, 0), 0) AS volume_score,
  ROUND(st.sku_count * 100.0 / NULLIF(m.max_sku, 0), 0) AS range_score,
  ROUND(st.branch_reach * 100.0 / NULLIF(m.max_reach, 0), 0) AS reach_score,
  ROUND(st.periods_active * 100.0 / NULLIF(m.max_periods, 0), 0) AS consistency_score
FROM stats st
CROSS JOIN maxes m
JOIN analytics_suppliers s ON s.id = st.sup_id
ORDER BY st.total_revenue DESC
LIMIT 8`,
      },
    ],
  },
  {
    id: "inventory",
    label: "Inventory Summary",
    icon: "📦",
    colour: "#F97316",
    desc: "What is on hand vs what is being demanded. Shortage flags, overstock risks.",
    subtypes: [
      {
        id: "supply_demand_gap",
        name: "Supply vs Demand Gap",
        chart: "bar_div",
        desc: "For each product: on-hand stock vs projected demand. Red = shortage.",
        filters: [
          { key: "category", label: "Category", type: "single_select" },
          { key: "subcategory", label: "Sub-category", type: "single_select" },
          { key: "branch", label: "Branch", type: "multi_select" },
        ],
        sql: `WITH latest_inv AS (
  SELECT DISTINCT ON (product_id, branch_id) product_id, branch_id,
    quantity_on_hand, unit_cost, snapshot_date
  FROM analytics_fact_inventory
  ORDER BY product_id, branch_id, snapshot_date DESC
),
demand AS (
  SELECT product_id, branch_id,
    SUM(quantity) AS demand_qty
  FROM analytics_fact_sales
  WHERE (:period_ids IS NULL OR period_id = ANY(:period_ids))
  GROUP BY product_id, branch_id
)
SELECT p.name AS product_name, p.stock_code, b.name AS branch_name,
  COALESCE(i.quantity_on_hand, 0) AS on_hand,
  COALESCE(d.demand_qty, 0) AS demand,
  COALESCE(i.quantity_on_hand, 0) - COALESCE(d.demand_qty, 0) AS gap,
  CASE
    WHEN COALESCE(i.quantity_on_hand, 0) - COALESCE(d.demand_qty, 0) < 0 THEN 'SHORTAGE'
    WHEN COALESCE(i.quantity_on_hand, 0) - COALESCE(d.demand_qty, 0) > 100 THEN 'OVERSTOCK'
    ELSE 'BALANCED'
  END AS flag
FROM (
  SELECT COALESCE(i.product_id, d.product_id) AS product_id,
    COALESCE(i.branch_id, d.branch_id) AS branch_id,
    i.quantity_on_hand, d.demand_qty
  FROM latest_inv i
  FULL OUTER JOIN demand d ON d.product_id = i.product_id AND d.branch_id = i.branch_id
) combined
JOIN analytics_products p ON p.id = combined.product_id
LEFT JOIN analytics_subcategories sc ON sc.id = p.sub_category_id
LEFT JOIN analytics_categories c ON c.id = sc.category_id
LEFT JOIN analytics_branches b ON b.id = combined.branch_id
WHERE (:category_id IS NULL OR c.id = :category_id)
  AND (:sub_category_id IS NULL OR sc.id = :sub_category_id)
  AND (:branch_id IS NULL OR combined.branch_id = :branch_id)
ORDER BY gap ASC
LIMIT 100`,
      },
      {
        id: "stock_shortage_alerts",
        name: "Stock Shortage Alert Board",
        chart: "table_flag",
        desc: "All products with supply < demand, sorted by severity",
        filters: [
          { key: "category", label: "Category", type: "single_select" },
          { key: "branch", label: "Branch", type: "multi_select" },
        ],
        sql: `WITH latest_inv AS (
  SELECT DISTINCT ON (product_id, branch_id) product_id, branch_id, quantity_on_hand
  FROM analytics_fact_inventory ORDER BY product_id, branch_id, snapshot_date DESC
),
demand AS (
  SELECT product_id, branch_id, SUM(quantity) AS demand_qty
  FROM analytics_fact_sales
  WHERE (:period_ids IS NULL OR period_id = ANY(:period_ids))
  GROUP BY product_id, branch_id
)
SELECT p.name, p.stock_code, c.name AS category, b.name AS branch_name,
  COALESCE(i.quantity_on_hand, 0) AS on_hand,
  COALESCE(d.demand_qty, 0) AS demand_30d,
  COALESCE(i.quantity_on_hand, 0) - COALESCE(d.demand_qty, 0) AS gap
FROM (
  SELECT COALESCE(i.product_id, d.product_id) AS product_id,
    COALESCE(i.branch_id, d.branch_id) AS branch_id,
    i.quantity_on_hand, d.demand_qty
  FROM latest_inv i
  FULL OUTER JOIN demand d ON d.product_id = i.product_id AND d.branch_id = i.branch_id
) combined
JOIN analytics_products p ON p.id = combined.product_id
LEFT JOIN analytics_branches b ON b.id = combined.branch_id
JOIN analytics_categories c ON c.id = p.category_id
WHERE (:category_id IS NULL OR p.category_id = :category_id)
  AND (:branch_id IS NULL OR combined.branch_id = :branch_id)
  AND COALESCE(combined.quantity_on_hand, 0) - COALESCE(combined.demand_qty, 0) < 0
ORDER BY gap ASC
LIMIT 50`,
      },
      {
        id: "overstock_risk",
        name: "Overstock Risk Register",
        chart: "table_flag",
        desc: "Products with excess stock — slow movers",
        filters: [
          { key: "category", label: "Category", type: "single_select" },
          { key: "branch", label: "Branch", type: "multi_select" },
        ],
        sql: `WITH latest_inv AS (
  SELECT DISTINCT ON (product_id, branch_id) product_id, branch_id, quantity_on_hand, unit_cost
  FROM analytics_fact_inventory ORDER BY product_id, branch_id, snapshot_date DESC
),
demand AS (
  SELECT product_id, branch_id, SUM(quantity) AS demand_qty
  FROM analytics_fact_sales
  WHERE (:period_ids IS NULL OR period_id = ANY(:period_ids))
  GROUP BY product_id, branch_id
)
SELECT p.name, p.stock_code, c.name AS category, b.name AS branch_name,
  COALESCE(i.quantity_on_hand, 0) AS on_hand,
  COALESCE(d.demand_qty, 0) AS demand_30d,
  COALESCE(i.quantity_on_hand, 0) - COALESCE(d.demand_qty, 0) AS excess,
  ROUND(COALESCE(i.unit_cost, 0) * COALESCE(i.quantity_on_hand, 0), 0) AS stock_value
FROM (
  SELECT COALESCE(i.product_id, d.product_id) AS product_id,
    COALESCE(i.branch_id, d.branch_id) AS branch_id,
    i.quantity_on_hand, i.unit_cost, d.demand_qty
  FROM latest_inv i
  FULL OUTER JOIN demand d ON d.product_id = i.product_id AND d.branch_id = i.branch_id
) combined
JOIN analytics_products p ON p.id = combined.product_id
LEFT JOIN analytics_branches b ON b.id = combined.branch_id
JOIN analytics_categories c ON c.id = p.category_id
WHERE (:category_id IS NULL OR p.category_id = :category_id)
  AND (:branch_id IS NULL OR combined.branch_id = :branch_id)
  AND COALESCE(combined.quantity_on_hand, 0) - COALESCE(combined.demand_qty, 0) > 100
ORDER BY excess DESC
LIMIT 50`,
      },
      {
        id: "inventory_health_gauge",
        name: "Inventory Health by Category",
        chart: "bar_h",
        desc: "Health score per category: 100% = balanced, <50% = shortage risk",
        filters: [
          { key: "category", label: "Category", type: "single_select" },
          { key: "branch", label: "Branch", type: "multi_select" },
        ],
        sql: `WITH latest_inv AS (
  SELECT DISTINCT ON (product_id, branch_id) product_id, branch_id, quantity_on_hand
  FROM analytics_fact_inventory ORDER BY product_id, branch_id, snapshot_date DESC
),
demand AS (
  SELECT product_id, branch_id, SUM(quantity) AS demand_qty
  FROM analytics_fact_sales
  WHERE (:period_ids IS NULL OR period_id = ANY(:period_ids))
  GROUP BY product_id, branch_id
)
SELECT c.name AS category,
  COUNT(*) AS total_product_branches,
  SUM(CASE WHEN COALESCE(i.quantity_on_hand, 0) >= COALESCE(d.demand_qty, 0) THEN 1 ELSE 0 END) AS healthy_count,
  ROUND(SUM(CASE WHEN COALESCE(i.quantity_on_hand, 0) >= COALESCE(d.demand_qty, 0) THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 0) AS health_score
FROM (
  SELECT COALESCE(i.product_id, d.product_id) AS product_id,
    COALESCE(i.branch_id, d.branch_id) AS branch_id,
    i.quantity_on_hand, d.demand_qty
  FROM latest_inv i
  FULL OUTER JOIN demand d ON d.product_id = i.product_id AND d.branch_id = i.branch_id
) combined
JOIN analytics_products p ON p.id = combined.product_id
JOIN analytics_categories c ON c.id = p.category_id
WHERE (:category_id IS NULL OR p.category_id = :category_id)
  AND (:branch_id IS NULL OR combined.branch_id = :branch_id)
GROUP BY c.name
ORDER BY health_score`,
      },
      {
        id: "reorder_recommendations",
        name: "Reorder Recommendation List",
        chart: "table",
        desc: "Ranked list of products to restock this week based on velocity and gap",
        filters: [
          { key: "category", label: "Category", type: "single_select" },
          { key: "branch", label: "Branch", type: "multi_select" },
          { key: "lead_time", label: "Lead time (days)", type: "number" },
        ],
        sql: `WITH latest_inv AS (
  SELECT DISTINCT ON (product_id, branch_id) product_id, branch_id, quantity_on_hand
  FROM analytics_fact_inventory ORDER BY product_id, branch_id, snapshot_date DESC
),
velocity AS (
  SELECT product_id, branch_id,
    SUM(quantity) / GREATEST(COUNT(DISTINCT period_id), 1) AS weekly_velocity
  FROM analytics_fact_sales
  WHERE (:period_ids IS NULL OR period_id = ANY(:period_ids))
  GROUP BY product_id, branch_id
)
SELECT p.name, p.stock_code, c.name AS category, b.name AS branch_name,
  COALESCE(i.quantity_on_hand, 0) AS on_hand,
  COALESCE(v.weekly_velocity, 0) AS weekly_velocity,
  GREATEST(0, COALESCE(v.weekly_velocity, 0) * 2 - COALESCE(i.quantity_on_hand, 0)) AS reorder_qty
FROM (
  SELECT COALESCE(i.product_id, v.product_id) AS product_id,
    COALESCE(i.branch_id, v.branch_id) AS branch_id,
    i.quantity_on_hand, v.weekly_velocity
  FROM latest_inv i
  FULL OUTER JOIN velocity v ON v.product_id = i.product_id AND v.branch_id = i.branch_id
) combined
JOIN analytics_products p ON p.id = combined.product_id
LEFT JOIN analytics_branches b ON b.id = combined.branch_id
JOIN analytics_categories c ON c.id = p.category_id
WHERE (:category_id IS NULL OR p.category_id = :category_id)
  AND (:branch_id IS NULL OR combined.branch_id = :branch_id)
  AND COALESCE(combined.quantity_on_hand, 0) < COALESCE(combined.weekly_velocity, 0) * 2
ORDER BY reorder_qty DESC
LIMIT 50`,
      },
    ],
  },
  {
    id: "pricing",
    label: "Pricing Analysis",
    icon: "💰",
    colour: "#A855F7",
    desc: "How prices compare across suppliers, subcategories and branches. Margin analysis.",
    subtypes: [
      {
        id: "price_distribution",
        name: "Price Distribution by Subcategory",
        chart: "bar_h",
        desc: "Min, median, max sell price for every SKU in a subcategory — shows spread",
        filters: [
          { key: "date_range", label: "Date range", type: "date_range" },
          { key: "category", label: "Category", type: "single_select" },
          { key: "subcategory", label: "Sub-category", type: "single_select" },
        ],
        sql: `SELECT sc.name AS subcategory,
  MIN(fp.selling_price) AS min_price,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY fp.selling_price) AS median_price,
  MAX(fp.selling_price) AS max_price,
  ROUND(AVG(fp.selling_price), 2) AS avg_price,
  COUNT(DISTINCT fp.product_id) AS product_count
FROM analytics_fact_pricing fp
JOIN analytics_products p ON p.id = fp.product_id
JOIN analytics_subcategories sc ON sc.id = p.sub_category_id
JOIN analytics_categories c ON c.id = sc.category_id
WHERE (:period_ids IS NULL OR fp.period_id = ANY(:period_ids))
  AND (:category_id IS NULL OR c.id = :category_id)
  AND (:sub_category_id IS NULL OR sc.id = :sub_category_id)
GROUP BY sc.name
ORDER BY avg_price DESC`,
      },
      {
        id: "margin_heatmap",
        name: "Margin Heatmap",
        chart: "heatmap",
        desc: "Gross margin % across all subcategories — find the most profitable niches",
        filters: [
          { key: "date_range", label: "Date range", type: "date_range" },
          { key: "category", label: "Category", type: "single_select" },
          { key: "branch", label: "Branch", type: "multi_select" },
        ],
        sql: `SELECT sc.name AS subcategory,
  ROUND(AVG(fp.selling_price), 2) AS avg_sell,
  ROUND(AVG(fp.standard_cost), 2) AS avg_cost,
  ROUND((AVG(fp.selling_price) - AVG(fp.standard_cost)) * 100.0 / NULLIF(AVG(fp.selling_price), 0), 2) AS margin_pct,
  COUNT(DISTINCT fp.product_id) AS products
FROM analytics_fact_pricing fp
JOIN analytics_products p ON p.id = fp.product_id
JOIN analytics_subcategories sc ON sc.id = p.sub_category_id
JOIN analytics_categories c ON c.id = sc.category_id
WHERE (:period_ids IS NULL OR fp.period_id = ANY(:period_ids))
  AND (:category_id IS NULL OR c.id = :category_id)
  AND (:branch_id IS NULL OR fp.branch_id = :branch_id)
GROUP BY sc.name
ORDER BY margin_pct DESC`,
      },
      {
        id: "price_vs_volume",
        name: "Price vs Volume Scatter",
        chart: "scatter",
        desc: "Does price correlate with volume? Find elasticity signals.",
        filters: [
          { key: "date_range", label: "Date range", type: "date_range" },
          { key: "category", label: "Category", type: "single_select" },
          { key: "subcategory", label: "Sub-category", type: "single_select" },
          { key: "branch", label: "Branch", type: "multi_select" },
        ],
        sql: `SELECT p.name AS product_name, p.stock_code,
  ROUND(AVG(fs.unit_price), 2) AS avg_price,
  SUM(fs.quantity) AS total_units,
  SUM(fs.total_amount) AS total_revenue
FROM analytics_fact_sales fs
JOIN analytics_products p ON p.id = fs.product_id
LEFT JOIN analytics_categories c ON c.id = COALESCE(fs.category_id, p.category_id)
LEFT JOIN analytics_subcategories sc ON sc.id = p.sub_category_id
WHERE (:period_ids IS NULL OR fs.period_id = ANY(:period_ids))
  AND (:category_id IS NULL OR c.id = :category_id)
  AND (:sub_category_id IS NULL OR sc.id = :sub_category_id)
  AND (:branch_id IS NULL OR fs.branch_id = :branch_id)
GROUP BY p.name, p.stock_code
ORDER BY total_revenue DESC
LIMIT 100`,
      },
      {
        id: "price_change_tracker",
        name: "Price Change Tracker",
        chart: "line",
        desc: "Track how the avg sell price of a product has moved over time",
        filters: [
          { key: "product", label: "Product / SKU", type: "search_select" },
          { key: "date_range", label: "Date range", type: "date_range" },
        ],
        sql: `SELECT per.label AS period_label, per.start_date,
  ROUND(AVG(fp.selling_price), 2) AS avg_sell_price,
  ROUND(AVG(fp.standard_cost), 2) AS avg_cost,
  COUNT(DISTINCT fp.branch_id) AS branches_with_price
FROM analytics_fact_pricing fp
JOIN analytics_periods per ON per.id = fp.period_id
WHERE fp.product_id = :product_id
  AND (:period_ids IS NULL OR fp.period_id = ANY(:period_ids))
GROUP BY per.label, per.start_date
ORDER BY per.start_date`,
      },
      {
        id: "economy_vs_premium",
        name: "Economy vs Premium Split",
        chart: "doughnut",
        desc: "Revenue share of products priced below vs above category median",
        filters: [
          { key: "date_range", label: "Date range", type: "date_range" },
          { key: "category", label: "Category", type: "single_select" },
          { key: "subcategory", label: "Sub-category", type: "single_select" },
          { key: "branch", label: "Branch", type: "multi_select" },
        ],
        sql: `WITH product_prices AS (
  SELECT p.id, p.name,
    AVG(fs.unit_price) AS avg_price,
    SUM(fs.total_amount) AS revenue
  FROM analytics_fact_sales fs
  JOIN analytics_products p ON p.id = fs.product_id
  LEFT JOIN analytics_categories c ON c.id = COALESCE(fs.category_id, p.category_id)
  LEFT JOIN analytics_subcategories sc ON sc.id = p.sub_category_id
  WHERE (:period_ids IS NULL OR fs.period_id = ANY(:period_ids))
    AND (:category_id IS NULL OR c.id = :category_id)
    AND (:sub_category_id IS NULL OR sc.id = :sub_category_id)
    AND (:branch_id IS NULL OR fs.branch_id = :branch_id)
  GROUP BY p.id, p.name
),
medians AS (
  SELECT PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY avg_price) AS median_price FROM product_prices
)
SELECT CASE WHEN pp.avg_price <= m.median_price THEN 'Economy' ELSE 'Premium' END AS tier,
  COUNT(DISTINCT pp.id) AS product_count,
  SUM(pp.revenue) AS total_revenue,
  ROUND(SUM(pp.revenue) * 100.0 / NULLIF((SELECT SUM(revenue) FROM product_prices), 0), 2) AS share_pct
FROM product_prices pp
CROSS JOIN medians m
GROUP BY tier`,
      },
    ],
  },
  {
    id: "stock",
    label: "Stock Movements",
    icon: "🔄",
    colour: "#06B6D4",
    desc: "Velocity of product movement through the supply chain. Fast movers, slow movers.",
    subtypes: [
      {
        id: "product_velocity",
        name: "Product Velocity Ranking",
        chart: "bar_h",
        desc: "All SKUs ranked by units/period average — fast movers vs slow movers",
        filters: [
          { key: "date_range", label: "Date range", type: "date_range" },
          { key: "category", label: "Category", type: "single_select" },
          { key: "subcategory", label: "Sub-category", type: "single_select" },
          { key: "branch", label: "Branch", type: "multi_select" },
        ],
        sql: `SELECT p.name, p.stock_code,
  SUM(fs.quantity) AS total_units,
  COUNT(DISTINCT fs.period_id) AS periods_active,
  ROUND(SUM(fs.quantity) / GREATEST(COUNT(DISTINCT fs.period_id), 1), 1) AS avg_units_per_period,
  SUM(fs.total_amount) AS total_revenue
FROM analytics_fact_sales fs
JOIN analytics_products p ON p.id = fs.product_id
LEFT JOIN analytics_categories c ON c.id = COALESCE(fs.category_id, p.category_id)
LEFT JOIN analytics_subcategories sc ON sc.id = p.sub_category_id
WHERE (:period_ids IS NULL OR fs.period_id = ANY(:period_ids))
  AND (:category_id IS NULL OR c.id = :category_id)
  AND (:sub_category_id IS NULL OR sc.id = :sub_category_id)
  AND (:branch_id IS NULL OR fs.branch_id = :branch_id)
GROUP BY p.name, p.stock_code
ORDER BY avg_units_per_period DESC
LIMIT 50`,
      },
      {
        id: "trend_direction",
        name: "Trend Direction Board",
        chart: "table_trend",
        desc: "Rising / Stable / Falling status for every active SKU",
        filters: [
          { key: "date_range", label: "Date range", type: "date_range" },
          { key: "category", label: "Category", type: "single_select" },
          { key: "trend_filter", label: "Trend direction", type: "chip_multi" },
        ],
        sql: `WITH period_sales AS (
  SELECT fs.product_id, per.label AS period_label,
    SUM(fs.quantity) AS qty
  FROM analytics_fact_sales fs
  JOIN analytics_periods per ON per.id = fs.period_id
  WHERE (:period_ids IS NULL OR fs.period_id = ANY(:period_ids))
  GROUP BY fs.product_id, per.label
),
trends AS (
  SELECT product_id,
    AVG(qty) AS avg_qty,
    CASE
      WHEN SUM(CASE WHEN period_label = (SELECT MAX(per2.label) FROM analytics_periods per2 JOIN analytics_fact_sales fs2 ON fs2.period_id = per2.id WHERE fs2.product_id = period_sales.product_id) THEN qty ELSE 0 END)
        > AVG(qty) * 1.1 THEN 'RISING'
      WHEN SUM(CASE WHEN period_label = (SELECT MAX(per2.label) FROM analytics_periods per2 JOIN analytics_fact_sales fs2 ON fs2.period_id = per2.id WHERE fs2.product_id = period_sales.product_id) THEN qty ELSE 0 END)
        < AVG(qty) * 0.9 THEN 'FALLING'
      ELSE 'STABLE'
    END AS trend
  FROM period_sales
  GROUP BY product_id
)
SELECT p.name, p.stock_code, c.name AS category,
  ROUND(t.avg_qty, 1) AS avg_period_qty, t.trend
FROM trends t
JOIN analytics_products p ON p.id = t.product_id
JOIN analytics_categories c ON c.id = p.category_id
WHERE (:category_id IS NULL OR p.category_id = :category_id)
ORDER BY t.trend, avg_qty DESC
LIMIT 100`,
      },
      {
        id: "weekly_movement",
        name: "Weekly Movement Chart",
        chart: "line",
        desc: "Period-by-period qty sold for a selected product",
        filters: [
          { key: "product", label: "Product / SKU", type: "search_select" },
          { key: "branch", label: "Branch", type: "multi_select" },
          { key: "date_range", label: "Date range", type: "date_range" },
        ],
        sql: `SELECT per.label AS period_label, per.start_date,
  SUM(fs.quantity) AS qty_sold,
  SUM(fs.total_amount) AS revenue,
  ROUND(AVG(fs.unit_price), 2) AS avg_price
FROM analytics_fact_sales fs
JOIN analytics_periods per ON per.id = fs.period_id
WHERE fs.product_id = :product_id
  AND (:period_ids IS NULL OR fs.period_id = ANY(:period_ids))
  AND (:branch_id IS NULL OR fs.branch_id = :branch_id)
GROUP BY per.label, per.start_date
ORDER BY per.start_date`,
      },
      {
        id: "movement_by_branch_heatmap",
        name: "Movement by Branch Heatmap",
        chart: "heatmap",
        desc: "Product x Branch matrix: how many units moved per branch per period",
        filters: [
          { key: "date_range", label: "Date range", type: "date_range" },
          { key: "category", label: "Category", type: "single_select" },
          { key: "subcategory", label: "Sub-category", type: "single_select" },
        ],
        sql: `SELECT b.name AS branch,
  p.name AS product,
  SUM(fs.quantity) AS units_moved
FROM analytics_fact_sales fs
JOIN analytics_products p ON p.id = fs.product_id
JOIN analytics_branches b ON b.id = fs.branch_id
LEFT JOIN analytics_categories c ON c.id = COALESCE(fs.category_id, p.category_id)
LEFT JOIN analytics_subcategories sc ON sc.id = p.sub_category_id
WHERE (:period_ids IS NULL OR fs.period_id = ANY(:period_ids))
  AND (:category_id IS NULL OR c.id = :category_id)
  AND (:sub_category_id IS NULL OR sc.id = :sub_category_id)
GROUP BY b.name, p.name
ORDER BY b.name, units_moved DESC
LIMIT 200`,
      },
    ],
  },
  {
    id: "supplier",
    label: "Supplier Performance",
    icon: "🏭",
    colour: "#3B82F6",
    desc: "Deep-dive on any single supplier. Revenue, product range, branch penetration, trend.",
    subtypes: [
      {
        id: "supplier_scorecard",
        name: "Supplier Scorecard",
        chart: "radar",
        desc: "A single supplier rated across 6 KPIs",
        filters: [
          { key: "supplier", label: "Supplier", type: "search_select" },
          { key: "date_range", label: "Date range", type: "date_range" },
        ],
        sql: `WITH stats AS (
  SELECT COALESCE(fs.supplier_id, p.default_supplier_id) AS sup_id,
    SUM(fs.total_amount) AS total_revenue,
    SUM(fs.quantity) AS total_units,
    COUNT(DISTINCT p.id) AS sku_count,
    COUNT(DISTINCT fs.branch_id) AS branch_reach,
    COUNT(DISTINCT fs.period_id) AS periods_active,
    AVG(fs.unit_price) AS avg_price
  FROM analytics_fact_sales fs
  JOIN analytics_products p ON p.id = fs.product_id
  WHERE (:period_ids IS NULL OR fs.period_id = ANY(:period_ids))
    AND (:supplier_ids IS NULL OR COALESCE(fs.supplier_id, p.default_supplier_id) = ANY(:supplier_ids))
  GROUP BY COALESCE(fs.supplier_id, p.default_supplier_id)
),
maxes AS (
  SELECT MAX(total_revenue) AS mr, MAX(total_units) AS mu,
    MAX(sku_count) AS ms, MAX(branch_reach) AS mb, MAX(periods_active) AS mp
  FROM stats
)
SELECT s.name,
  ROUND(st.total_revenue * 100.0 / NULLIF(m.mr, 0), 0) AS revenue_score,
  ROUND(st.total_units * 100.0 / NULLIF(m.mu, 0), 0) AS volume_score,
  ROUND(st.sku_count * 100.0 / NULLIF(m.ms, 0), 0) AS range_score,
  ROUND(st.branch_reach * 100.0 / NULLIF(m.mb, 0), 0) AS reach_score,
  ROUND(st.periods_active * 100.0 / NULLIF(m.mp, 0), 0) AS stability_score,
  ROUND(100 - (st.avg_price * 100.0 / NULLIF((SELECT MAX(avg_price) FROM stats), 0)), 0) AS competitiveness_score
FROM stats st
CROSS JOIN maxes m
JOIN analytics_suppliers s ON s.id = st.sup_id
WHERE (:supplier_ids IS NULL OR st.sup_id = ANY(:supplier_ids))
ORDER BY st.total_revenue DESC`,
      },
      {
        id: "supplier_revenue_timeline",
        name: "Supplier Revenue Timeline",
        chart: "line",
        desc: "Revenue trend for selected supplier across periods with change markers",
        filters: [
          { key: "supplier", label: "Supplier", type: "search_select" },
          { key: "date_range", label: "Date range", type: "date_range" },
          { key: "category", label: "Category", type: "single_select" },
        ],
        sql: `SELECT per.label AS period_label, per.start_date,
  SUM(fs.total_amount) AS revenue,
  SUM(fs.quantity) AS units,
  COUNT(DISTINCT p.id) AS products_sold
FROM analytics_fact_sales fs
JOIN analytics_products p ON p.id = fs.product_id
JOIN analytics_periods per ON per.id = fs.period_id
LEFT JOIN analytics_categories c ON c.id = COALESCE(fs.category_id, p.category_id)
WHERE (:period_ids IS NULL OR fs.period_id = ANY(:period_ids))
  AND (:supplier_ids IS NULL OR COALESCE(fs.supplier_id, p.default_supplier_id) = ANY(:supplier_ids))
  AND (:category_id IS NULL OR c.id = :category_id)
GROUP BY per.label, per.start_date
ORDER BY per.start_date`,
      },
      {
        id: "supplier_portfolio",
        name: "Supplier Portfolio Map",
        chart: "bar_h",
        desc: "All products from a supplier shown proportionally by revenue",
        filters: [
          { key: "supplier", label: "Supplier", type: "search_select" },
          { key: "date_range", label: "Date range", type: "date_range" },
          { key: "branch", label: "Branch", type: "multi_select" },
        ],
        sql: `SELECT p.name AS product_name, p.stock_code,
  c.name AS category,
  SUM(fs.total_amount) AS revenue,
  SUM(fs.quantity) AS units,
  ROUND(SUM(fs.total_amount) * 100.0 / NULLIF(SUM(SUM(fs.total_amount)) OVER (), 0), 2) AS share_pct
FROM analytics_fact_sales fs
JOIN analytics_products p ON p.id = fs.product_id
JOIN analytics_categories c ON c.id = COALESCE(fs.category_id, p.category_id)
WHERE (:period_ids IS NULL OR fs.period_id = ANY(:period_ids))
  AND (:supplier_ids IS NULL OR COALESCE(fs.supplier_id, p.default_supplier_id) = ANY(:supplier_ids))
  AND (:branch_id IS NULL OR fs.branch_id = :branch_id)
GROUP BY p.name, p.stock_code, c.name
ORDER BY revenue DESC
LIMIT 50`,
      },
      {
        id: "top_suppliers_by_branch",
        name: "Top Suppliers by Branch",
        chart: "bar_grouped",
        desc: "For each branch: top 5 suppliers by revenue — shows regional penetration",
        filters: [
          { key: "date_range", label: "Date range", type: "date_range" },
          { key: "category", label: "Category", type: "single_select" },
          { key: "branch", label: "Branch", type: "multi_select" },
        ],
        sql: `WITH ranked AS (
  SELECT b.name AS branch_name,
    s.name AS supplier_name,
    SUM(fs.total_amount) AS revenue,
    ROW_NUMBER() OVER (PARTITION BY fs.branch_id ORDER BY SUM(fs.total_amount) DESC) AS rn
  FROM analytics_fact_sales fs
  JOIN analytics_products p ON p.id = fs.product_id
  JOIN analytics_suppliers s ON s.id = COALESCE(fs.supplier_id, p.default_supplier_id)
  JOIN analytics_branches b ON b.id = fs.branch_id
  LEFT JOIN analytics_categories c ON c.id = COALESCE(fs.category_id, p.category_id)
  WHERE (:period_ids IS NULL OR fs.period_id = ANY(:period_ids))
    AND (:category_id IS NULL OR c.id = :category_id)
    AND (:branch_id IS NULL OR fs.branch_id = :branch_id)
  GROUP BY b.name, s.name, fs.branch_id
)
SELECT branch_name, supplier_name, revenue
FROM ranked WHERE rn <= 5
ORDER BY branch_name, revenue DESC`,
      },
    ],
  },
];

export function findSubtype(categoryId: string, subtypeId: string): ReportSubtype | undefined {
  const cat = REPORT_CATEGORIES.find(c => c.id === categoryId);
  return cat?.subtypes.find(s => s.id === subtypeId);
}

export function findCategory(categoryId: string): ReportCategory | undefined {
  return REPORT_CATEGORIES.find(c => c.id === categoryId);
}

export function getFilterOptions(): Record<string, string> {
  return {
    date_range: "Date range",
    category: "Category",
    subcategory: "Sub-category",
    branch: "Branch",
    supplier: "Supplier",
    suppliers_multi: "Suppliers (compare)",
    product: "Product / SKU",
    metric: "Primary metric",
    trend_filter: "Trend direction",
    lead_time: "Lead time (days)",
  };
}
