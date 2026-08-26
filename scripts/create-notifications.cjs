const { createClient } = require("@supabase/supabase-js");

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const admin = createClient(url, key);
  const NICE_CLIENT_ID = "e2f9301b-e1ea-4026-886f-7f44e55770b5";

  // Get existing documents for NICE
  const { data: docs } = await admin
    .from("documents")
    .select("id, name, created_at")
    .eq("client_id", NICE_CLIENT_ID)
    .eq("visible_to_client", true)
    .order("created_at", { ascending: false });

  if (!docs || docs.length === 0) { console.log("No documents found"); return; }
  console.log(`Found ${docs.length} documents`);

  // Create notifications
  const notifications = docs.map((d) => ({
    client_id: NICE_CLIENT_ID,
    user_id: null,
    type: "deliverable",
    title: "New report available",
    message: d.name,
    link: "/portal/deliverables",
    read: false,
  }));

  const { data: ins, error } = await admin.from("notifications").insert(notifications).select();
  if (error) {
    console.error("Insert error:", error.message);
    return;
  }
  console.log(`Created ${ins?.length || 0} notifications`);
  for (const n of ins || []) console.log(`  ${n.id.slice(0,8)}: ${n.title} — ${n.message}`);
}

main().catch(err => { console.error(err); process.exit(1); });
