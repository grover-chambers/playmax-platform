import type { SupabaseClient } from "@supabase/supabase-js";
import { query, queryOne, queryMany } from "./db";

/* ── Migration 046 verified ─────────────────────────────────── */
// Migration 046 (046_fix_inventory_schema_and_worker.sql) was verified:
// - Restores supplier_id, sub_category_id, and 3 indexes on analytics_fact_inventory
// - Adds source_job_id unique constraint on reports for idempotent ETL inserts
// - Adds claim_job() RPC for atomic worker job claiming
// - Adds append_report_to_project() RPC for atomic metadata append

/* ── Core pattern ───────────────────────────────────────────── */

const FALLBACK_TIMEOUT_MS = 5_000;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`[pg-fallback] ${label} timed out after ${ms}ms`)), ms),
    ),
  ]);
}

export async function withPgFallback<T>(
  supabaseOp: () => Promise<T>,
  pgOp: () => Promise<T>,
  label?: string,
): Promise<T> {
  try {
    return await supabaseOp();
  } catch (err) {
    // If DATABASE_URL is not set, don't even try PG — just rethrow Supabase error
    if (!process.env.DATABASE_URL) {
      console.error(
        `[pg-fallback] Supabase failed${label ? ` (${label})` : ""} and DATABASE_URL not set:`,
        err instanceof Error ? err.message : err,
      );
      throw err;
    }
    console.error(
      `[pg-fallback] Supabase failed${label ? ` (${label})` : ""}:`,
      err instanceof Error ? err.message : err,
      "— falling back to direct SQL",
    );
    try {
      const result = await withTimeout(pgOp(), FALLBACK_TIMEOUT_MS, label ?? "pg-fallback");
      console.log(
        `[pg-fallback] Direct SQL recovered${label ? ` (${label})` : ""}`,
      );
      return result;
    } catch (fallbackErr) {
      console.error(
        `[pg-fallback] Direct SQL also failed${label ? ` (${label})` : ""}:`,
        fallbackErr instanceof Error ? fallbackErr.message : fallbackErr,
      );
      throw fallbackErr;
    }
  }
}

/* ── Shared lookups ─────────────────────────────────────────── */

export async function getClientByUserId(db: SupabaseClient, userId: string) {
  return withPgFallback(
    async () => {
      const { data, error } = await db
        .from("clients")
        .select("id, name, email, company, industry, phone, status, created_at, notification_prefs, linked_supplier_id, subscription_tier")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    () => queryOne(
      `SELECT id, name, email, company, industry, phone, status, created_at, notification_prefs, linked_supplier_id, subscription_tier
       FROM clients WHERE user_id = $1 LIMIT 1`,
      [userId],
    ),
    "getClientByUserId",
  );
}

export async function getClientById(db: SupabaseClient, clientId: string) {
  return withPgFallback(
    async () => {
      const { data, error } = await db
        .from("clients")
        .select("id, name, company")
        .eq("id", clientId)
        .single();
      if (error) throw error;
      return data;
    },
    () => queryOne(
      `SELECT id, name, company FROM clients WHERE id = $1`,
      [clientId],
    ),
    "getClientById",
  );
}

export async function getSharingRecords(db: SupabaseClient, clientId: string) {
  return withPgFallback(
    async () => {
      const { data, error } = await db
        .from("portal_analytics_sharing")
        .select("period_id, branch_id, category_id")
        .eq("client_id", clientId)
        .eq("visible", true);
      if (error) throw error;
      return data ?? [];
    },
    () => queryMany<{ period_id: string; branch_id: string | null; category_id: string | null }>(
      `SELECT period_id, branch_id, category_id
       FROM portal_analytics_sharing
       WHERE client_id = $1 AND visible = true`,
      [clientId],
    ),
    "getSharingRecords",
  );
}

export async function getSuppliersByIds(db: SupabaseClient, ids: string[]) {
  if (ids.length === 0) return [];
  return withPgFallback(
    async () => {
      const { data, error } = await db
        .from("analytics_suppliers")
        .select("id, name")
        .in("id", ids);
      if (error) throw error;
      return data ?? [];
    },
    () => queryMany<{ id: string; name: string }>(
      `SELECT id, name FROM analytics_suppliers WHERE id = ANY($1)`,
      [ids],
    ),
    "getSuppliersByIds",
  );
}

export async function findSupplierByName(db: SupabaseClient, name: string) {
  return withPgFallback(
    async () => {
      const { data, error } = await db
        .from("analytics_suppliers")
        .select("id, name")
        .ilike("name", name);
      if (error) throw error;
      return data?.[0] ?? null;
    },
    () => queryOne<{ id: string; name: string }>(
      `SELECT id, name FROM analytics_suppliers WHERE name ILIKE $1 LIMIT 1`,
      [name],
    ),
    "findSupplierByName",
  );
}

export async function getCategoriesByIds(db: SupabaseClient, ids: string[]) {
  if (ids.length === 0) return [];
  return withPgFallback(
    async () => {
      const { data, error } = await db
        .from("analytics_categories")
        .select("id, name")
        .in("id", ids);
      if (error) throw error;
      return data ?? [];
    },
    () => queryMany<{ id: string; name: string }>(
      `SELECT id, name FROM analytics_categories WHERE id = ANY($1)`,
      [ids],
    ),
    "getCategoriesByIds",
  );
}

export async function getClientProductCategoryIds(db: SupabaseClient, supplierId: string): Promise<string[]> {
  return withPgFallback(
    async () => {
      const { data: junction, error: junctionErr } = await db
        .from("analytics_supplier_products")
        .select("product_id")
        .eq("supplier_id", supplierId);
      if (junctionErr) throw junctionErr;
      const productIds = (junction ?? []).map((r) => r.product_id);
      let junctionCategoryIds: string[] = [];
      if (productIds.length > 0) {
        const { data: prods, error: prodErr } = await db
          .from("analytics_products")
          .select("category_id")
          .in("id", productIds);
        if (prodErr) throw prodErr;
        junctionCategoryIds = Array.from(
          new Set((prods ?? []).map((p) => p.category_id).filter(Boolean)),
        );
      }
      if (junctionCategoryIds.length > 0) return junctionCategoryIds;

      const { data: sales, error: salesErr } = await db
        .from("analytics_fact_sales")
        .select("category_id")
        .eq("supplier_id", supplierId)
        .not("category_id", "is", null);
      if (salesErr) throw salesErr;
      return Array.from(new Set((sales ?? []).map((r) => r.category_id).filter(Boolean)));
    },
    async () => {
      const junctionRows = await queryMany<{ category_id: string | null }>(
        `SELECT DISTINCT p.category_id
         FROM analytics_supplier_products sp
         JOIN analytics_products p ON p.id = sp.product_id
         WHERE sp.supplier_id = $1 AND p.category_id IS NOT NULL`,
        [supplierId],
      );
      const junctionCategoryIds = junctionRows
        .map((r) => r.category_id)
        .filter((c): c is string => Boolean(c));
      if (junctionCategoryIds.length > 0) return junctionCategoryIds;

      const salesRows = await queryMany<{ category_id: string | null }>(
        `SELECT DISTINCT category_id FROM analytics_fact_sales
         WHERE supplier_id = $1 AND category_id IS NOT NULL`,
        [supplierId],
      );
      return salesRows
        .map((r) => r.category_id)
        .filter((c): c is string => Boolean(c));
    },
    "getClientProductCategoryIds",
  );
}

export async function getClientProfileCategoryIds(db: SupabaseClient, clientId: string): Promise<string[]> {
  return withPgFallback(
    async () => {
      const ids: string[] = [];
      const { data: client, error: clientErr } = await db
        .from("clients")
        .select("category_id")
        .eq("id", clientId)
        .maybeSingle();
      if (clientErr) throw clientErr;
      if (client?.category_id) ids.push(client.category_id);

      const { data: rows, error: rowsErr } = await db
        .from("client_categories")
        .select("category_id")
        .eq("client_id", clientId);
      if (rowsErr) throw rowsErr;
      for (const r of rows ?? []) ids.push(r.category_id);

      return [...new Set(ids.filter(Boolean))];
    },
    async () => {
      const primary = await queryOne<{ category_id: string | null }>(
        `SELECT category_id FROM clients WHERE id = $1`,
        [clientId],
      );
      const rows = await queryMany<{ category_id: string }>(
        `SELECT category_id FROM client_categories WHERE client_id = $1`,
        [clientId],
      );
      const ids = rows.map((r) => r.category_id);
      if (primary?.category_id) ids.push(primary.category_id);
      return [...new Set(ids.filter(Boolean))];
    },
    "getClientProfileCategoryIds",
  );
}

/**
 * Effective category scope for a client: the explicit profile assignment
 * (clients.category_id + client_categories) wins; when none exists, fall back
 * to the supplier product mix so legacy clients keep working.
 */
export async function getClientScopeCategoryIds(db: SupabaseClient, clientId: string, supplierId: string | null): Promise<string[]> {
  const profileIds = await getClientProfileCategoryIds(db, clientId);
  if (profileIds.length > 0) return profileIds;
  return supplierId ? getClientProductCategoryIds(db, supplierId) : [];
}

/* ── Report generation: fetchAllSales with pg fallback ──────── */interface SalesRow {
  id: string;
  quantity: number;
  total_amount: number;
  supplier_id: string | null;
  branch_id: string;
  product_id: string;
}

export async function fetchAllSalesFallback(
  db: SupabaseClient,
  periodIds: string[],
  categoryId: string,
): Promise<SalesRow[]> {
  return withPgFallback(
    async () => {
      const all: { id: string; quantity: number; total_amount: number; supplier_id: string | null; branch_id: string; product_id: string }[] = [];
      const PAGE = 1000;
      let from = 0;
      while (true) {
        const { data } = await db
          .from("analytics_fact_sales")
          .select("id, quantity, total_amount, supplier_id, branch_id, product_id")
          .in("period_id", periodIds)
          .eq("category_id", categoryId)
          .range(from, from + PAGE - 1);
        if (!data || data.length === 0) break;
        all.push(...data);
        from += PAGE;
        if (data.length < PAGE) break;
      }
      return all;
    },
    () => fetchAllSalesPg(periodIds, categoryId),
    "fetchAllSales",
  );
}

export async function fetchAllSalesPg(
  periodIds: string[],
  categoryId: string,
): Promise<SalesRow[]> {
  const { rows } = await query<SalesRow>(
    `SELECT id, quantity, total_amount, supplier_id, branch_id, product_id
     FROM analytics_fact_sales
     WHERE period_id = ANY($1) AND category_id = $2`,
    [periodIds, categoryId],
  );
  return rows;
}

/* ── Portal analytics: fetchAllSales with joins via pg ──────── */

export async function fetchAllSalesWithJoinsFallback(
  db: SupabaseClient,
  periodIds: string[],
  branchIds?: string[],
  categoryIds?: string[],
) {
  return withPgFallback(
    async () => {
      const all: Record<string, unknown>[] = [];
      const PAGE = 1000;
      let from = 0;
      while (true) {
        let q = db
          .from("analytics_fact_sales")
          .select("id, quantity, total_amount, cost_amount, weight_tonnes, unit_price, product_id, branch_id, period_id, category_id, supplier_id, product:analytics_products(name, stock_code), period:analytics_periods(label, year, quarter, month), branch:analytics_branches(name, code), category:analytics_categories(name)")
          .in("period_id", periodIds);
        if (branchIds && branchIds.length > 0) q = q.in("branch_id", branchIds);
        if (categoryIds && categoryIds.length > 0) q = q.in("category_id", categoryIds);
        const { data } = await q.range(from, from + PAGE - 1);
        if (!data || data.length === 0) break;
        all.push(...data);
        from += PAGE;
        if (data.length < PAGE) break;
      }
      return all;
    },
    () => fetchAllSalesWithJoinsPg(periodIds, branchIds, categoryIds),
    "fetchAllSalesWithJoins",
  );
}

export async function fetchAllSalesWithJoinsPg(
  periodIds: string[],
  branchIds?: string[],
  categoryIds?: string[],
): Promise<Record<string, unknown>[]> {
  let sql = `
    SELECT
      s.id, s.quantity, s.total_amount, s.cost_amount, s.weight_tonnes, s.unit_price,
      s.product_id, s.branch_id, s.period_id, s.category_id, s.supplier_id,
      p.name AS product_name, p.stock_code AS product_stock_code,
      pe.label AS period_label, pe.year AS period_year, pe.quarter AS period_quarter, pe.month AS period_month,
      b.name AS branch_name, b.code AS branch_code,
      c.name AS category_name
    FROM analytics_fact_sales s
    LEFT JOIN analytics_products p ON p.id = s.product_id
    LEFT JOIN analytics_periods pe ON pe.id = s.period_id
    LEFT JOIN analytics_branches b ON b.id = s.branch_id
    LEFT JOIN analytics_categories c ON c.id = s.category_id
    WHERE s.period_id = ANY($1)
  `;
  const params: unknown[] = [periodIds];
  let idx = 2;

  if (branchIds && branchIds.length > 0) {
    sql += ` AND s.branch_id = ANY($${idx++})`;
    params.push(branchIds);
  }
  if (categoryIds && categoryIds.length > 0) {
    sql += ` AND s.category_id = ANY($${idx++})`;
    params.push(categoryIds);
  }

  const { rows } = await query(sql, params);
  return rows.map((r: Record<string, unknown>) => ({
    id: r.id,
    quantity: r.quantity,
    total_amount: r.total_amount,
    cost_amount: r.cost_amount,
    weight_tonnes: r.weight_tonnes,
    unit_price: r.unit_price,
    product_id: r.product_id,
    branch_id: r.branch_id,
    period_id: r.period_id,
    category_id: r.category_id,
    supplier_id: r.supplier_id,
    product: { name: r.product_name, stock_code: r.product_stock_code },
    period: { label: r.period_label, year: r.period_year, quarter: r.period_quarter, month: r.period_month },
    branch: { name: r.branch_name, code: r.branch_code },
    category: { name: r.category_name },
  }));
}

/* ── Inventory with joins via pg ────────────────────────────── */

export async function fetchInventoryFallback(db: SupabaseClient, branchIds?: string[], categoryIds?: string[], periodIds?: string[]) {
  return withPgFallback(
    async () => {
      let q = db
        .from("analytics_fact_inventory")
        .select("id, closing_stock, stock_value, product:analytics_products(name, stock_code), branch:analytics_branches(name, code), period:analytics_periods(end_date)");
      if (branchIds && branchIds.length > 0) q = q.in("branch_id", branchIds);
      if (categoryIds && categoryIds.length > 0) q = q.in("category_id", categoryIds);
      if (periodIds && periodIds.length > 0) q = q.in("period_id", periodIds);
      const { data } = await q.order("period_id", { ascending: false }).limit(500);
      return data ?? [];
    },
    () => fetchInventoryPg(branchIds, categoryIds, periodIds),
    "fetchInventory",
  );
}

export async function fetchInventoryPg(branchIds?: string[], categoryIds?: string[], periodIds?: string[]): Promise<Record<string, unknown>[]> {
  let sql = `
    SELECT
      i.id, i.closing_stock, i.stock_value,
      p.name AS product_name, p.stock_code AS product_stock_code,
      b.name AS branch_name, b.code AS branch_code,
      pe.end_date AS period_end_date
    FROM analytics_fact_inventory i
    LEFT JOIN analytics_products p ON p.id = i.product_id
    LEFT JOIN analytics_branches b ON b.id = i.branch_id
    LEFT JOIN analytics_periods pe ON pe.id = i.period_id
  `;
  const params: unknown[] = [];
  const conds: string[] = [];
  let idx = 1;
  if (branchIds && branchIds.length > 0) {
    conds.push(`i.branch_id = ANY($${idx++})`);
    params.push(branchIds);
  }
  if (categoryIds && categoryIds.length > 0) {
    conds.push(`i.category_id = ANY($${idx++})`);
    params.push(categoryIds);
  }
  if (periodIds && periodIds.length > 0) {
    conds.push(`i.period_id = ANY($${idx++})`);
    params.push(periodIds);
  }
  if (conds.length > 0) sql += ` WHERE ${conds.join(" AND ")}`;
  sql += ` ORDER BY i.period_id DESC LIMIT 500`;
  const { rows } = await query(sql, params);
  return rows.map((r: Record<string, unknown>) => ({
    id: r.id,
    closing_stock: r.closing_stock,
    stock_value: r.stock_value,
    product: { name: r.product_name, stock_code: r.product_stock_code },
    branch: { name: r.branch_name, code: r.branch_code },
    period: { end_date: r.period_end_date },
  }));
}

/* ── Pricing with joins via pg ──────────────────────────────── */

export async function fetchPricingFallback(db: SupabaseClient, branchIds?: string[], categoryIds?: string[], periodIds?: string[]) {
  return withPgFallback(
    async () => {
      let q = db
        .from("analytics_fact_pricing")
        .select("id, standard_cost, selling_price, effective_date, product:analytics_products(name, stock_code), branch:analytics_branches(name, code)");
      if (branchIds && branchIds.length > 0) q = q.in("branch_id", branchIds);
      if (categoryIds && categoryIds.length > 0) q = q.in("category_id", categoryIds);
      if (periodIds && periodIds.length > 0) q = q.in("period_id", periodIds);
      const { data } = await q.order("effective_date", { ascending: false }).limit(200);
      return data ?? [];
    },
    () => fetchPricingPg(branchIds, categoryIds, periodIds),
    "fetchPricing",
  );
}

export async function fetchPricingPg(branchIds?: string[], categoryIds?: string[], periodIds?: string[]): Promise<Record<string, unknown>[]> {
  let sql = `
    SELECT
      pr.id, pr.standard_cost, pr.selling_price, pr.effective_date,
      p.name AS product_name, p.stock_code AS product_stock_code,
      b.name AS branch_name, b.code AS branch_code
    FROM analytics_fact_pricing pr
    LEFT JOIN analytics_products p ON p.id = pr.product_id
    LEFT JOIN analytics_branches b ON b.id = pr.branch_id
  `;
  const params: unknown[] = [];
  const conds: string[] = [];
  let idx = 1;
  if (branchIds && branchIds.length > 0) {
    conds.push(`pr.branch_id = ANY($${idx++})`);
    params.push(branchIds);
  }
  if (categoryIds && categoryIds.length > 0) {
    conds.push(`pr.category_id = ANY($${idx++})`);
    params.push(categoryIds);
  }
  if (periodIds && periodIds.length > 0) {
    conds.push(`pr.period_id = ANY($${idx++})`);
    params.push(periodIds);
  }
  if (conds.length > 0) sql += ` WHERE ${conds.join(" AND ")}`;
  sql += ` ORDER BY pr.effective_date DESC LIMIT 200`;
  const { rows } = await query(sql, params);
  return rows.map((r: Record<string, unknown>) => ({
    id: r.id,
    standard_cost: r.standard_cost,
    selling_price: r.selling_price,
    effective_date: r.effective_date,
    product: { name: r.product_name, stock_code: r.product_stock_code },
    branch: { name: r.branch_name, code: r.branch_code },
  }));
}

/* ── Pricing by category (maizze route) via pg ──────────────── */

export async function fetchPricingByCategoryPg(categoryId: string, branchIds?: string[]): Promise<Record<string, unknown>[]> {
  let sql = `
    SELECT
       pr.id, pr.standard_cost, pr.selling_price, pr.effective_date,
       p.name AS product_name, p.stock_code AS product_stock_code,
       b.name AS branch_name, b.code AS branch_code
     FROM analytics_fact_pricing pr
     LEFT JOIN analytics_products p ON p.id = pr.product_id
     LEFT JOIN analytics_branches b ON b.id = pr.branch_id
     WHERE p.category_id = $1`;
  const params: unknown[] = [categoryId];
  if (branchIds && branchIds.length > 0) {
    sql += ` AND pr.branch_id = ANY($2)`;
    params.push(branchIds);
  }
  sql += `
     ORDER BY pr.effective_date DESC
     LIMIT 100`;
  const { rows } = await query(sql, params);
  return rows.map((r: Record<string, unknown>) => ({
    id: r.id,
    standard_cost: r.standard_cost,
    selling_price: r.selling_price,
    effective_date: r.effective_date,
    product: { name: r.product_name, stock_code: r.product_stock_code },
    branch: { name: r.branch_name, code: r.branch_code },
  }));
}

export async function fetchPricingByCategoryFallback(
  db: SupabaseClient,
  categoryId: string,
  branchIds?: string[],
): Promise<Record<string, unknown>[]> {
  return withPgFallback(
    async () => {
      const { data: prods, error: prodErr } = await db
        .from("analytics_products")
        .select("id")
        .eq("category_id", categoryId);
      if (prodErr) throw prodErr;
      const productIds = (prods ?? []).map((p) => p.id);
      if (productIds.length === 0) return [];
      let request = db
        .from("analytics_fact_pricing")
        .select(
          "id, standard_cost, selling_price, effective_date, product:analytics_products(name, stock_code), branch:analytics_branches(name, code)",
        )
        .in("product_id", productIds)
        .order("effective_date", { ascending: false })
        .limit(100);
      if (branchIds && branchIds.length > 0) request = request.in("branch_id", branchIds);
      const { data, error } = await request;
      if (error) throw error;
      return (data ?? []) as Record<string, unknown>[];
    },
    () => fetchPricingByCategoryPg(categoryId, branchIds),
    "fetchPricingByCategory",
  );
}

/* ── Client dashboard color via pg ──────────────────────────── */

export async function getClientColorPg(clientId: string): Promise<string | null> {
  const row = await queryOne<{ dashboard_color: string | null }>(
    `SELECT dashboard_color FROM clients WHERE id = $1`,
    [clientId],
  );
  return row?.dashboard_color ?? null;
}

/* ── Report operations via pg ───────────────────────────────── */

export async function getReportByIdPg(reportId: string) {
  return queryOne(`SELECT * FROM reports WHERE id = $1`, [reportId]);
}

export async function updateReportContentPg(reportId: string, content: string) {
  await query(`UPDATE reports SET content = $1 WHERE id = $2`, [content, reportId]);
}

export async function insertReportPg(data: {
  project_id?: string;
  client_id?: string;
  title: string;
  type: string;
  kind: string;
  content?: string;
  visible_to_client: boolean;
}): Promise<{ id: string } | null> {
  return queryOne(
    `INSERT INTO reports (project_id, client_id, title, type, kind, content, visible_to_client)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
    [data.project_id ?? null, data.client_id ?? null, data.title, data.type, data.kind, data.content ?? null, data.visible_to_client],
  );
}

/* ── Deliverables via pg ────────────────────────────────────── */

export async function getDeliverablesByCategoryPg(clientId: string, categoryName: string): Promise<{ id: string }[]> {
  return queryMany<{ id: string }>(
    `SELECT id FROM deliverables WHERE client_id = $1 AND file_type = 'pdf' AND title LIKE $2`,
    [clientId, `%${categoryName}%`],
  );
}

export async function deleteDeliverablesPg(ids: string[]) {
  if (ids.length === 0) return;
  await query(`DELETE FROM deliverables WHERE id = ANY($1)`, [ids]);
}

export async function insertDeliverablePg(data: {
  project_id?: string;
  client_id: string;
  title: string;
  description?: string;
  file_type: string;
  file_size?: number;
  visible_to_client: boolean;
  approval_status?: string;
  pdf_base64?: string;
}) {
  return queryOne(
    `INSERT INTO deliverables (project_id, client_id, title, description, file_type, file_size, visible_to_client, approval_status, pdf_base64)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING id, title, file_type, file_size, created_at`,
    [
      data.project_id ?? null, data.client_id, data.title, data.description ?? null,
      data.file_type, data.file_size ?? null, data.visible_to_client,
      data.approval_status ?? "pending", data.pdf_base64 ?? null,
    ],
  );
}

/* ── Notifications bulk insert via pg ───────────────────────── */

export async function insertNotificationsPg(notifications: {
  client_id?: string | null;
  user_id?: string | null;
  type: string;
  title: string;
  message: string;
  link?: string | null;
  read?: boolean;
}[]) {
  if (notifications.length === 0) return;
  const values: string[] = [];
  const params: unknown[] = [];
  let idx = 1;
  for (const n of notifications) {
    values.push(`($${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++})`);
    params.push(n.client_id ?? null, n.user_id ?? null, n.type, n.title, n.message, n.link ?? null, n.read ?? false);
  }
  await query(
    `INSERT INTO notifications (client_id, user_id, type, title, message, link, read) VALUES ${values.join(", ")}`,
    params,
  );
}

/* ── Documents insert via pg ────────────────────────────────── */

export async function insertDocumentPg(data: {
  project_id?: string;
  client_id?: string;
  name: string;
  type: string;
  url: string;
  visible_to_client: boolean;
  source_report_id?: string;
}): Promise<{ id: string; name: string } | null> {
  return queryOne(
    `INSERT INTO documents (project_id, client_id, name, type, url, visible_to_client, source_report_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, name`,
    [data.project_id ?? null, data.client_id ?? null, data.name, data.type, data.url, data.visible_to_client, data.source_report_id ?? null],
  );
}

/* ── Categories by name pattern (maizze route) via pg ───────── */

export async function getCategoriesByNamePg(pattern: string): Promise<{ id: string; name: string }[]> {
  const { rows } = await query<{ id: string; name: string }>(
    `SELECT id, name FROM analytics_categories
     WHERE name ILIKE $1 OR name ILIKE $2 OR name ILIKE $3
     LIMIT 5`,
    [`%${pattern}%`, `%maizze%`, `%maize flour%`],
  );
  return rows;
}

/* ── Maizze fact_sales with joins via pg ────────────────────── */

export async function fetchCategorySalesPg(
  periodIds: string[],
  categoryId: string,
  branchIds?: string[],
): Promise<Record<string, unknown>[]> {
  let sql = `
    SELECT
      s.id, s.quantity, s.total_amount, s.cost_amount, s.unit_price,
      s.product_id, s.branch_id, s.period_id, s.supplier_id,
      p.name AS product_name, p.stock_code AS product_stock_code,
      pe.label AS period_label, pe.year AS period_year, pe.quarter AS period_quarter, pe.month AS period_month,
      b.name AS branch_name, b.code AS branch_code
    FROM analytics_fact_sales s
    LEFT JOIN analytics_products p ON p.id = s.product_id
    LEFT JOIN analytics_periods pe ON pe.id = s.period_id
    LEFT JOIN analytics_branches b ON b.id = s.branch_id
    WHERE s.period_id = ANY($1) AND s.category_id = $2
  `;
  const params: unknown[] = [periodIds, categoryId];
  let idx = 3;
  if (branchIds && branchIds.length > 0) {
    sql += ` AND s.branch_id = ANY($${idx++})`;
    params.push(branchIds);
  }
  const { rows } = await query(sql, params);
  return rows.map((r: Record<string, unknown>) => ({
    id: r.id, quantity: r.quantity, total_amount: r.total_amount, cost_amount: r.cost_amount,
    unit_price: r.unit_price, product_id: r.product_id, branch_id: r.branch_id,
    period_id: r.period_id, supplier_id: r.supplier_id,
    product: { name: r.product_name, stock_code: r.product_stock_code },
    period: { label: r.period_label, year: r.period_year, quarter: r.period_quarter, month: r.period_month },
    branch: { name: r.branch_name, code: r.branch_code },
  }));
}

export async function fetchCategorySalesFallback(
  db: SupabaseClient,
  periodIds: string[],
  categoryId: string,
  branchIds?: string[],
): Promise<Record<string, unknown>[]> {
  return withPgFallback(
    async () => {
      const all: Record<string, unknown>[] = [];
      const PAGE = 1000;
      let from = 0;
      while (true) {
        let request = db
          .from("analytics_fact_sales")
          .select(
            "id, quantity, total_amount, cost_amount, unit_price, product_id, branch_id, period_id, supplier_id, product:analytics_products(name, stock_code), period:analytics_periods(label, year, quarter, month), branch:analytics_branches(name, code)",
          )
          .in("period_id", periodIds)
          .eq("category_id", categoryId);
        if (branchIds && branchIds.length > 0) request = request.in("branch_id", branchIds);
        const { data, error } = await request.range(from, from + PAGE - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        all.push(...data);
        from += PAGE;
        if (data.length < PAGE) break;
      }
      return all;
    },
    () => fetchCategorySalesPg(periodIds, categoryId, branchIds),
    "fetchCategorySales",
  );
}

/* ── Branches + Products lookups via pg ─────────────────────── */

export async function getAllBranchesPg(branchIds?: string[]): Promise<{ id: string; name: string }[]> {
  if (branchIds && branchIds.length > 0) {
    return queryMany<{ id: string; name: string }>(
      `SELECT id, name FROM analytics_branches WHERE id = ANY($1)`,
      [branchIds],
    );
  }
  return queryMany<{ id: string; name: string }>(`SELECT id, name FROM analytics_branches`);
}

export async function getAllBranchesFallback(db: SupabaseClient, branchIds?: string[]): Promise<{ id: string; name: string }[]> {
  return withPgFallback(
    async () => {
      let request = db.from("analytics_branches").select("id, name");
      if (branchIds && branchIds.length > 0) request = request.in("id", branchIds);
      const { data, error } = await request;
      if (error) throw error;
      return data ?? [];
    },
    () => getAllBranchesPg(branchIds),
    "getAllBranches",
  );
}

export async function getPeriodsByIds(db: SupabaseClient, ids: string[]): Promise<{ id: string; label: string }[]> {
  if (ids.length === 0) return [];
  return withPgFallback(
    async () => {
      const { data, error } = await db
        .from("analytics_periods")
        .select("id, label")
        .in("id", ids)
        .order("year", { ascending: false })
        .order("month", { ascending: false })
        .order("quarter", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    async () =>
      queryMany<{ id: string; label: string }>(
        `SELECT id, label FROM analytics_periods WHERE id = ANY($1) ORDER BY year DESC, month DESC, quarter DESC`,
        [ids],
      ),
    "getPeriodsByIds",
  );
}

export async function getAllProductsPg(): Promise<{ id: string; name: string }[]> {
  return queryMany<{ id: string; name: string }>(`SELECT id, name FROM analytics_products`);
}

export async function getAllSuppliersPg(): Promise<{ id: string; name: string }[]> {
  return queryMany<{ id: string; name: string }>(`SELECT id, name FROM analytics_suppliers`);
}

export async function getPeriodLabelsPg(periodIds: string[]): Promise<{ label: string }[]> {
  return queryMany<{ label: string }>(
    `SELECT label FROM analytics_periods WHERE id = ANY($1) ORDER BY year ASC, month ASC`,
    [periodIds],
  );
}

/* ── Report generation locks (staleness-guarded) ────────────── */

/**
 * Acquire the per-client report_generation_lock. Clears any stale lock
 * (a crashed run leaves the row behind) before inserting so a dead lock
 * can never block report generation forever. Unique constraint on
 * client_id is preserved — a concurrent fresh run still raises 23505.
 */
export async function acquireReportLock(clientId: string, staleSeconds = 120): Promise<void> {
  await query(
    `DELETE FROM report_generation_locks
     WHERE client_id = $1 AND started_at < now() - $2::interval`,
    [clientId, `${staleSeconds} seconds`],
  );
  await query("INSERT INTO report_generation_locks (client_id) VALUES ($1)", [clientId]);
}
