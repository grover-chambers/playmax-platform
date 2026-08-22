import { readFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const migrationsDir = join(root, "supabase", "migrations");
const files = readdirSync(migrationsDir).filter(f => f.endsWith(".sql")).sort();

async function trySqlEndpoint(sql) {
  // Try various endpoints
  const endpoints = [
    { url: `${supabaseUrl}/auth/v1/sql`, label: "auth/v1/sql" },
  ];

  for (const ep of endpoints) {
    try {
      const resp = await fetch(ep.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify({ query: sql }),
      });
      if (resp.ok) return true;
      const text = await resp.text();
      console.log(`  ${ep.label}: ${resp.status} ${text.substring(0, 100)}`);
    } catch (e) {
      console.log(`  ${ep.label}: ${e.message}`);
    }
  }
  return false;
}

async function main() {
  console.log(`Supabase URL: ${supabaseUrl}`);
  console.log(`Migrations found: ${files.length}`);

  // Try a simple test query first
  console.log("\nTesting SQL execution...");
  const canExec = await trySqlEndpoint("SELECT 1");
  if (!canExec) {
    console.log("\n⚠️  Cannot auto-apply migrations. Auto-apply requires either:");
    console.log("  1. Supabase Management API PAT (set SUPABASE_ACCESS_TOKEN)");
    console.log("  2. Direct DB connection string (use --db-url with supabase db push)");
    console.log("\n📋 Generate migration SQL files for manual application...");

    // Output the SQL for all pending migrations
    console.log("\n=== MIGRATION SQL (apply via Supabase Dashboard SQL Editor) ===\n");
    console.log("Open: https://supabase.com/dashboard/project/$SUPABASE_PROJECT_REF/sql/new\n");

    for (const f of files.filter(f => parseInt(f) >= 17)) {
      const sql = readFileSync(join(migrationsDir, f), "utf-8");
      console.log(`-- ═══ ${f} ═══`);
      console.log(sql);
      console.log("");
    }

    // Also write to a file
    const outPath = join(root, "pending_migrations.sql");
    const buffer = files
      .filter(f => parseInt(f) >= 17)
      .map(f => `-- ═══ ${f} ═══\n${readFileSync(join(migrationsDir, f), "utf-8")}`)
      .join("\n\n");
    writeFileSync(outPath, buffer, "utf-8");
    console.log(`\n📁 Combined SQL written to: ${outPath}`);
    process.exit(0);
  }

  // Apply migrations
  for (const file of files) {
    if (parseInt(file) < 17) continue;
    const sql = readFileSync(join(migrationsDir, file), "utf-8");
    console.log(`Applying ${file}...`);
    const ok = await trySqlEndpoint(sql);
    console.log(ok ? `  ✅ Applied` : `  ❌ Failed`);
  }

  console.log("\nDone.");
}

import { writeFileSync } from "fs";
main().catch(console.error);
