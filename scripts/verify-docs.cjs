const { createClient } = require("@supabase/supabase-js");

const NICE_CLIENT_ID = "e2f9301b-e1ea-4026-886f-7f44e55770b5";

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const admin = createClient(url, key);

  // Check documents
  const { data: docs } = await admin
    .from("documents")
    .select("id, name, type, visible_to_client, created_at")
    .eq("client_id", NICE_CLIENT_ID)
    .eq("visible_to_client", true)
    .order("created_at", { ascending: false });
  console.log(`Documents (visible=true): ${docs?.length || 0}`);
  for (const d of docs || []) console.log(`  ${d.name} (${d.type}) visible=${d.visible_to_client}`);

  // Check if they'd appear in deliverables query
  const { data: projects } = await admin.from("projects").select("id").eq("client_id", NICE_CLIENT_ID);
  const projectIds = (projects || []).map(p => p.id);
  console.log(`\nClient projects: ${projectIds.length}`);

  const docFilter = projectIds.length > 0
    ? `client_id.eq.${NICE_CLIENT_ID},project_id.in.(${projectIds.join(",")})`
    : `client_id.eq.${NICE_CLIENT_ID}`;
  const { data: matching } = await admin
    .from("documents")
    .select("id, name")
    .eq("visible_to_client", true)
    .or(docFilter);
  console.log(`\nMatching via deliverables query: ${matching?.length || 0}`);
  for (const d of matching || []) console.log(`  ${d.id.slice(0,8)}: ${d.name}`);
}

main().catch(err => { console.error(err); process.exit(1); });
