import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export async function GET() {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("engagements")
      .select("*, clients(company), projects(name)")
      .order("date", { ascending: false });

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

    const supabase = getSupabase();
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