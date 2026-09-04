import { NextResponse } from "next/server";
import { getAuthenticatedClient, getCurrentUser, isAdmin, isStaff } from "@/lib/supabase/api";
import { sanitizeError } from "@/lib/errors";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const supabase = await getAuthenticatedClient();
    const currentUser = await getCurrentUser(supabase);
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // Saved analytics reports are internal — staff only.
    if (!isStaff(currentUser.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data, error } = await supabase
      .from("analytics_saved_reports")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: "Report not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ report: data });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch report" },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const supabase = await getAuthenticatedClient();
    const currentUser = await getCurrentUser(supabase);
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!isStaff(currentUser.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { error } = await supabase
      .from("analytics_saved_reports")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json(
        { error: sanitizeError(error) },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to delete report" },
      { status: 500 },
    );
  }
}
