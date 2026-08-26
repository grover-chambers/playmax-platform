const { createClient } = require("@supabase/supabase-js");

const NICE_CLIENT_ID = "e2f9301b-e1ea-4026-886f-7f44e55770b5";

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing env vars");
  const admin = createClient(url, key);

  // Check client info
  const { data: client } = await admin.from("clients").select("id, name, company").eq("id", NICE_CLIENT_ID).single();
  console.log("Client:", JSON.stringify(client));

  // Check what suppliers exist in analytics_suppliers
  const { data: sups } = await admin.from("analytics_suppliers").select("id, name").limit(50);
  console.log("\nFirst 50 suppliers:"); 
  for (const s of sups || []) console.log(`  ${s.id.slice(0,8)}: ${s.name}`);

  // Check sales to see what supplier_ids are actually used for NICE's categories
  const { data: sharing } = await admin
    .from("portal_analytics_sharing")
    .select("period_id, category_id")
    .eq("client_id", NICE_CLIENT_ID)
    .eq("visible", true)
    .single();
  if (!sharing) { console.log("No sharing"); return; }

  const { data: salesSample } = await admin
    .from("analytics_fact_sales")
    .select("supplier_id, quantity, total_amount, product:analytics_products(name)")
    .eq("category_id", sharing.category_id)
    .eq("period_id", sharing.period_id)
    .limit(20);
  console.log("\nSample sales (first 20):");
  for (const s of salesSample || []) {
    const supName = s.supplier_id ? (sups || []).find(x => x.id === s.supplier_id)?.name || s.supplier_id.slice(0,8) : "null";
    console.log(`  Supplier: ${supName}, Product: ${s.product?.name || "?"}, Qty: ${s.quantity}, Amt: ${s.total_amount}`);
  }
}

main().catch(err => { console.error(err); process.exit(1); });
