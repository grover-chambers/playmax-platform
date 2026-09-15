-- 085_analytics_profitability_engine.sql
-- Profitability read-model + AI-insight seat for the analytics engine.
--
-- Runs against the MAIN Supabase project (analytics schema, public).
-- Idempotent: safe to re-run.

-- =====================================================================
-- 1. Indexes for the relational joins the profitability queries use
--    (period -> branch -> product -> supplier -> category).
-- =====================================================================
create index if not exists idx_fact_sales_period_branch
  on analytics_fact_sales (period_id, branch_id);

create index if not exists idx_fact_sales_supplier
  on analytics_fact_sales (supplier_id);

create index if not exists idx_fact_sales_product
  on analytics_fact_sales (product_id);

create index if not exists idx_fact_sales_period_category
  on analytics_fact_sales (period_id, category_id);

create index if not exists idx_fact_pricing_period_product_branch
  on analytics_fact_pricing (period_id, product_id, branch_id);

create index if not exists idx_supplier_products_supplier
  on analytics_supplier_products (supplier_id);

create index if not exists idx_supplier_products_product
  on analytics_supplier_products (product_id);

-- =====================================================================
-- 2. Profitability read-model
--
--    Row grain: period x branch x product. Every row carries BOTH sides
--    we know — revenue (our sales) and cost (what we paid the supplier) —
--    so margin and markup fall straight out. Supplier attribution prefers
--    the sale's supplier_id and falls back to the product's default
--    supplier, so "who supplies this good" is never a dead end.
--
--    security_invoker = true  => the underlying fact/dimension RLS
--    (staff/client scoped) is enforced on the view as well.
-- =====================================================================
create or replace view analytics_v_profitability
with (security_invoker = true) as
select
  p.id                          as period_id,
  p.label                       as period_label,
  p.start_date                  as period_start,
  p.end_date                    as period_end,
  b.id                          as branch_id,
  b.name                        as branch_name,
  b.code                        as branch_code,
  b.city                        as branch_city,
  b.region                      as branch_region,
  c.id                          as category_id,
  c.name                        as category_name,
  sc.id                         as sub_category_id,
  sc.name                       as sub_category_name,
  pr.id                         as product_id,
  pr.stock_code                 as stock_code,
  pr.name                       as product_name,
  pr.pack_size                  as pack_size,
  s.id                          as supplier_id,
  s.name                        as supplier_name,
  f.quantity                    as quantity,
  f.weight_tonnes               as weight_tonnes,
  f.unit_price                  as selling_price,
  ic.standard_cost              as cost_price,
  f.total_amount                as revenue,
  f.cost_amount                 as cost,
  f.vat_amount                  as vat,
  (f.total_amount - coalesce(f.cost_amount, 0))            as profit,
  case when f.total_amount <> 0
       then ((f.total_amount - coalesce(f.cost_amount, 0)) / f.total_amount) * 100
       else 0 end                                          as margin_pct,
  case when coalesce(f.cost_amount, 0) <> 0
       then ((f.total_amount - f.cost_amount) / f.cost_amount) * 100
       else 0 end                                          as markup_pct
from analytics_fact_sales f
join analytics_periods      p  on p.id  = f.period_id
join analytics_branches     b  on b.id  = f.branch_id
left join analytics_products     pr on pr.id = f.product_id
left join analytics_categories   c  on c.id  = coalesce(f.category_id, pr.category_id)
left join analytics_subcategories sc on sc.id = coalesce(f.sub_category_id, pr.sub_category_id)
left join analytics_suppliers    s  on s.id  = coalesce(f.supplier_id, pr.default_supplier_id)
left join lateral (
  select fp.standard_cost
  from analytics_fact_pricing fp
  where fp.product_id = f.product_id
    and fp.period_id  = f.period_id
    and (fp.branch_id = f.branch_id or fp.branch_id is null)
  order by (fp.branch_id = f.branch_id) desc, fp.created_at desc
  limit 1
) ic on true;

-- =====================================================================
-- 3. Roll-up profitability views (branch, supplier, product, category)
-- =====================================================================
create or replace view analytics_v_branch_profitability
with (security_invoker = true) as
select
  v.period_id,
  v.period_label,
  v.branch_id,
  v.branch_name,
  v.branch_code,
  v.branch_city,
  v.branch_region,
  count(*)                                        as sku_count,
  coalesce(sum(v.quantity), 0)                    as quantity,
  coalesce(sum(v.weight_tonnes), 0)               as weight_tonnes,
  coalesce(sum(v.revenue), 0)                     as revenue,
  coalesce(sum(v.cost), 0)                        as cost,
  coalesce(sum(v.profit), 0)                      as profit,
  case when sum(v.revenue) <> 0
       then (sum(v.revenue) - coalesce(sum(v.cost), 0)) / sum(v.revenue) * 100
       else 0 end                                 as margin_pct
from analytics_v_profitability v
group by v.period_id, v.period_label, v.branch_id, v.branch_name,
         v.branch_code, v.branch_city, v.branch_region;

create or replace view analytics_v_supplier_profitability
with (security_invoker = true) as
select
  v.period_id,
  v.period_label,
  v.supplier_id,
  coalesce(v.supplier_name, 'Unassigned')         as supplier_name,
  count(*)                                        as sku_count,
  coalesce(sum(v.quantity), 0)                    as quantity,
  coalesce(sum(v.revenue), 0)                     as revenue,
  coalesce(sum(v.cost), 0)                        as cost,
  coalesce(sum(v.profit), 0)                      as profit,
  case when sum(v.revenue) <> 0
       then (sum(v.revenue) - coalesce(sum(v.cost), 0)) / sum(v.revenue) * 100
       else 0 end                                 as margin_pct
from analytics_v_profitability v
group by v.period_id, v.period_label, v.supplier_id, v.supplier_name;

create or replace view analytics_v_product_profitability
with (security_invoker = true) as
select
  v.period_id,
  v.period_label,
  v.product_id,
  v.stock_code,
  v.product_name,
  v.pack_size,
  v.category_id,
  v.category_name,
  v.sub_category_id,
  v.sub_category_name,
  v.supplier_id,
  v.supplier_name,
  coalesce(sum(v.quantity), 0)                    as quantity,
  coalesce(sum(v.revenue), 0)                     as revenue,
  coalesce(sum(v.cost), 0)                        as cost,
  coalesce(sum(v.profit), 0)                      as profit,
  coalesce(avg(v.cost_price), 0)                  as avg_cost_price,
  coalesce(avg(v.selling_price), 0)               as avg_selling_price,
  case when sum(v.revenue) <> 0
       then (sum(v.revenue) - coalesce(sum(v.cost), 0)) / sum(v.revenue) * 100
       else 0 end                                 as margin_pct
from analytics_v_profitability v
group by v.period_id, v.period_label, v.product_id, v.stock_code, v.product_name,
         v.pack_size, v.category_id, v.category_name, v.sub_category_id,
         v.sub_category_name, v.supplier_id, v.supplier_name;

create or replace view analytics_v_category_profitability
with (security_invoker = true) as
select
  v.period_id,
  v.period_label,
  v.category_id,
  v.category_name,
  v.sub_category_id,
  v.sub_category_name,
  count(distinct v.product_id)                    as sku_count,
  coalesce(sum(v.quantity), 0)                    as quantity,
  coalesce(sum(v.revenue), 0)                     as revenue,
  coalesce(sum(v.cost), 0)                        as cost,
  coalesce(sum(v.profit), 0)                      as profit,
  case when sum(v.revenue) <> 0
       then (sum(v.revenue) - coalesce(sum(v.cost), 0)) / sum(v.revenue) * 100
       else 0 end                                 as margin_pct
from analytics_v_profitability v
group by v.period_id, v.period_label, v.category_id, v.category_name,
         v.sub_category_id, v.sub_category_name;

-- =====================================================================
-- 4. AI-insight seat
--
--    Where the recommendation layer (rule-based today, LLM tomorrow)
--    writes "here is where we are + what we should do" per scope, and
--    staff action it (open -> applied/dismissed). Service-role writes;
--    authenticated staff read.
-- =====================================================================
create table if not exists analytics_insights (
  id               uuid primary key default gen_random_uuid(),
  created_at       timestamptz not null default now(),
  scope            text not null default 'chain',      -- chain | branch | supplier | category | product
  insight_type     text not null default 'insight',    -- margin_alert | price_check | stock_alert | supplier_alert | opportunity | forecast
  title            text not null,
  body             text not null,
  metrics          jsonb not null default '{}'::jsonb, -- numbers behind the insight (revenue, margin_pct, delta, ...)
  recommendation   text,                               -- the proposed action
  severity         smallint not null default 3,        -- 1 critical .. 5 info
  period_id        uuid references analytics_periods(id)  on delete cascade,
  branch_id        uuid references analytics_branches(id) on delete cascade,
  supplier_id      uuid references analytics_suppliers(id) on delete cascade,
  category_id      uuid references analytics_categories(id) on delete cascade,
  product_id       uuid references analytics_products(id)  on delete cascade,
  source           text not null default 'rule',       -- rule | ai
  status           text not null default 'open',       -- open | applied | dismissed
  applied_at       timestamptz,
  applied_by       uuid,
  dismissed_at     timestamptz,
  dismissed_by     uuid
);

create index if not exists idx_insights_status    on analytics_insights (status);
create index if not exists idx_insights_scope     on analytics_insights (scope, insight_type);
create index if not exists idx_insights_period    on analytics_insights (period_id, branch_id);

alter table analytics_insights enable row level security;

drop policy if exists "staff can read insights" on analytics_insights;
create policy "staff can read insights"
  on analytics_insights for select
  using (auth.role() = 'authenticated');

drop policy if exists "staff can update insights" on analytics_insights;
create policy "staff can update insights"
  on analytics_insights for update
  using (auth.role() = 'authenticated');

-- Service-role (the engine/AI) is the writer; staff can read + action.
grant select on analytics_insights to authenticated, anon;
grant insert, update on analytics_insights to authenticated;

-- Read-model views: security_invoker keeps underlying fact/dimension RLS
-- in force, so these stay out of reach of non-scoped roles.
grant select on analytics_v_profitability             to authenticated, anon;
grant select on analytics_v_branch_profitability      to authenticated, anon;
grant select on analytics_v_supplier_profitability    to authenticated, anon;
grant select on analytics_v_product_profitability     to authenticated, anon;
grant select on analytics_v_category_profitability    to authenticated, anon;