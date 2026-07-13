import { NextResponse } from "next/server";
import { getAuthenticatedClient, getCurrentUser } from "@/lib/supabase/api";
import { sanitizeError } from "@/lib/errors";

export async function GET() {
  try {
    const supabase = await getAuthenticatedClient();
    const currentUser = await getCurrentUser(supabase);
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let query = supabase
      .from("inventory")
      .select("*")
      .order("created_at", { ascending: false });

    if (currentUser.role === "crm_staff") {
      query = query.in("id", (
        await supabase
          .from("bookings")
          .select("inventory_id")
          .in("client_id", (
            await supabase
              .from("clients")
              .select("id")
              .eq("assigned_to", currentUser.id)
          ).data?.map((c) => c.id) || [])
      ).data?.map((b) => b.inventory_id) || []);
    }

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: sanitizeError(error) }, { status: 500 });
    return NextResponse.json({ inventory: data });
  } catch {
    return NextResponse.json({ error: "Failed to fetch inventory" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await getAuthenticatedClient();
    const currentUser = await getCurrentUser(supabase);
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { type, name, location, area, size, resolution, daily_impressions, price } = body;

    if (!type || !name || !location || !price) {
      return NextResponse.json({ error: "Missing required fields: type, name, location, price" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("inventory")
      .insert({
        type,
        name,
        location,
        area: area || location,
        size: size || "",
        resolution: resolution || "",
        daily_impressions: daily_impressions || 0,
        price,
        status: "available",
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: sanitizeError(error) }, { status: 500 });
    return NextResponse.json({ item: data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create inventory item" }, { status: 500 });
  }
}
