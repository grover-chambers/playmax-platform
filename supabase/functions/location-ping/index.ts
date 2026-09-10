import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Auth: get the user from the JWT in the Authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Identity client: ANON + user JWT (NOT service role) so the RPC and
    // profiles lookups run under the caller's real identity / RLS, exactly
    // like sync-push. Service role is used only for the write below.
    const authed = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await authed.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Identity: rep_locations.rep_id FKs to reps(id) (= profiles.id), which is
    // NOT the raw auth uid. Resolve the caller's profile id exactly like
    // sync-push does (current_profile_id RPC, then profiles by auth_id) and
    // insert that — otherwise EVERY ping fails the FK and the War Room sees no
    // live reps even though the app is pinging.
    let repId = user.id;
    try {
      const { data: pid, error: pidErr } = await authed.rpc("current_profile_id");
      if (!pidErr && typeof pid === "string" && pid) repId = pid;
    } catch (_) {
      // fall through to profiles lookup
    }
    if (repId === user.id) {
      try {
        const { data: prof, error: profErr } = await authed
          .from("profiles")
          .select("id")
          .eq("auth_id", user.id)
          .maybeSingle();
        if (!profErr && prof) repId = prof.id as string;
      } catch (_) {}
    }

    const body = await req.json() as PingBody;
    const { lat, lng, accuracy, altitude, speed, heading, batteryPct, isCharging, source } = body;

    if (typeof lat !== "number" || typeof lng !== "number") {
      return new Response(JSON.stringify({ error: "lat and lng required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate Kenya bounds
    if (lat < -5 || lat > 5 || lng < 33 || lng > 43) {
      return new Response(JSON.stringify({ error: "Coordinates outside Kenya bounds" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Insert location ping (rep_id = resolved profile id, not the auth uid).
    // Service-role client bypasses RLS, so the rep_locations write policies
    // don't gate this path — the FK on rep_id is what matters.
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const { error } = await admin.from("rep_locations").insert({
      rep_id: repId,
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
      return new Response(JSON.stringify({ error: "Failed to save location" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Location ping error:", err);
    return new Response(JSON.stringify({ error: "Server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});