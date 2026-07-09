import { NextResponse } from "next/server";
import { getAuthenticatedClient, getCurrentUser, isAdmin } from "@/lib/supabase/api";

export async function GET() {
  try {
    const supabase = await getAuthenticatedClient();
    const currentUser = await getCurrentUser(supabase);

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let query = supabase
      .from("engagements")
      .select("*, clients(company), projects(name)")
      .order("date", { ascending: false });

    if (currentUser.role === "crm_staff") {
      query = query.contains("staff_involved", [currentUser.id]);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch engagements" },
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

    if (!isAdmin(currentUser.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const {
      client_id,
      engagement_type,
      date,
      staff_involved,
      billable = false,
      billing_rate,
      flat_fee,
      summary,
      project_id,
    } = body;

    if (!client_id || !engagement_type || !date) {
      return NextResponse.json(
        { error: "Client, engagement type, and date are required" },
        { status: 400 },
      );
    }

    if (billable && !billing_rate && !flat_fee) {
      return NextResponse.json(
        { error: "Hourly rate or flat fee required when billable" },
        { status: 400 },
      );
    }

    const { error } = await supabase.from("engagements").insert({
      client_id,
      engagement_type,
      date,
      staff_involved: staff_involved || [],
      billable,
      billing_rate: billable ? billing_rate : null,
      flat_fee: billable ? flat_fee : null,
      summary,
      project_id: project_id || null,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
