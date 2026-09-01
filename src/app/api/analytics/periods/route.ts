import { NextResponse } from "next/server";
import { getAuthenticatedClient, getCurrentUser, isAdmin, isStaff } from "@/lib/supabase/api";
import { getAdminClient } from "@/lib/supabase/admin";
import { sanitizeError } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await getAuthenticatedClient();
    const currentUser = await getCurrentUser(supabase);
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const db = getAdminClient();
    // Analytics periods are internal metadata — staff only.
    if (!isStaff(currentUser.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data, error } = await db
      .from("analytics_periods")
      .select("id, label, start_date, end_date, year, quarter, month")
      .order("end_date", { ascending: false });

    if (error) {
      return NextResponse.json({ error: sanitizeError(error) }, { status: 500 });
    }

    return NextResponse.json({ periods: data ?? [] });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch periods" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await getAuthenticatedClient();
    const currentUser = await getCurrentUser(supabase);
    if (!currentUser || (!isAdmin(currentUser.role) && currentUser.role !== "data_handler" && currentUser.role !== "finance")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const db = getAdminClient();

    const body = await request.json();
    const { label, start_date, end_date } = body;

    if (!label || !start_date || !end_date) {
      return NextResponse.json(
        { error: "Missing required fields: label, start_date, end_date" },
        { status: 400 },
      );
    }

    const { data, error } = await db
      .from("analytics_periods")
      .insert({ label, start_date, end_date })
      .select("id, label, start_date, end_date, year, quarter, month")
      .single();

    if (error) {
      if (error.code === "23505") {
        // Unique constraint — period with these dates already exists
        const { data: existing } = await db
          .from("analytics_periods")
          .select("id, label, start_date, end_date, year, quarter, month")
          .eq("start_date", start_date)
          .eq("end_date", end_date)
          .single();
        return NextResponse.json({ period: existing, alreadyExisted: true });
      }
      return NextResponse.json({ error: sanitizeError(error) }, { status: 500 });
    }

    return NextResponse.json({ period: data }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Failed to create period" },
      { status: 500 },
    );
  }
}
