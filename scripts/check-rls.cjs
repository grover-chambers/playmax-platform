const { createClient } = require("@supabase/supabase-js");

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const admin = createClient(url, key);

  // Use raw fetch to query pg_policies
  const res = await fetch(`${url}/rest/v1/rpc/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": key,
      "Authorization": `Bearer ${key}`,
    },
    body: JSON.stringify({})
  });
  // This won't work if there's no rpc function... Let me try direct sql via the management API

  // Instead, let me just simulate the portal flow by fetching using anon key with a test
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!anonKey) {
    console.log("No anon key - trying .env.local");
    const envContent = require("fs").readFileSync(".env.local", "utf8");
    const match = envContent.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.+)/);
    if (!match) { console.log("ANON_KEY not found in .env.local"); return; }
    const anon = match[1].trim();
    
    // Try to query as anonymous user
    const testRes = await fetch(`${url}/rest/v1/portal_analytics_sharing?select=id&limit=1`, {
      headers: {
        "apikey": anon,
        "Authorization": `Bearer ${anon}`,
      }
    });
    console.log(`Anonymous query status: ${testRes.status}`);
    const text = await testRes.text();
    console.log(`Response: ${text.slice(0, 200)}`);
    
    // Now try with service key
    const svcRes = await fetch(`${url}/rest/v1/portal_analytics_sharing?select=id&limit=1`, {
      headers: {
        "apikey": key,
        "Authorization": `Bearer ${key}`,
      }
    });
    console.log(`\nService key query status: ${svcRes.status}`);
    const svcText = await svcRes.text();
    console.log(`Response: ${svcText.slice(0, 200)}`);
  }
}

main().catch(err => { console.error(err.message); process.exit(1); });
