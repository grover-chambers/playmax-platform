import { NextResponse } from "next/server";
import {
  getAuthenticatedClient,
  getCurrentUser,
  isAdmin,
} from "@/lib/supabase/api";
import { queryMany } from "@/lib/db";
import { sanitizeError } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await getAuthenticatedClient();
    const currentUser = await getCurrentUser(supabase);
    if (!currentUser || !isAdmin(currentUser.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rows = await queryMany<{
      id: string;
      client_id: string;
      client_name: string;
      name: string;
      report_type: string;
      frequency: string;
      next_run_at: string | null;
      last_run_at: string | null;
      enabled: boolean;
      created_at: string;
    }>(
      `SELECT rs.*, c.name as client_name
       FROM report_schedules rs
       JOIN clients c ON c.id = rs.client_id
       ORDER BY rs.created_at DESC`
    );

    return NextResponse.json({ schedules: rows });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch schedules" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await getAuthenticatedClient();
    const currentUser = await getCurrentUser(supabase);
    if (!currentUser || !isAdmin(currentUser.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { client_id, name, report_type, frequency } = body;

    if (!client_id || !name || !report_type || !frequency) {
      return NextResponse.json(
        { error: "client_id, name, report_type, and frequency are required" },
        { status: 400 },
      );
    }

    if (!["weekly", "monthly", "quarterly"].includes(frequency)) {
      return NextResponse.json(
        { error: "frequency must be weekly, monthly, or quarterly" },
        { status: 400 },
      );
    }

    const nextRunAt = computeNextRun(frequency);

    const { data, error } = await supabase
      .from("report_schedules")
      .insert({
        client_id,
        name,
        report_type,
        frequency,
        next_run_at: nextRunAt,
        enabled: true,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: sanitizeError(error) }, { status: 500 });
    }

    return NextResponse.json({ schedule: data }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Failed to create schedule" },
      { status: 500 },
    );
  }
}

function computeNextRun(frequency: string): string {
  const now = new Date();
  switch (frequency) {
    case "weekly":
      now.setDate(now.getDate() + 7);
      break;
    case "monthly":
      now.setMonth(now.getMonth() + 1);
      break;
    case "quarterly":
      now.setMonth(now.getMonth() + 3);
      break;
  }
  return now.toISOString();
}
