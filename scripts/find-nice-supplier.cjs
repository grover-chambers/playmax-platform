const { createClient } = require("@supabase/supabase-js");

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const admin = createClient(url, key);

  const { data: sups } = await admin.from("analytics_suppliers").select("id, name").ilike("name", "%NICE%");
  console.log("Suppliers matching 'NICE':", sups?.length || 0);
  for (const s of sups || []) console.log(`  ${s.id}: ${s.name}`);

  const { data: sups2 } = await admin.from("analytics_suppliers").select("id, name").ilike("name", "%SUPERMARKET%");
  console.log("\nSuppliers matching 'SUPERMARKET':", sups2?.length || 0);
  for (const s of sups2 || []) console.log(`  ${s.id}: ${s.name}`);

  // Check all suppliers
  const { data: all } = await admin.from("analytics_suppliers").select("id, name");
  console.log(`\nTotal suppliers: ${all?.length || 0}`);
  // Search for anything close
  for (const s of all || []) {
    const lower = s.name.toLowerCase();
    if (lower.includes("nice") || lower.includes("supermarket") || lower.includes("kanini") || lower.includes("retail")) {
      console.log(`  FOUND: ${s.id}: ${s.name}`);
    }
  }
}

main().catch(err => { console.error(err); process.exit(1); });
