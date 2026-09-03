// sync-push — offline-first field sync (census project zsprlozgdxzxeevvetmg)
// Expects: POST { device_id: string, batch: [{ entity: string, rows: object[] }] }
// Returns: { applied: number, error?: string }  (per-invocation, single entity)
// Chunked client (sync_service.dart) sends one entity per call in ~1.5MB slices.
// Idempotency: every row is upserted onConflict=id (client UUID v4). Re-sending
// the same chunk after a partial failure is safe — no duplicates.
// Deployed via: supabase functions deploy sync-push --project-ref zsprlozgdxzxeevvetmg

import { createClient } from "npm:@supabase/supabase-js@2";

const ALLOWED_ENTITIES = new Set([
  "consent_records",
  "outlets",
  "retailers",
  "routes",
  "route_stops",
  "outlet_contacts",
  "outlet_client_links",
  "visits",
  "visit_items",
  "order_intents",
  "order_intent_items",
  "competitor_observations",
  "health_scores",
  "stock_observations",
  "shelf_photos",
  "category_observations",
  "consumer_intercepts",
  "daily_submissions",
  "back_checks",
]);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supaUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  // Validate caller JWT (rep token) — service client does the upsert
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Use anon+JWT to verify; fall back to service for DB writes.
  const authed = createClient(supaUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: authErr } = await authed.auth.getUser();
  if (authErr || !user) {
    return new Response(JSON.stringify({ error: "invalid_token" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const admin = createClient(supaUrl, serviceKey);

  let body: { device_id?: string; batch?: { entity: string; rows: Record<string, unknown>[] }[] };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid_json" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const batch = body?.batch ?? [];
  if (!Array.isArray(batch) || batch.length === 0) {
    return new Response(JSON.stringify({ applied: 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let totalApplied = 0;
  for (const group of batch) {
    const entity = group?.entity;
    const rows = group?.rows;
    if (!entity || !Array.isArray(rows) || rows.length === 0) continue;
    if (!ALLOWED_ENTITIES.has(entity)) {
      return new Response(JSON.stringify({ error: `entity_not_allowed: ${entity}` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    // Enrich with server-side audit if missing — preserve client id for idempotency.
    const enriched = rows.map((r) => ({
      ...r,
      // Do not overwrite client id — that's the idempotency key.
      updated_at: (r as Record<string, unknown>)["updated_at"] ?? new Date().toISOString(),
    }));

    const { error, count } = await admin
      .from(entity)
      .upsert(enriched, { onConflict: "id", count: "exact" as const });

    if (error) {
      console.error(`sync-push ${entity} upsert failed`, error);
      return new Response(JSON.stringify({ error: error.message, entity }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    totalApplied += count ?? enriched.length;
  }

  return new Response(JSON.stringify({ applied: totalApplied }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
