const { createClient } = require("@supabase/supabase-js");

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const admin = createClient(url, key);
  const NICE_SUPPLIER_ID = "b2fba4d1-4df1-472e-9f5b-387561cae77b";

  const { data: sharing } = await admin
    .from("portal_analytics_sharing")
    .select("period_id, category_id")
    .eq("client_id", "e2f9301b-e1ea-4026-886f-7f44e55770b5")
    .eq("visible", true);

  if (!sharing || sharing.length === 0) { console.log("No sharing"); return; }
  console.log("Sharing records:", sharing.length);
  const periodIds = [...new Set(sharing.map(s => s.period_id))];
  const categoryIds = [...new Set(sharing.map(s => s.category_id).filter(Boolean))];
  console.log("Periods:", periodIds);
  console.log("Categories:", categoryIds);

  // Check if NICE's supplier ID appears in these sales
  const { data: niceSales } = await admin
    .from("analytics_fact_sales")
    .select("id, quantity, total_amount, branch_id, period_id, product:analytics_products(name), branch:analytics_branches(name)")
    .in("period_id", periodIds)
    .in("category_id", categoryIds)
    .eq("supplier_id", NICE_SUPPLIER_ID);
  console.log(`\nNICE (${NICE_SUPPLIER_ID}) sales in shared scope: ${niceSales?.length || 0}`);
  if (niceSales && niceSales.length > 0) {
    for (const s of niceSales.slice(0, 5)) {
      console.log(`  ${s.product?.name || '?'} @ ${s.branch?.name || '?'}: ${s.quantity} x ${s.total_amount}`);
    }
  } else {
    // Check if NICE appears as a supplier at all in any category
    const { data: anySales } = await admin
      .from("analytics_fact_sales")
      .select("id, quantity, total_amount")
      .eq("supplier_id", NICE_SUPPLIER_ID)
      .limit(5);
    console.log(`NICE sales in ANY category: ${anySales?.length || 0}`);
    
    if (anySales && anySales.length > 0) {
      console.log("NICE does have sales but not in the shared scope.");
    } else {
      console.log("NICE has ZERO sales in analytics_fact_sales as a supplier.");
      // Check what products are associated with NICE supplier
      const { data: niceProducts } = await admin
        .from("analytics_products")
        .select("id, name, stock_code")
        .eq("supplier_id", NICE_SUPPLIER_ID)
        .limit(20);
      console.log(`Products with NICE as supplier: ${niceProducts?.length || 0}`);
      for (const p of niceProducts || []) console.log(`  ${p.name} (${p.stock_code})`);
    }
  }
}

main().catch(err => { console.error(err); process.exit(1); });
