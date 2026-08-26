const { createClient } = require("@supabase/supabase-js");

async function main() {
  // We can't directly verify RLS policies via the Data API, but we can
  // check that the analytics tables respond to SELECT via the anon key
  // This simulates what the portal user experiences
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZpc3ljZ3p1c3poZ3Z0bXFmbmJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxMjU2NjYsImV4cCI6MjA5ODcwMTY2Nn0.SG4Qh9g2TOBx3V3v5nGdRJ3rXn5LOkQx1UT2JSLJmeo";

  // Test 1: Anonymous should NOT be able to read analytics_fact_sales
  const anon = createClient(url, anonKey);
  const { data: s1, error: e1 } = await anon.from("analytics_fact_sales").select("id").limit(1);
  console.log(`Anonymous SELECT analytics_fact_sales: rows=${s1?.length || 0}, error=${e1?.message || "none"}`);

  // Test 2: Service role CAN read (baseline)
  const svcKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const admin = createClient(url, svcKey);
  const { data: s2, error: e2 } = await admin.from("analytics_fact_sales").select("id").limit(1);
  console.log(`Service role SELECT analytics_fact_sales: rows=${s2?.length || 0}, error=${e2?.message || "none"}`);

  // Test 3: Use the NICE portal auth (simulate client flow)
  // We need a user JWT - let's try to use the service key with explicit query
  // to simulate what the API does
  const { data: sharing } = await admin
    .from("portal_analytics_sharing")
    .select("period_id, branch_id, category_id")
    .eq("client_id", "e2f9301b-e1ea-4026-886f-7f44e55770b5")
    .eq("visible", true)
    .limit(1);
  console.log(`\nSharing accessible via admin: ${sharing?.length || 0} (should be 55)`);

  // Now try with a query that mirrors what the analytics API does  
  // but using the service role (simulating what the fixed policies enable)
  const { count } = await admin
    .from("analytics_fact_sales")
    .select("*", { count: "exact", head: true })
    .in("period_id", ["5a66f026-6ba8-4526-9c5d-90421c49ce09", "80b44d71-d6eb-4def-b258-7d75c2bb71b0", "81b11de0-202f-4b06-a5d1-51675fe4ac67", "dbd683e5-9a06-4a70-9ffc-b0eb81a967c7", "f4722f44-7fd6-47ae-878c-72e48f06fece"]);
  console.log(`Sales count for NICE periods: ${count}`);
}

main().catch(err => { console.error(err.message); process.exit(1); });
