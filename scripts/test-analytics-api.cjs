const { createClient } = require("@supabase/supabase-js");

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const admin = createClient(url, key);
  const NICE_CLIENT_ID = "e2f9301b-e1ea-4026-886f-7f44e55770b5";

  // Simulate what the authenticated analytics endpoint does
  const { data: sharing } = await admin
    .from("portal_analytics_sharing")
    .select("period_id, branch_id, category_id")
    .eq("client_id", NICE_CLIENT_ID)
    .eq("visible", true);
  console.log(`Sharing records: ${sharing?.length || 0}`);

  const periodIds = [...new Set(sharing.map(s => s.period_id))];
  const branchIds = [...new Set(sharing.map(s => s.branch_id).filter(Boolean))];
  const categoryIds = [...new Set(sharing.map(s => s.category_id).filter(Boolean))];
  console.log(`Periods: ${periodIds.length}, Branches: ${branchIds.length}, Categories: ${categoryIds.length}`);

  // Test sales query with pagination (like the fixed endpoint)
  const allSales = [];
  const PAGE = 1000;
  let from = 0;
  while (true) {
    let q = admin
      .from("analytics_fact_sales")
      .select("id, quantity, total_amount, cost_amount, weight_tonnes, unit_price, product_id, branch_id, period_id, category_id, supplier_id, product:analytics_products(name, stock_code), period:analytics_periods(label, year, quarter, month), branch:analytics_branches(name, code), category:analytics_categories(name)")
      .in("period_id", periodIds)
      .range(from, from + PAGE - 1);
    if (branchIds.length > 0) q = q.in("branch_id", branchIds);
    if (categoryIds.length > 0) q = q.in("category_id", categoryIds);
    const { data, error } = await q;
    if (error) { console.error("Sales error:", error.message); break; }
    if (!data || data.length === 0) break;
    allSales.push(...data);
    from += PAGE;
    if (data.length < PAGE) break;
  }
  console.log(`Sales rows: ${allSales.length}`);

  if (allSales.length === 0) {
    console.log("NO SALES DATA - this is why analytics is empty");
    return;
  }

  // Show what we got
  const uniqueCategories = new Set(allSales.map(r => r.category_id));
  const uniqueSuppliers = new Set(allSales.map(r => r.supplier_id).filter(Boolean));
  const uniqueBranches = new Set(allSales.map(r => r.branch_id).filter(Boolean));
  const uniqueProducts = new Set(allSales.map(r => r.product_id).filter(Boolean));
  console.log(`Unique categories: ${uniqueCategories.size}`);
  console.log(`Unique suppliers: ${uniqueSuppliers.size}`);
  console.log(`Unique branches: ${uniqueBranches.size}`);
  console.log(`Unique products: ${uniqueProducts.size}`);

  // Show sample rows
  const sample = allSales.slice(0, 3).map(r => ({
    cat: r.category?.name || r.category_id,
    sup: r.supplier_id?.slice(0,8) || "null",
    branch: r.branch?.name || r.branch_id,
    product: r.product?.name || r.product_id,
    amt: Number(r.total_amount).toFixed(0),
    qty: Number(r.quantity).toFixed(0),
    period: r.period?.label || r.period_id.slice(0,8),
  }));
  console.log("Sample:", JSON.stringify(sample, null, 2));

  // Summary
  const grandTotal = allSales.reduce((s, r) => s + Number(r.total_amount), 0);
  const grandQty = allSales.reduce((s, r) => s + Number(r.quantity), 0);
  console.log(`Grand total: KES ${(grandTotal / 1000000).toFixed(1)}M, Qty: ${grandQty.toFixed(0)}`);
}

main().catch(err => { console.error(err); process.exit(1); });
