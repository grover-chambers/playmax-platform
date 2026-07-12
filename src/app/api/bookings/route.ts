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
      .from("bookings")
      .select("*, inventory(name), clients(company)")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: sanitizeError(error) }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch bookings" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await getAuthenticatedClient();
    const currentUser = await getCurrentUser(supabase);

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!isAdmin(currentUser.role) && currentUser.role !== "finance") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const {
      inventory_id,
      client_id,
      project_id,
      start_date,
      end_date,
      total_price,
      status = "pending",
      notes,
    } = body;

    if (!inventory_id || !client_id || !start_date || !end_date || !total_price) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const { data: existing } = await supabase
      .from("bookings")
      .select("id")
      .eq("inventory_id", inventory_id)
      .eq("status", "confirmed")
      .or(`start_date.lte.${end_date},end_date.gte.${start_date}`);

    if (existing && existing.length > 0) {
      return NextResponse.json(
        { error: "Conflict: This inventory item is already booked for the selected dates" },
        { status: 409 },
      );
    }

    const { error } = await supabase.from("bookings").insert({
      inventory_id,
      client_id,
      project_id,
      start_date,
      end_date,
      total_price,
      status,
      notes,
    });

    if (error) {
      return NextResponse.json({ error: sanitizeError(error) }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
