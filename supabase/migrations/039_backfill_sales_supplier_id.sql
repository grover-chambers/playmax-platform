-- ═══════════════════════════════════════════════════════════════
-- Migration 039: Backfill null supplier_id on analytics_fact_sales
-- ═══════════════════════════════════════════════════════════════
-- Uses analytics_supplier_products junction to map product_id → supplier_id.
-- If a product has multiple suppliers, picks the first (lowest ID)
-- ═══════════════════════════════════════════════════════════════

BEGIN;

-- Backfill supplier_id on fact_sales rows where it's null
UPDATE analytics_fact_sales fs
SET supplier_id = sp.supplier_id
FROM analytics_supplier_products sp
WHERE fs.supplier_id IS NULL
  AND fs.product_id = sp.product_id;

COMMIT;
