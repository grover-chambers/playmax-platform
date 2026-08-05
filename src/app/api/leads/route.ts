import { NextResponse } from "next/server";
import { getAuthenticatedClient, getCurrentUser, isStaff } from "@/lib/supabase/api";
import { sanitizeError } from "@/lib/errors";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await getAuthenticatedClient();
    const currentUser = await getCurrentUser(supabase);

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // Leads contain prospect PII — internal staff route only.
    if (!isStaff(currentUser.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let query = supabase
      .from("leads")
      .select("*")
      .order("created_at", { ascending: false });

    if (currentUser.role === "crm_staff") {
      query = query.eq("assigned_to", currentUser.id);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: sanitizeError(error) }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch leads" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  // Public form endpoint — #1 spam/DB-fill vector. Throttle per IP before
  // parsing the body or touching the database.
  const rl = await rateLimit("leads", request, {
    windowSec: 60,
    maxRequests: 5,
  });
  if (!rl.allowed) return rateLimitResponse(rl.retryAfterSec);

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

    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    );

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
      return NextResponse.json({ error: sanitizeError(error) }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
