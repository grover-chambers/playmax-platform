import { NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "crypto";
import { queryOne, withTransaction } from "@/lib/db";
import { moduleEventSchema } from "@/lib/validation";
import { withLogging } from "@/lib/request-log";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * Module integration endpoint (server-to-server).
 *
 * Consumed by NAMPARK RMS to push route-mapping metric snapshot events into
 * PlayMax reporting (module_events ledger -> reports/report_metrics).
 *
 * Contract (architecture review §9/§11): event-oriented, idempotent.
 *  - Caller generates event_id (UUID). Replays are detected via the unique
 *    module_events.event_id ledger row and acknowledged without re-writing.
 *  - Authenticated via shared secret: Authorization: Bearer $MODULE_INGEST_SECRET
 *  - Fails closed if MODULE_INGEST_SECRET is unset.
 *  - Fails closed unless the client has an ACTIVE route_mapping row in
 *    client_modules.
 */
async function getIngestHandler(request: Request) {
  const secret = process.env.MODULE_INGEST_SECRET;
  const authHeader = request.headers.get("authorization") ?? "";

  // Timing-safe compare: never leak the secret through response latency.
  const expected = Buffer.from(
    createHash("sha256").update(`Bearer ${secret ?? ""}`).digest("hex"),
  );
  const provided = Buffer.from(
    createHash("sha256").update(authHeader).digest("hex"),
  );
  const authOk =
    !!secret && authHeader.startsWith("Bearer ") && timingSafeEqual(expected, provided);

  if (!authOk) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit per bearer identity (all callers share one secret, so this
  // primarily bounds runaway integrations and brute-force pressure).
  const limit = await rateLimit("modules-ingest", request, {
    windowSec: 60,
    maxRequests: 60,
  });
  if (!limit.allowed) return rateLimitResponse(limit.retryAfterSec);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = moduleEventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const event = parsed.data;

  const occurredAt = new Date(event.occurred_at);
  if (Number.isNaN(occurredAt.getTime())) {
    return NextResponse.json(
      { error: "occurred_at must be a valid ISO 8601 timestamp" },
      { status: 400 },
    );
  }

  // Fail closed: module must be activated for this client
  const activation = await queryOne<{ id: string }>(
    `SELECT id FROM public.client_modules
     WHERE client_id = $1 AND module_type = 'route_mapping' AND status = 'active'
     LIMIT 1`,
    [event.client_id],
  );

  if (!activation) {
    return NextResponse.json(
      { error: "Module not activated for this client" },
      { status: 403 },
    );
  }

  const title = event.period_label
    ? `NAMPARK Route Mapping — ${event.period_label}`
    : "NAMPARK Route Mapping Summary";

  const result = await withTransaction(async (client) => {
    // ── Idempotency gate: claim the event exactly once ──
    const claimed = await client.query<{ id: string }>(
      `INSERT INTO public.module_events
        (event_id, source, module_type, client_id, tenant_external_id,
         event_type, occurred_at, payload)
       VALUES ($1, $2, 'route_mapping', $3, $4, $5, $6, $7)
       ON CONFLICT (event_id) DO NOTHING
       RETURNING id`,
      [
        event.event_id,
        event.source,
        event.client_id,
        event.tenant_id ?? null,
        event.event_type,
        occurredAt.toISOString(),
        {
          ...(body ?? {}),
          route_group: event.route_group,
        },
      ],
    );

    if (claimed.rows.length === 0) {
      return { duplicate: true as const, reportId: null };
    }

    // ── One rolling report per client per module sync ──
    let reportId: string | null = null;
    const existing = await client.query<{ id: string }>(
      `SELECT id FROM public.reports
       WHERE client_id = $1 AND type = 'module_sync' AND title = $2
       ORDER BY created_at DESC LIMIT 1 FOR UPDATE`,
      [event.client_id, title],
    );

    if (existing.rows.length > 0) {
      reportId = existing.rows[0].id;
      await client.query(
        `UPDATE public.reports SET updated_at = now() WHERE id = $1`,
        [reportId],
      );
    } else {
      const inserted = await client.query<{ id: string }>(
        `INSERT INTO public.reports (client_id, title, type, visible_to_client)
         VALUES ($1, $2, 'module_sync', true)
         RETURNING id`,
        [event.client_id, title],
      );
      reportId = inserted.rows[0].id;
    }

    // Replace metrics wholesale so removed keys don't linger
    await client.query(`DELETE FROM public.report_metrics WHERE report_id = $1`, [
      reportId,
    ]);

    const values: unknown[] = [];
    const placeholders = event.metrics
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

    return { duplicate: false as const, reportId };
  });

  if (result.duplicate) {
    return NextResponse.json({
      ok: true,
      duplicate: true,
      event_id: event.event_id,
    });
  }

  return NextResponse.json({
    ok: true,
    duplicate: false,
    event_id: event.event_id,
    report_id: result.reportId,
    metrics_written: event.metrics.length,
  });
}

export const POST = withLogging(getIngestHandler);
