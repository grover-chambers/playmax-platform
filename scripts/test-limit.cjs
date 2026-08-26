const { createClient } = require("@supabase/supabase-js");

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const admin = createClient(url, key);

  const { data: sharing } = await admin
    .from("portal_analytics_sharing")
    .select("period_id, category_id")
    .eq("client_id", "e2f9301b-e1ea-4026-886f-7f44e55770b5")
    .eq("visible", true);
  const periodIds = [...new Set(sharing.map(s => s.period_id))];
  const categoryIds = [...new Set(sharing.map(s => s.category_id).filter(Boolean))];

  // Test with explicit range
  const { data: r1, count } = await admin
    .from("analytics_fact_sales")
    .select("id, supplier_id", { count: "exact" })
    .in("period_id", periodIds)
    .in("category_id", categoryIds)
    .range(0, 100000);
  console.log(`Range(0,100000): ${r1?.length || 0} rows (total: ${count})`);

  // Test without explicit range/limit
  const { data: r2 } = await admin
    .from("analytics_fact_sales")
    .select("id, supplier_id")
    .in("period_id", periodIds)
    .in("category_id", categoryIds);
  console.log(`No range/limit: ${r2?.length || 0} rows`);

  // Test with limit
  const { data: r3 } = await admin
    .from("analytics_fact_sales")
    .select("id, supplier_id")
    .in("period_id", periodIds)
    .in("category_id", categoryIds)
    .limit(50000);
  console.log(`Limit(50000): ${r3?.length || 0} rows`);

  // Check what count NICE has
  const NICE_SUPPLIER_ID = "b2fba4d1-4df1-472e-9f5b-387561cae77b";
  const { data: r4 } = await admin
    .from("analytics_fact_sales")
    .select("id, supplier_id, quantity, total_amount")
    .in("period_id", periodIds)
    .in("category_id", categoryIds)
    .eq("supplier_id", NICE_SUPPLIER_ID);
  console.log(`NICE rows: ${r4?.length || 0}`);
  if (r4 && r4.length > 0) {
    const total = r4.reduce((s, r) => s + Number(r.total_amount), 0);
    const qty = r4.reduce((s, r) => s + Number(r.quantity), 0);
    console.log(`NICE total: KES ${total}, Qty: ${qty}`);
  }
}

main().catch(err => { console.error(err); process.exit(1); });
