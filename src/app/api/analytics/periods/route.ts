import { NextResponse } from "next/server";
import { getAuthenticatedClient, getCurrentUser, isAdmin } from "@/lib/supabase/api";
import { sanitizeError } from "@/lib/errors";

export async function GET() {
  try {
    const supabase = await getAuthenticatedClient();
    const currentUser = await getCurrentUser(supabase);
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
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
    if (!currentUser || !isAdmin(currentUser.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { label, start_date, end_date } = body;

    if (!label || !start_date || !end_date) {
      return NextResponse.json(
        { error: "Missing required fields: label, start_date, end_date" },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from("analytics_periods")
      .insert({ label, start_date, end_date })
      .select("id, label, start_date, end_date, year, quarter, month")
      .single();

    if (error) {
      if (error.code === "23505") {
        // Unique constraint — period with these dates already exists
        const { data: existing } = await supabase
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
