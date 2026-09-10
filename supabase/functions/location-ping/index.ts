import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = (() => {
  const primary = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (primary) return primary;
  const fallback = Deno.env.get("SERVICE_ROLE_KEY");
  if (fallback) {
    console.warn("location-ping: using deprecated SERVICE_ROLE_KEY env; set SUPABASE_SERVICE_ROLE_KEY");
    return fallback;
  }
  throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
})();
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

function validatePingBody(body: unknown): { ok: true; value: PingBody } | { ok: false; error: string } {
  if (!body || typeof body !== "object") return { ok: false, error: "invalid body" };
  const b = body as Record<string, unknown>;
  if (typeof b.lat !== "number" || !Number.isFinite(b.lat)) return { ok: false, error: "lat must be a finite number" };
  if (typeof b.lng !== "number" || !Number.isFinite(b.lng)) return { ok: false, error: "lng must be a finite number" };
  for (const k of ["accuracy", "altitude", "speed", "heading", "batteryPct"] as const) {
    const v = b[k];
    if (v !== undefined && v !== null && (typeof v !== "number" || !Number.isFinite(v))) return { ok: false, error: `${k} must be a finite number if provided` };
  }
  if (b.isCharging !== undefined && b.isCharging !== null && typeof b.isCharging !== "boolean") return { ok: false, error: "isCharging must be boolean" };
  if (b.source !== undefined && b.source !== null && typeof b.source !== "string") return { ok: false, error: "source must be string" };
  if (b.lat < -5 || b.lat > 5 || b.lng < 33 || b.lng > 43) return { ok: false, error: "Coordinates outside Kenya bounds" };
  if (b.accuracy !== undefined && b.accuracy !== null && (b.accuracy as number) < 0) return { ok: false, error: "accuracy must be >= 0" };
  return { ok: true, value: b as unknown as PingBody };
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
    let repId: string | null = null;
    try {
      const { data: pid, error: pidErr } = await authed.rpc("current_profile_id");
      if (!pidErr && typeof pid === "string" && pid) repId = pid;
    } catch (_) {
      // fall through to profiles lookup
    }
    if (repId === null) {
      try {
        const { data: prof, error: profErr } = await authed
          .from("profiles")
          .select("id")
          .eq("auth_id", user.id)
          .maybeSingle();
        if (!profErr && prof) repId = prof.id as string;
      } catch (_) {}
    }
    if (repId === null) {
      return new Response(JSON.stringify({ error: "profile_not_found" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const raw = await req.json();
    const validated = validatePingBody(raw);
    if (!validated.ok) {
      return new Response(JSON.stringify({ error: validated.error }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { lat, lng, accuracy, altitude, speed, heading, batteryPct, isCharging, source } = validated.value;

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
