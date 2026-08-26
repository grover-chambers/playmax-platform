const { Client } = require("pg");
const fs = require("fs");

async function main() {
  const ref = "visycgzuszhgvtmqfnbx";
  const region = "eu-west-1";  // typical Supabase region, adjust if needed
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // Try direct connection with service role key as password
  const connStr = `postgresql://postgres.${ref}:${encodeURIComponent(key)}@db.${ref}.supabase.co:5432/postgres`;

  const client = new Client({ connectionString: connStr, ssl: { rejectUnauthorized: false } });
  await client.connect();
  console.log("Connected!");

  const sql = fs.readFileSync("supabase/migrations/043_client_analytics_rls.sql", "utf8");
  await client.query(sql);
  console.log("Migration applied successfully!");

  // Verify
  const { rows } = await client.query(`
    SELECT schemaname, tablename, policyname, cmd
    FROM pg_policies
    WHERE tablename IN ('analytics_fact_sales','analytics_suppliers','analytics_products')
    AND roles @> '{authenticated}'
    ORDER BY tablename, policyname
  `);
  for (const r of rows) {
    console.log(`  ${r.tablename}: ${r.policyname} (${r.cmd})`);
  }

  await client.end();
}

main().catch(err => { console.error(err); process.exit(1); });
