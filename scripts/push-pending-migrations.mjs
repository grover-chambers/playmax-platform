#!/usr/bin/env node
/**
 * Push pending migrations to the hosted Supabase project via the
 * Management API (the same backend `supabase db push` uses), but
 * STATE-AWARE and SAFE:
 *
 *   - It never replays the full 001-0xx history (those were applied
 *     manually in the Dashboard, so the CLI's schema_migrations table
 *     does not reflect reality — a blind `db push` could DROP/rebuild
 *     data tables).
 *   - Each pending migration only runs if its sentinel object is missing.
 *   - Defaults to PLAN mode; pass --apply to actually execute.
 *
 * Usage:
 *   SUPABASE_ACCESS_TOKEN=sbp_... SUPABASE_PROJECT_REF=... \
 *     node scripts/push-pending-migrations.mjs [--apply] [--verbose]
 *
 * Token: https://supabase.com/dashboard/account/tokens
 * Project ref defaults to visycgzuszhgvtmqfnbx (from run_migrations.py).
 */

import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const MIGRATIONS_DIR = join(ROOT, "supabase", "migrations");

const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const PROJECT_REF = process.env.SUPABASE_PROJECT_REF || "visycgzuszhgvtmqfnbx";
const APPLY = process.argv.includes("--apply");
const VERBOSE = process.argv.includes("--verbose");

if (!TOKEN) {
  console.error(
    "Missing SUPABASE_ACCESS_TOKEN (a Supabase Personal Access Token, sbp_...).\n" +
      "Create one at https://supabase.com/dashboard/account/tokens",
  );
  process.exit(2);
}

/**
 * Sentinel per migration: only run the file when this object is missing.
 *   table:<name>        -> to_regclass(...) is null
 *   function:<signature> -> to_regprocedure(...) is null
 *   always               -> always run (idempotent by construction)
 */
const PENDING = [
  { file: "058_create_missing_tables.sql", sentinel: "table:public.cms_content" },
  { file: "050_roles_to_app_metadata.sql", sentinel: "always" },
  { file: "052_rls_hardening.sql", sentinel: "function:public.auth_client_ids()" },
  { file: "053_api_rate_limits.sql", sentinel: "table:public.api_rate_limits" },
  { file: "054_webhook_events.sql", sentinel: "table:public.webhook_events" },
  { file: "055_report_generation_locks.sql", sentinel: "table:public.report_generation_locks" },
  { file: "056_client_scope_rls_fixes.sql", sentinel: "function:public.user_client_ids(uuid)" },
  { file: "057_grant_auth_users_select.sql", sentinel: "privilege:authenticated|auth.users|SELECT" },
];

function sentinelAlias(sentinel) {
  if (sentinel === "always") return "always";
  if (sentinel.startsWith("privilege:")) return "granted_" + sentinel.slice("privilege:".length).split("|")[2].toLowerCase();
  const [kind, name] = sentinel.split(":");
  return kind === "table" ? "tbl_" + name.replace(/[^a-z_]/g, "_") : "fn_" + name.replace(/[^a-z_]/g, "_");
}

function sentinelPresent(sentinel, state) {
  if (sentinel === "always") return true;
  return Boolean(state[sentinelAlias(sentinel)]);
}

async function runSQL(query) {
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
    },
  );
  const text = await res.text();
  if (!res.ok) {
    let detail = text;
    try {
      detail = JSON.parse(text).message || text;
    } catch {}
    throw new Error(`HTTP ${res.status}: ${detail.slice(0, 500)}`);
  }
  return text ? JSON.parse(text) : [];
}

async function checkState() {
  const sentinelExprs = PENDING.map(({ sentinel }) => {
    if (sentinel === "always") return "NULL AS always";
    if (sentinel.startsWith("privilege:")) {
      const [role, table, priv] = sentinel.slice("privilege:".length).split("|");
      return `has_table_privilege('${role}', '${table}', '${priv}') AS ${sentinelAlias(sentinel)}`;
    }
    const [kind, name] = sentinel.split(":");
    if (kind === "table") return `to_regclass('${name}') AS ${sentinelAlias(sentinel)}`;
    if (kind === "function") return `to_regprocedure('${name}') AS ${sentinelAlias(sentinel)}`;
    return "NULL AS unknown";
  });
  const rows = await runSQL(`SELECT ${sentinelExprs.join(", ")};`);
  return rows[0] || {};
}

console.log(`Project: ${PROJECT_REF}`);
console.log(`Mode: ${APPLY ? "APPLY" : "PLAN"} (use --apply to execute)\n`);

const state = await checkState();
console.log("Live DB state:");
for (const { file, sentinel } of PENDING) {
  const name = file.replace(/^\d+_/, "").replace(/\.sql$/, "");
  const present = sentinelPresent(sentinel, state);
  console.log(`  ${present ? "✓ applied" : "✗ missing"}  ${name}${sentinel !== "always" ? `  (sentinel: ${sentinel.split(":")[1]})` : "  (idempotent, re-run ok)"}`);
}

console.log("\nPlan:");
let willRun = [];
for (const { file, sentinel } of PENDING) {
  const name = file.replace(/^\d+_/, "").replace(/\.sql$/, "");
  const present = sentinelPresent(sentinel, state);
  if (present) {
    console.log(`  SKIP  ${name}`);
    continue;
  }
  willRun.push(file);
  console.log(`  RUN   ${name}`);
}

if (willRun.length === 0) {
  console.log("\nNothing to run — all pending migrations already applied.");
  process.exit(0);
}

if (!APPLY) {
  console.log("\nDry run — pass --apply to execute the above migrations.");
  process.exit(0);
}

for (const file of willRun) {
  const path = join(MIGRATIONS_DIR, file);
  const sql = readFileSync(path, "utf8");
  console.log(`\n>>> Applying ${file} ...`);
  try {
    const rows = await runSQL(sql);
    console.log(`    OK${rows && rows.length ? ` (${rows.length} row(s) returned)` : ""}`);
  } catch (err) {
    console.error(`    FAILED: ${err.message}`);
    process.exit(1);
  }
}

console.log("\nPost-check:");
const post = await checkState();
for (const { file, sentinel } of PENDING) {
  if (sentinel === "always") continue;
  const present = sentinelPresent(sentinel, post);
  console.log(`  ${present ? "✓" : "✗ MISSING (FAILED)"}  ${sentinel.split(":")[1]}`);
}
