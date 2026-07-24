import { NextResponse } from "next/server";
import {
  getAuthenticatedClient,
  getCurrentUser,
  isAdmin,
} from "@/lib/supabase/api";
import { sanitizeError } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await getAuthenticatedClient();
    const currentUser = await getCurrentUser(supabase);
    if (!currentUser || !isAdmin(currentUser.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await _request.json();
    const updates: Record<string, unknown> = {};

    if (body.enabled !== undefined) updates.enabled = body.enabled;
    if (body.frequency) {
      updates.frequency = body.frequency;
      const now = new Date();
      switch (body.frequency) {
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
      updates.next_run_at = now.toISOString();
    }
    if (body.name) updates.name = body.name;
    if (body.report_type) updates.report_type = body.report_type;

    const { data, error } = await supabase
      .from("report_schedules")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: sanitizeError(error) }, { status: 500 });
    }

    return NextResponse.json({ schedule: data });
  } catch {
    return NextResponse.json(
      { error: "Failed to update schedule" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await getAuthenticatedClient();
    const currentUser = await getCurrentUser(supabase);
    if (!currentUser || !isAdmin(currentUser.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { error } = await supabase
      .from("report_schedules")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: sanitizeError(error) }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to delete schedule" },
      { status: 500 },
    );
  }
}
