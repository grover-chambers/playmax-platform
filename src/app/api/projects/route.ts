import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export async function GET() {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("projects")
      .select("*, clients(company)")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch projects" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, client_id, type, status, value, deadline, owner_id } = body;

    if (!name || !client_id || !type) {
      return NextResponse.json(
        { error: "Name, client, and type are required" },
        { status: 400 },
      );
    }

    const supabase = getSupabase();
    const { error } = await supabase.from("projects").insert({
      name,
      client_id,
      type,
      status: status || "draft",
      value,
      deadline,
      owner_id,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
