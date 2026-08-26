const { createClient } = require("@supabase/supabase-js");

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const admin = createClient(url, key);

  // Delete old documents that have data URIs (from previous runs)
  const { data: docs, error } = await admin
    .from("documents")
    .select("id, name, created_at")
    .eq("client_id", "e2f9301b-e1ea-4026-886f-7f44e55770b5")
    .eq("visible_to_client", true)
    .ilike("url", "data:application/json%")
    .order("created_at", { ascending: false });
  if (error) { console.error("Query error:", error.message); return; }
  console.log(`Found ${docs?.length || 0} old documents to delete`);
  for (const d of docs || []) {
    console.log(`  Delete: ${d.name} (${d.id.slice(0,8)})`);
  }
  if (docs && docs.length > 0) {
    const ids = docs.map(d => d.id);
    const { error: delErr } = await admin.from("documents").delete().in("id", ids);
    if (delErr) console.error("Delete error:", delErr.message);
    else console.log("Deleted successfully");
  }
  
  // Also delete the old reports
  const { data: reports } = await admin
    .from("reports")
    .select("id, title")
    .eq("client_id", "e2f9301b-e1ea-4026-886f-7f44e55770b5")
    .eq("type", "category_analysis");
  console.log(`\nFound ${reports?.length || 0} old reports`);
  if (reports && reports.length > 0) {
    const ids = reports.map(r => r.id);
    const { error: delErr } = await admin.from("reports").delete().in("id", ids);
    if (delErr) console.error("Delete error:", delErr.message);
    else console.log("Deleted reports successfully");
  }
}

main().catch(err => { console.error(err); process.exit(1); });
