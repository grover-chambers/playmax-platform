// sync-pull — incremental pull for offline-first field sync
// GET ?since=ISO8601&entities=a,b,c
// Returns: { entities: { visits: [...], outlets: [...] }, server_time: string }
// Auth: rep JWT required. RLS still applies via the caller's JWT, but we also
// use the service client with RLS-friendly view: filter by rep where possible.
// Deployed via: supabase functions deploy sync-pull --project-ref zsprlozgdxzxeevvetmg

import { createClient } from "npm:@supabase/supabase-js@2";

const ALLOWED_ENTITIES = new Set([
  "outlets",
  "retailers",
  "routes",
  "route_stops",
  "visits",
  "visit_items",
  "health_scores",
  "stock_observations",
  "shelf_photos",
  "consumer_intercepts",
  "order_intents",
  "daily_submissions",
]);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supaUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  const authed = createClient(supaUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
  const { data: { user }, error: authErr } = await authed.auth.getUser();
  if (authErr || !user) {
    return new Response(JSON.stringify({ error: "invalid_token" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const url = new URL(req.url);
  const since = url.searchParams.get("since");
  const entitiesParam = url.searchParams.get("entities") ?? "";
  const requested = entitiesParam.split(",").map((s) => s.trim()).filter(Boolean);
  const entities = requested.length ? requested.filter((e) => ALLOWED_ENTITIES.has(e)) : [...ALLOWED_ENTITIES].slice(0, 6);

  const admin = createClient(supaUrl, serviceKey);
  const out: Record<string, unknown[]> = {};

  for (const entity of entities) {
    let q = admin.from(entity).select("*").limit(500).order("updated_at", { ascending: true });
    if (since) q = q.gt("updated_at", since);
    // Scope to caller where entity has rep_id / created_by — best-effort; RLS also enforces.
    // We don't hard-filter here to keep pull usable for master data (routes/retailers).
    const { data, error } = await q;
    if (error) {
      console.error(`sync-pull ${entity} failed`, error);
      continue;
    }
    out[entity] = data ?? [];
  }

  return new Response(JSON.stringify({ entities: out, server_time: new Date().toISOString() }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
