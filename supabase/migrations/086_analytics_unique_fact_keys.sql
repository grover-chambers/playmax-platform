-- 086_analytics_unique_fact_keys.sql
-- Natural-key uniqueness on the fact tables so imports are idempotent and
-- can be bulk-upserted (INSERT ... ON CONFLICT, PostgREST upsert / merge).
-- Verified safe: analytics_fact_sales has ZERO duplicate (period, branch,
-- product) groups today; the stale month-blocks under test are distinct rows
-- per key.
--
-- Runs against the MAIN Supabase project. Idempotent.

create unique index if not exists uq_fact_sales_period_branch_product
  on analytics_fact_sales (period_id, branch_id, product_id);

create unique index if not exists uq_fact_pricing_period_branch_product
  on analytics_fact_pricing (period_id, branch_id, product_id);

-- Upsert-friendly constraints surface day-1 data hygiene: a supplier's
-- market share view should never double-count the same sale.
create unique index if not exists uq_supplier_products
  on analytics_supplier_products (supplier_id, product_id);