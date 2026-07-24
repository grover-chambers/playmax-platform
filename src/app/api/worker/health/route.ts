import { NextResponse } from "next/server";
import { queryMany } from "@/lib/db";

export const dynamic = "force-dynamic";

interface JobRow {
  status: string;
  updated_at: string;
}

export async function GET() {
  try {
    const rows = await queryMany<JobRow>(
      `SELECT status, updated_at FROM report_jobs`,
    );

    const jobs = { queued: 0, processing: 0, completed: 0, failed: 0 };
    let lastJobAt: string | null = null;

    for (const row of rows) {
      const s = row.status;
      if (s === "queued") jobs.queued++;
      else if (s === "processing") jobs.processing++;
      else if (s === "complete") jobs.completed++;
      else if (s === "failed") jobs.failed++;

      if (row.updated_at) {
        if (!lastJobAt || row.updated_at > lastJobAt) {
          lastJobAt = row.updated_at;
        }
      }
    }

    return NextResponse.json({
      status: "ok",
      jobs,
      lastJobAt,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      {
        status: "error",
        jobs: { queued: 0, processing: 0, completed: 0, failed: 0 },
        lastJobAt: null,
        timestamp: new Date().toISOString(),
        error: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
