import { NextResponse } from "next/server";
import { queryMany } from "@/lib/db";
import { getAuthenticatedClient, getCurrentUser, isStaff } from "@/lib/supabase/api";
import { withLogging } from "@/lib/request-log";

export const dynamic = "force-dynamic";

interface JobCountRow {
  status: string;
  n: number;
  last_job_at: string | null;
}

/**
 * Worker health check.
 *
 * SECURITY: Exposes report job counts, so it must not be open to the public.
 * Two supported callers:
 *   1. The report worker itself, using the shared WORKER_HEALTH_TOKEN
 *      (Authorization: Bearer <token>).
 *   2. Authenticated staff members from the dashboard.
 * If WORKER_HEALTH_TOKEN is not configured, only staff may call this route.
 */
async function getHealthHandler(request: Request) {
  try {
    const authHeader = request.headers.get("authorization") ?? "";
    const healthToken = process.env.WORKER_HEALTH_TOKEN;

    const hasValidToken = !!healthToken && authHeader === `Bearer ${healthToken}`;

    if (!hasValidToken) {
      const supabase = await getAuthenticatedClient();
      const currentUser = await getCurrentUser(supabase);
      if (!currentUser || !isStaff(currentUser.role)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    // Aggregate on the DB instead of streaming the whole report_jobs table.
    const rows = await queryMany<JobCountRow>(
      `SELECT status, count(*)::int AS n, max(updated_at) AS last_job_at
       FROM report_jobs
       WHERE updated_at >= now() - interval '24 hours'
       GROUP BY status`,
    );

    const jobs = { queued: 0, processing: 0, completed: 0, failed: 0 };
    let lastJobAt: string | null = null;

    for (const row of rows) {
      const s = row.status;
      if (s === "queued") jobs.queued = row.n;
      else if (s === "processing") jobs.processing = row.n;
      else if (s === "complete") jobs.completed = row.n;
      else if (s === "failed") jobs.failed = row.n;

      if (row.last_job_at) {
        if (!lastJobAt || row.last_job_at > lastJobAt) {
          lastJobAt = row.last_job_at;
        }
      }
    }

    return NextResponse.json({
      status: "ok",
      jobs,
      lastJobAt,
      timestamp: new Date().toISOString(),
    });
  } catch {
    // Do not echo internal error details to unauthenticated callers.
    return NextResponse.json(
      {
        status: "error",
        jobs: { queued: 0, processing: 0, completed: 0, failed: 0 },
        lastJobAt: null,
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}

export const GET = withLogging(getHealthHandler);
