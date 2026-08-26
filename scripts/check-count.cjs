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

  // Count total rows without limit
  const { count, error } = await admin
    .from("analytics_fact_sales")
    .select("*", { count: "exact", head: true })
    .in("period_id", periodIds)
    .in("category_id", categoryIds);
  console.log(`Total rows in shared scope: ${count}`);
}

main().catch(err => { console.error(err); process.exit(1); });
