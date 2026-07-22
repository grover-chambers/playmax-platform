#!/usr/bin/env node
/**
 * Comprehensive end-to-end analytics test.
 *
 * Prerequisites:
 *   1. `npm run dev` running on http://localhost:3000
 *   2. Supabase project accessible with seeded data
 *
 * Usage:
 *   node scripts/test-analytics.mjs
 *
 * Exits with code 0 if all tests pass, 1 if any fail.
 */

const BASE = "http://localhost:3000";
let passed = 0;
let failed = 0;
let cookies = "";

function assert(condition, label) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${label}`);
  } else {
    failed++;
    console.error(`  ✗ ${label}`);
  }
}

async function api(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      Cookie: cookies,
      ...options.headers,
    },
    ...options,
  });
  // Capture set-cookie for auth
  const setCookie = res.headers.get("set-cookie");
  if (setCookie) cookies = setCookie;
  const body = res.status === 204 ? null : await res.json().catch(() => null);
  return { status: res.status, body };
}

/* ── 1. Demo login ─────────────────────────────────────── */
async function testAuth() {
  console.log("\n═══ 1. Auth ───────────────────────────────────");

  // Login as super admin
  const r = await api("/api/auth/demo-login", {
    method: "POST",
    body: JSON.stringify({ role: "super_admin" }),
  });
  assert(r.status === 200 && r.body?.user?.role === "super_admin",
    "demo-login as super_admin returns 200 with correct role");
  assert(r.body?.session?.access_token, "session token present");
  console.log(`  session: ${r.body?.user?.email || "—"}`);
}

/* ── 2. Analytics query: all 7 old-style types ─────────── */
async function testAnalyticsQueryTypes() {
  console.log("\n═══ 2. Analytics query — old-style types ──────");

  const types = [
    "market_share",
    "category_performance",
    "competitor_comparison",
    "inventory_summary",
    "pricing_analysis",
    "stock_movements",
    "supplier_performance",
  ];

  for (const type of types) {
    const r = await api("/api/analytics/query", {
      method: "POST",
      body: JSON.stringify({ type }),
    });
    assert(r.status === 200, `${type} → 200`);
    if (r.body && typeof r.body === "object") {
      const hasData = Object.values(r.body).some(v =>
        Array.isArray(v) ? v.length > 0 : typeof v === "object" && v !== null
      );
      assert(hasData, `${type} → returns non-empty data`);
    } else {
      assert(false, `${type} → body is an object`);
    }
  }
}

/* ── 3. Analytics query: subtype dispatch (one per category) ── */
async function testAnalyticsSubtypes() {
  console.log("\n═══ 3. Analytics query — subtype dispatch ──────");

  const subtypes = [
    "cat_market_share_donut",
    "cat_revenue_leaderboard",
    "h2h_supplier",
    "supply_demand_gap",
    "price_distribution",
    "product_velocity",
    "supplier_scorecard",
  ];

  for (const subtype of subtypes) {
    const r = await api("/api/analytics/query", {
      method: "POST",
      body: JSON.stringify({ subtype }),
    });
    assert(r.status === 200, `${subtype} → 200`);
    assert(r.body?.chart_type, `${subtype} → has chart_type`);
    assert(Array.isArray(r.body?.data), `${subtype} → data is array`);
  }
}

/* ── 4. Analytics query: with filters ──────────────────── */
async function testAnalyticsWithFilters() {
  console.log("\n═══ 4. Analytics query — with filters ──────────");

  const r = await api("/api/analytics/query", {
    method: "POST",
    body: JSON.stringify({
      type: "market_share",
      category: "MAIZE FLOUR",
      branch: "Nakuru",
    }),
  });
  assert(r.status === 200, "market_share with category+branch → 200");
}

/* ── 5. Portal analytics ───────────────────────────────── */
async function testPortalAnalytics() {
  console.log("\n═══ 5. Portal analytics ────────────────────────");

  // Login as nice_client
  const login = await api("/api/auth/demo-login", {
    method: "POST",
    body: JSON.stringify({ role: "nice_client" }),
  });
  assert(login.status === 200, "nice_client login → 200");

  const r = await api("/api/portal/analytics");
  assert(r.status === 200, "portal/analytics → 200");
  if (r.status === 200) {
    assert(Array.isArray(r.body?.sales), "sales is array");
    assert(Array.isArray(r.body?.categories), "categories is array");
    assert(Array.isArray(r.body?.competitors), "competitors is array");
    assert(Array.isArray(r.body?.pricing), "pricing is array");
    assert(typeof r.body?.summary?.totalSales === "number", "summary.totalSales is number");

    // Verify embedded objects have correct shape (not arrays)
    if (r.body.sales.length > 0) {
      const s = r.body.sales[0];
      assert(typeof s.product?.name === "string", "sales[0].product.name is string (not array)");
      assert(typeof s.branch?.name === "string", "sales[0].branch.name is string (not array)");
      assert(typeof s.category?.name === "string", "sales[0].category.name is string (not array)");
    }

    // Verify margin calc is correct (margin, not markup)
    if (r.body.pricing.length > 0) {
      const p = r.body.pricing[0];
      const expectedMargin = p.standard_cost && p.selling_price
        ? ((p.selling_price - p.standard_cost) / p.selling_price) * 100
        : 0;
      assert(Math.abs(p.margin_pct - expectedMargin) < 0.01,
        `pricing margin correct (got ${p.margin_pct.toFixed(2)}%)`);
    }
  }
}

/* ── 6. Clients endpoint ───────────────────────────────── */
async function testClientsEndpoint() {
  console.log("\n═══ 6. Analytics clients ───────────────────────");

  // Re-login as admin
  await api("/api/auth/demo-login", {
    method: "POST",
    body: JSON.stringify({ role: "super_admin" }),
  });

  const r = await api("/api/analytics/clients");
  assert(r.status === 200, "clients → 200");
  assert(Array.isArray(r.body), "clients body is array");
  if (r.body.length > 0) {
    assert(typeof r.body[0].id === "string", "client has id");
    assert(typeof r.body[0].company === "string" || typeof r.body[0].name === "string",
      "client has company or name");
  }
}

/* ── 7. All 34 subtypes validate dispatch ───────────────── */
async function testAll34Subtypes() {
  console.log("\n═══ 7. All 34 subtypes ─────────────────────────");

  const all34 = [
    "cat_market_share_donut", "supplier_dominance", "sku_share_breakdown",
    "share_trend_mom", "competitive_share_shift",
    "cat_revenue_leaderboard", "cat_growth_matrix", "subcategory_drilldown",
    "top_skus_per_category", "cat_volume_vs_revenue", "cat_seasonality",
    "h2h_supplier", "price_gap", "competitive_displacement",
    "similar_product_matrix", "competitor_volume_ratio",
    "supply_demand_gap", "stock_shortage_alerts", "overstock_risk",
    "inventory_health_gauge", "reorder_recommendations",
    "price_distribution", "margin_heatmap", "price_vs_volume",
    "price_change_tracker", "economy_vs_premium",
    "product_velocity", "trend_direction", "weekly_movement",
    "movement_by_branch_heatmap",
    "supplier_scorecard", "supplier_revenue_timeline",
    "supplier_portfolio", "top_suppliers_by_branch",
  ];

  for (const subtype of all34) {
    const r = await api("/api/analytics/query", {
      method: "POST",
      body: JSON.stringify({ subtype }),
    });
    assert(r.status === 200, `${subtype} → 200`);
    assert(!r.body?.error, `${subtype} → no error: ${r.body?.error || ""}`);
    if (r.body?.chart_type) {
      assert(["doughnut","bar","bar_h","bar_grouped","bar_div","line","line_multi","scatter","radar","heatmap","table","table_bar","table_trend","table_flag","area_stack"]
        .includes(r.body.chart_type), `${subtype} → valid chart_type: ${r.body.chart_type}`);
    }
  }
}

/* ── Main ───────────────────────────────────────────────── */
async function main() {
  console.log("Analytics Engine — Comprehensive Test Suite\n");
  console.log(`Testing against: ${BASE}`);
  console.log("Ensure `npm run dev` is running before proceeding.\n");

  const suites = [
    testAuth,
    testClientsEndpoint,
    testAnalyticsQueryTypes,
    testAnalyticsSubtypes,
    testAnalyticsWithFilters,
    testAll34Subtypes,
    testPortalAnalytics,
  ];

  for (const suite of suites) {
    try {
      await suite();
    } catch (err) {
      console.error(`  ✗ suite threw: ${err.message}`);
      failed++;
    }
  }

  const total = passed + failed;
  console.log(`\n══════════════════════════════════════════════`);
  console.log(`  ${passed}/${total} passed, ${failed} failed`);
  console.log(`══════════════════════════════════════════════\n`);

  process.exit(failed > 0 ? 1 : 0);
}

main();
