import { NextResponse } from "next/server";
import { getAuthenticatedClient, getCurrentUser } from "@/lib/supabase/api";
import { createCensusClient } from "@/lib/supabase/census";

export const dynamic = "force-dynamic";
export const config = { api: { bodyParser: { sizeLimit: "100kb" } } };

interface PingBody {
  lat: number;
  lng: number;
  accuracy?: number;
  altitude?: number;
  speed?: number;
  heading?: number;
  batteryPct?: number;
  isCharging?: boolean;
  source?: string;
}

export async function POST(request: Request) {
  try {
    const supabase = await getAuthenticatedClient();
    const currentUser = await getCurrentUser(supabase);
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json() as PingBody;
    const { lat, lng, accuracy, altitude, speed, heading, batteryPct, isCharging, source } = body;

    if (typeof lat !== "number" || typeof lng !== "number") {
      return NextResponse.json({ error: "lat and lng required" }, { status: 400 });
    }

    // Validate Kenya bounds
    if (lat < -5 || lat > 5 || lng < 33 || lng > 43) {
      return NextResponse.json({ error: "Coordinates outside Kenya bounds" }, { status: 400 });
    }

    const db = await createCensusClient();

    // Insert location ping
    const { error } = await db.from("rep_locations").insert({
      rep_id: currentUser.id,
      lat,
      lng,
      accuracy_m: accuracy ?? null,
      altitude_m: altitude ?? null,
      speed_kmh: speed ?? null,
      heading_deg: heading ?? null,
      battery_pct: batteryPct ?? null,
      is_charging: isCharging ?? null,
      source: source ?? "app_background",
    });

    if (error) {
      console.error("Location ping insert error:", error);
      return NextResponse.json({ error: "Failed to save location" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Location ping error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}