import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      name,
      company,
      email,
      phone,
      service_interest,
      description,
      source,
      intent,
    } = body;

    if (!name || !company || !email || !service_interest) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const supabase = getSupabase();
    const { error } = await supabase.from("leads").insert({
      name,
      company,
      email,
      phone,
      service_interest,
      description,
      source,
      intent,
      status: "new",
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
