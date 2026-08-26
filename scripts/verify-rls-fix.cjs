const { Client } = require("pg");

async function main() {
  const ref = "visycgzuszhgvtmqfnbx";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const connStr = `postgresql://postgres.${ref}:${encodeURIComponent(key)}@db.${ref}.supabase.co:5432/postgres`;
  const client = new Client({ connectionString: connStr, ssl: { rejectUnauthorized: false } });
  await client.connect();

  // Verify policies
  const { rows } = await client.query(`
    SELECT schemaname, tablename, policyname, cmd, roles
    FROM pg_policies
    WHERE tablename LIKE 'analytics_%' AND 'authenticated' = ANY(roles)
    ORDER BY tablename, policyname
  `);
  console.log("Client policies on analytics tables:");
  for (const r of rows) {
    console.log(`  ${r.tablename}: ${r.policyname} (${r.cmd})`);
  }
  console.log(`Total: ${rows.length} policies`);

  await client.end();
}

main().catch(err => { console.error(err.message); process.exit(1); });
