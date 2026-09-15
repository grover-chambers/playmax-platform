#!/usr/bin/env node
/**
 * Import a per_store_sales / chain_wide_sales upload into the fact layer
 * (analytics_fact_sales + analytics_fact_pricing) and mark it imported.
 *
 * Idempotent: relies on the natural-key unique indexes
 *   uq_fact_sales_period_branch_product / uq_fact_pricing_period_branch_product
 * so re-running upserts instead of duplicating.
 *
 * Usage:
 *   node scripts/import-store-sales.cjs <uploadId>
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in env.
 */
const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

function loadEnv() {
  const env = { ...process.env };
  for (const file of [".env", ".env.local"]) {
    const p = path.resolve(process.cwd(), file);
    if (!fs.existsSync(p)) continue;
    for (const line of fs.readFileSync(p, "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)=(.*)\s*$/);
      if (!m) continue;
      env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
  return env;
}

const toNum = (v) => {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") return v;
  const n = parseFloat(String(v).replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
};

const CHUNK = 250;

async function chunked(sb, builder, rows, mapFn) {
  let inserted = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = rows.slice(i, i + CHUNK);
    const payload = slice.map(mapFn);
    const { error } = await builder(payload);
    if (error) throw error;
    inserted += payload.length;
  }
  return inserted;
}

async function main() {
  const env = loadEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  const uploadId = process.argv[2];
  if (!url || !key) { console.error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY"); process.exit(2); }
  if (!uploadId) { console.error("Usage: node scripts/import-store-sales.cjs <uploadId>"); process.exit(2); }

  const sb = createClient(url, key, { auth: { persistSession: false } });

  const { data: upload, error: uploadErr } = await sb
    .from("analytics_staging_uploads").select("*").eq("id", uploadId).single();
  if (uploadErr || !upload) { console.error("Upload not found:", uploadErr?.message ?? uploadId); process.exit(1); }

  const periodId = upload.period_id ?? null;
  const branchId = upload.branch_id ?? null;
  if (!periodId || !branchId) { console.error("Upload has no period_id/branch_id set."); process.exit(1); }

  console.log(`Importing "${upload.filename}" (data for ${periodId} / ${branchId})`);

  const { data: rows, error: rowsErr } = await sb
    .from("analytics_staging_rows")
    .select("*")
    .eq("upload_id", uploadId)
    .not("stock_code", "is", null)
    .order("row_number");
  if (rowsErr) { console.error("Staging read failed:", rowsErr.message); process.exit(1); }

  const valid = (rows ?? []).filter((r) => r.stock_code && String(r.stock_code).trim() !== "");
  const codes = [...new Set(valid.map((r) => String(r.stock_code).trim()))];

  // ---- resolve products in bulk --------------------------------
  const prodByCode = new Map();
  for (let i = 0; i < codes.length; i += CHUNK) {
    const { data: existing } = await sb
      .from("analytics_products")
      .select("id, stock_code, category_id, sub_category_id")
      .in("stock_code", codes.slice(i, i + CHUNK));
    for (const p of existing ?? []) prodByCode.set(p.stock_code, p);
  }

  // create missing products
  const missingCodes = codes.filter((c) => !prodByCode.has(c));
  const missingRows = valid.filter((r) => missingCodes.includes(String(r.stock_code).trim()) && r.product_name);
  for (let i = 0; i < missingRows.length; i += CHUNK) {
    const slice = missingRows.slice(i, i + CHUNK);
    const { data: created, error } = await sb.from("analytics_products")
      .insert(slice.map((r) => ({
        stock_code: String(r.stock_code).trim(),
        name: r.product_name,
        sub_category: r.sub_category ?? null,
      })))
      .select("id, stock_code, category_id, sub_category_id");
    if (error) throw error;
    for (const p of created ?? []) prodByCode.set(p.stock_code, p);
  }

  // ---- build fact payloads --------------------------------------
  const salesFields = [];
  const pricingFields = [];
  let skipped = 0;
  for (const r of valid) {
    const code = String(r.stock_code).trim();
    const product = prodByCode.get(code);
    if (!product) { skipped++; continue; }

    const quantity = toNum(r.quantity) ?? 0;
    const unit_price = toNum(r.unit_price);
    const unit_cost = toNum(r.unit_cost);
    const weight_tonnes = toNum(r.weight_tonnes) ?? 0;
    const total_amount = toNum(r.total_amount) ?? (unit_price != null ? quantity * unit_price : 0);
    const cost_amount = unit_cost != null ? quantity * unit_cost : 0;

    salesFields.push({
      period_id: periodId,
      branch_id: branchId,
      category_id: product.category_id ?? upload.category_id ?? null,
      sub_category_id: product.sub_category_id ?? upload.sub_category_id ?? null,
      product_id: product.id,
      quantity,
      weight_tonnes,
      unit_price: unit_price ?? null,
      total_amount,
      cost_amount,
      vat_amount: null,
    });

    if (unit_cost != null || unit_price != null) {
      pricingFields.push({
        period_id: periodId,
        branch_id: branchId,
        product_id: product.id,
        standard_cost: unit_cost ?? null,
        selling_price: unit_price ?? null,
        weight_tonnes,
        category_id: null,
        sub_category_id: null,
      });
    }
  }

  // ---- upsert facts ----------------------------------------------
  const nSales = await chunked(sb, (p) => sb.from("analytics_fact_sales").upsert(p, { onConflict: "period_id,branch_id,product_id" }), salesFields, (x) => x);
  const nPricing = await chunked(sb, (p) => sb.from("analytics_fact_pricing").upsert(p, { onConflict: "period_id,branch_id,product_id" }), pricingFields, (x) => x);

  await sb.from("analytics_staging_uploads").update({ status: "imported", error_rows: 0 }).eq("id", uploadId);

  console.log(`Done: fact_sales=${nSales} fact_pricing=${nPricing} skipped=${skipped} status=imported`);
}

main().catch((e) => { console.error(e); process.exit(1); });