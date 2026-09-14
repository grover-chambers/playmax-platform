#!/usr/bin/env node
/**
 * Inspect the most recent analytics uploads in the MAIN Supabase project and
 * profile the ~1000-row "general sales data" month that was uploaded recently.
 *
 * Reads via the service-role key (NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY)
 * so it can also count fact rows (RLS bypass) and join dimensions for a readable
 * report. Dependency-free (Node 18+, uses global fetch).
 *
 * Usage:
 *   node scripts/inspect-analytics-upload.cjs
 *
 * Reads NEXT_PUBLIC_SUPABASE_* / SUPABASE_SERVICE_ROLE_KEY from the environment,
 * falling back to .env / .env.local. Prints a markdown report to <repo>/analytics-upload-report.md
 * (and mirrors it to stdout).
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

const REPORT_PATH = path.resolve(process.cwd(), "analytics-upload-report.md");
const report = [];
const out = (s = "") => { report.push(s); };

async function postgrest(url, key, pathname) {
  const res = await fetch(`${url}/rest/v1/${pathname}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}`, Prefer: "count=exact" },
  });
  let total = null;
  const cr = res.headers.get("content-range") || "";
  const m = cr.match(/\/(\d+)$/);
  if (m) total = Number(m[1]);
  const text = await res.text();
  if (!res.ok) return { error: `${res.status} ${text.slice(0, 200)}`, total: null };
  try { return { data: JSON.parse(text), total }; } catch { return { error: `bad json ${text.slice(0, 200)}`, total: null }; }
}

async function main() {
  const env = loadEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY — set them or use .env/.env.local.");
    process.exit(2);
  }

  out(`# Analytics upload inspection`);
  out();
  out(`Project : ${url.replace(/^https?:\/\//, "")}`);
  out(`Generated : ${new Date().toISOString()}`);
  out();

  // ---- dimension maps ---------------------------------------------------
  const cats = await postgrest(url, key, `analytics_categories?select=id,name`);
  const catMap = new Map((cats.data || []).map((c) => [c.id, c.name]));
  const branches = await postgrest(url, key, `analytics_branches?select=id,name`);
  const branchMap = new Map((branches.data || []).map((b) => [b.id, b.name]));
  const periods = await postgrest(url, key, `analytics_periods?select=id,label,start_date,end_date&order=start_date.desc`);
  const periodMap = new Map((periods.data || []).map((p) => [p.id, p]));

  // ---- recent uploads ---------------------------------------------------
  out(`## Recent uploads`);
  const uploads = await postgrest(url, key, `analytics_staging_uploads?select=*&order=created_at.desc&limit=25`);
  if (uploads.error) {
    out(`Could not read analytics_staging_uploads: ${uploads.error}`);
    console.log(report.join("\n"));
    process.exit(1);
  }
  out();
  out(`| # | file_type | status | rows | period | created_at | filename | uploaded_by |`);
  out(`|---|-----------|--------|------|--------|------------|----------|-------------|`);
  uploads.data.forEach((u, i) => {
    const p = periodMap.get(u.period_id);
    out(`| ${i + 1} | ${u.file_type || "—"} | ${u.status || "—"} | ${u.total_rows ?? "—"} | ${p ? p.label : (u.period_id || "—")} | ${(u.created_at || "").slice(0, 10)} | ${u.filename || "—"} | ${u.uploaded_by || "—"} |`);
  });

  // ---- duplicates --------------------------------------------------------
  const byName = new Map();
  for (const u of uploads.data) {
    const key = `${u.filename || "?"} | ${u.file_type || "?"} | ${u.branch_id || ""}`;
    if (!byName.has(key)) byName.set(key, []);
    byName.get(key).push(u);
  }
  const dups = [...byName.entries()].filter(([, list]) => list.length > 1);
  out();
  out(`## Duplicate uploads`);
  if (dups.length === 0) out("None — every upload is unique by (filename, file_type, branch).");
  dups.forEach(([key, list]) => {
    out();
    out(`- **${key.split(" | ")[0]}** (${key.split(" | ")[1]}) — ${list.length} copies`);
    list.forEach((u) => {
      const p = periodMap.get(u.period_id);
      out(`  - \`${u.id}\` status=${u.status} rows=${u.total_rows ?? "—"} period=${p ? p.label : (u.period_id || "—")} created=${(u.created_at || "").slice(0, 19)}`);
    });
  });

  // ---- locate the general sales upload -----------------------------------
  const approx = uploads.data.filter((u) => ((u.total_rows || 0) >= 500) || /general|sales/i.test(u.filename || ""));
  const target = approx[0] || uploads.data[0];
  out();
  out(`## Target upload (general sales / largest recent)`);
  if (target) {
    const p = periodMap.get(target.period_id);
    out(`- **filename**: ${target.filename}`);
    out(`- **file_type**: ${target.file_type}`);
    out(`- **status**: ${target.status}`);
    out(`- **total_rows**: ${target.total_rows}`);
    out(`- **error_rows**: ${target.error_rows}`);
    out(`- **period**: ${p ? `${p.label} (${p.start_date} → ${p.end_date})` : target.period_id}`);
    out(`- **branch_id**: ${target.branch_id} (${branchMap.get(target.branch_id) || "—"})`);
    out(`- **created_at**: ${target.created_at}`);
    out(`- **uploaded_by**: ${target.uploaded_by}`);
    out(`- **mapped_fields**: \`\`\`json\n${JSON.stringify(target.mapped_fields ?? {}, null, 2)}\n\`\`\``);
    out(`- **metadata**: \`\`\`json\n${JSON.stringify(target.metadata ?? {}, null, 2)}\n\`\`\``);

    const sres = await postgrest(url, key, `analytics_staging_rows?select=row_number,stock_code,product_name,sub_category,unit_cost,unit_price,quantity,weight_tonnes,total_amount,raw_data,mapped_fields,errors&upload_id=eq.${target.id}&order=row_number.asc&limit=5`);
    out();
    out(`### Staging row sample (5 of ${target.total_rows})`);
    if (sres.error) out(`ERR ${sres.error}`);
    else {
      out(`| row | stock_code | product | sub_category | qty | unit_price | total_amount |`);
      out(`|-----|------------|---------|--------------|-----|------------|--------------|`);
      for (const r of sres.data) {
        out(`| ${r.row_number} | ${r.stock_code || "—"} | ${(r.product_name || "—").slice(0, 40)} | ${r.sub_category || "—"} | ${r.quantity ?? "—"} | ${r.unit_price ?? "—"} | ${r.total_amount ?? "—"} |`);
      }
      const n0 = sres.data[0];
      if (n0 && n0.raw_data) out(`\nraw_data[0]: \`\`\`json\n${JSON.stringify(n0.raw_data, null, 2)}\n\`\`\``);
      if (n0 && n0.errors) out(`\nerrors[0]: \`\`\`json\n${JSON.stringify(n0.errors, null, 2)}\n\`\`\``);
    }

    // ---- fact profile by period ------------------------------------------
    if (target.period_id) {
      const pid = target.period_id;
      const factCount = await postgrest(url, key, `analytics_fact_sales?select=id&period_id=eq.${pid}`);
      out();
      out(`### analytics_fact_sales for period ${p ? p.label : pid}`);
      out(`- **fact rows**: ${factCount.total ?? factCount.error}`);
      if (!factCount.error) {
        const byCat = await postgrest(url, key, `analytics_fact_sales?select=category_id,rev:total_amount.sum(),qty:quantity.sum()&period_id=eq.${pid}&group=category_id`);
        out(`\nTotal fact rows for period: **${factCount.total}**`);
        let tRev = 0;
        let tQty = 0;
        out();
        out(`| category | total_amount | quantity |`);
        out(`|----------|--------------|----------|`);
        for (const row of (byCat.data || [])) {
          const rev = Number(row.rev ?? 0);
          const qty = Number(row.qty ?? 0);
          tRev += rev;
          tQty += qty;
          out(`| ${catMap.get(row.category_id) || row.category_id} | ${rev.toLocaleString()} | ${qty.toLocaleString()} |`);
        }
        out(`| **Total** | **${tRev.toLocaleString()}** | **${tQty.toLocaleString()}** |`);
        if (byCat.error) out(`agg err: ${byCat.error}`);
      }
    }
  } else {
    out("No uploads found.");
  }

  fs.writeFileSync(REPORT_PATH, report.join("\n"));
  console.log(report.join("\n"));
  console.log(`\nReport written to ${REPORT_PATH}`);
}

main().catch((e) => { console.error(e); process.exit(1); });