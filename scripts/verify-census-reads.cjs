#!/usr/bin/env node
/**
 * Verify why field data is (not) visible on the super-admin field dashboard.
 *
 * The dashboard reads the CENSUS project (zsprlozgdxzxeevvetmg) as
 * CENSUS_PORTAL_EMAIL via ROPG (src/lib/supabase/census.ts). Every read is
 * subject to the census project's RLS, so if that account lacks the right
 * role in app_metadata, ALL reads silently return []. Field writes bypass
 * RLS (sync-push uses the service role) — which is why data can exist in
 * the DB yet not appear on the dashboard.
 *
 * Dependency-free (Node 18+). One run answers:
 *   1. Does the portal login succeed (same call census.ts makes)?
 *   2. What role is in that account's JWT app_metadata?
 *   3. How many rows can the PORTAL see per table (RLS applied)?
 *   4. How many rows does the SERVICE KEY see (RLS bypassed)? (optional)
 *
 * Usage:
 *   node scripts/verify-census-reads.cjs
 *
 * Reads CENSUS_* from the environment, falling back to .env / .env.local.
 * Optional SUPABASE_SERVICE_ROLE_KEY enables the bypass counts — but that
 * key must be the CENSUS project's service key to be meaningful.
 */
const fs = require("fs");
const path = require("path");

function loadEnv() {
  const env = { ...process.env };
  for (const file of [".env", ".env.local"]) {
    const p = path.resolve(process.cwd(), file);
    if (!fs.existsSync(p)) continue;
    for (const line of fs.readFileSync(p, "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)=(.*)\s*$/);
      if (!m) continue;
      const val = m[2].replace(/^["']|["']$/g, "");
      if (!env[m[1]]) env[m[1]] = val;
    }
  }
  return env;
}

function decodeJwt(token) {
  try {
    const body = JSON.parse(
      Buffer.from(token.split(".")[1], "base64url").toString("utf8"),
    );
    return {
      role: body.role,
      email: body.email,
      app_metadata_role: body.app_metadata && body.app_metadata.role,
      is_super_admin: body.is_super_admin,
    };
  } catch {
    return { note: "could not decode JWT" };
  }
}

const TABLES = [
  "reps",
  "outlets",
  "retailers",
  "visits",
  "consumer_intercepts",
  "census_batches",
  "rep_locations",
  "daily_submissions",
];

async function countWith(url, key, bearer, table) {
  // PostgREST exact count via HEAD + Content-Range. Row data is not fetched.
  const res = await fetch(`${url}/rest/v1/${table}?select=id`, {
    method: "HEAD",
    headers: {
      apikey: key,
      Authorization: `Bearer ${bearer}`,
      Range: "0-0",
      Prefer: "count=exact",
    },
  });
  if (res.status === 401 || res.status === 403) {
    return `DENIED(${res.status})`;
  }
  if (res.status === 404) return "no table/RLS blocked";
  if (res.status >= 400) {
    return `ERR ${res.status} ${(await res.text()).slice(0, 80)}`;
  }
  const cr = res.headers.get("content-range") || "";
  const m = cr.match(/\/(\d+)$/);
  return m ? Number(m[1]) : `unparsed(${cr})`;
}

async function main() {
  const env = loadEnv();
  const url = env.CENSUS_SUPABASE_URL;
  const anon = env.CENSUS_SUPABASE_ANON_KEY;
  const email = env.CENSUS_PORTAL_EMAIL;
  const password = env.CENSUS_PORTAL_PASSWORD;
  const svc = env.SUPABASE_SERVICE_ROLE_KEY;

  const missing = Object.entries({
    CENSUS_SUPABASE_URL: url,
    CENSUS_SUPABASE_ANON_KEY: anon,
    CENSUS_PORTAL_EMAIL: email,
    CENSUS_PORTAL_PASSWORD: password,
  }).filter(([, v]) => !v);
  if (missing.length) {
    console.error(
      "Missing required env vars: " + missing.map(([k]) => k).join(", ") +
      "\nSet them in the environment or pass CENSUS_* in .env / .env.local.",
    );
    process.exit(2);
  }

  console.log(`Census project : ${url.replace(/^https?:\/\//, "")}`);
  console.log(`Reading as     : ${email}\n`);

  // 1) Login exactly like src/lib/supabase/census.ts
  const res = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: anon, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    console.error(`CENSUS LOGIN FAILED (${res.status}) — check CENSUS_PORTAL_EMAIL/PASSWORD or ROPG enabled:`);
    console.error((await res.text()).slice(0, 300));
    process.exit(1);
  }
  const { access_token } = await res.json();
  console.log("CENSUS LOGIN OK");
  console.log("Portal JWT     :", JSON.stringify(decodeJwt(access_token)), "\n");

  console.log("table                    portal(RLS)   svc(bypass)");
  console.log("--------------------------------------------------");
  for (const t of TABLES) {
    const portalCount = await countWith(url, anon, access_token, t);
    const svcCount = svc
      ? await countWith(url, svc, svc, t)
      : "n/a (no svc key)";
    console.log(t.padEnd(24) + String(portalCount).padStart(12) + String(svcCount).padStart(13));
  }

  console.log("\nInterpretation:");
  console.log("  - portal > 0 everywhere        -> reads fine; problem is upstream (env, deploy, auth 403)");
  console.log("  - portal = 0 but svc > 0       -> RLS hides data from the portal account.");
  console.log("    Fix: set app_metadata.role = 'super_admin' on the portal account in the CENSUS project,");
  console.log("    or add an explicit SECURITY DEFINER read path for the service account.");
  console.log("  - DENIED/ERR / login failed    -> env or project config problem.");
  console.log("  NOTE: svc column is only meaningful if the key belongs to the CENSUS project.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});