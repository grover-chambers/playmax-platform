import { NextResponse } from "next/server";
import { queryOne, withTransaction } from "@/lib/db";
import { namparkIngestSchema } from "@/lib/validation";
import { withLogging } from "@/lib/request-log";

export const dynamic = "force-dynamic";

/**
 * Module ingestion endpoint (server-to-server).
 *
 * Consumed by NAMPARK RMS to push summary metrics for the Route Mapping
 * module into PlayMax reporting (reports + report_metrics).
 *
 * SECURITY:
 *  - Authenticated via shared secret: Authorization: Bearer $MODULE_INGEST_SECRET
 *    (NOT a Supabase session; allowlisted in middleware, self-guarded here).
 *  - Fails closed if MODULE_INGEST_SECRET is unset.
 *  - Fails closed unless the client has an ACTIVE route_mapping row in
 *    client_modules.
 *
 * Idempotency: one rolling report per client (type 'module_sync'). Each push
 * replaces that report's metrics inside a single transaction.
 */
async function getIngestHandler(request: Request) {
  const secret = process.env.MODULE_INGEST_SECRET;
  const authHeader = request.headers.get("authorization") ?? "";

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = namparkIngestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { client_id, period_label, metrics } = parsed.data;

  // Fail closed: module must be activated for this client
  const activation = await queryOne<{ id: string }>(
    `SELECT id FROM public.client_modules
     WHERE client_id = $1 AND module_type = 'route_mapping' AND status = 'active'
     LIMIT 1`,
    [client_id],
  );

  if (!activation) {
    return NextResponse.json(
      { error: "Module not activated for this client" },
      { status: 403 },
    );
  }

  const title = period_label
    ? `NAMPARK Route Mapping — ${period_label}`
    : "NAMPARK Route Mapping Summary";

  const result = await withTransaction(async (client) => {
    // One rolling report per client per module sync
    let reportId: string | null = null;
    const existing = await client.query<{ id: string }>(
      `SELECT id FROM public.reports
       WHERE client_id = $1 AND type = 'module_sync' AND title = $2
       ORDER BY created_at DESC LIMIT 1 FOR UPDATE`,
      [client_id, title],
    );

    if (existing.rows.length > 0) {
      reportId = existing.rows[0].id;
      await client.query(`UPDATE public.reports SET updated_at = now() WHERE id = $1`, [
        reportId,
      ]);
    } else {
      const inserted = await client.query<{ id: string }>(
        `INSERT INTO public.reports (client_id, title, type, visible_to_client)
         VALUES ($1, $2, 'module_sync', true)
         RETURNING id`,
        [client_id, title],
      );
      reportId = inserted.rows[0].id;
    }

    // Replace metrics wholesale so removed keys don't linger
    await client.query(`DELETE FROM public.report_metrics WHERE report_id = $1`, [
      reportId,
    ]);

    const values: unknown[] = [];
    const placeholders = metrics
      .map((m, i) => {
        const p = i * 7;
        values.push(
          reportId,
          m.key,
          m.label,
          m.value,
          m.unit,
          m.chart_type,
          m.sort_order,
        );
        return `($${p + 1}, $${p + 2}, $${p + 3}, $${p + 4}, $${p + 5}, $${p + 6}, $${p + 7})`;
      })
      .join(", ");

    await client.query(
      `INSERT INTO public.report_metrics
        (report_id, metric_key, metric_label, metric_value, unit, chart_type, sort_order)
       VALUES ${placeholders}`,
      values,
    );

    return { reportId };
  });

  return NextResponse.json({
    ok: true,
    report_id: result.reportId,
    metrics_written: metrics.length,
  });
}

export const POST = withLogging(getIngestHandler);
