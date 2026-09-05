// sync-push — offline-first field sync (census project zsprlozgdxzxeevvetmg)
// Expects: POST { device_id: string, batch: [{ entity: string, rows: object[] }] }
// Returns: { applied: number, conflicts?: Array, error?: string }
// Chunked client (sync_service.dart) sends one entity per call in ~1.5MB slices.
//
// Idempotency: rows upsert onConflict=id (client UUID v4) with last-write-wins
// on updated_at (the DB-owned sync_apply function). Re-sending the same chunk
// after a partial failure is safe — no duplicates.
//
// Identity: the DB FKs on every synced table point at reps(id) / profiles(id).
// Older clients (≤V9) and offline captures bake the raw auth uid into rep_id /
// enumerator_id / created_by / user_id / supervisor_id etc. We resolve the
// caller's profile id (current_profile_id RPC) and rewrite those fields
// server-side, healing the backlog without a re-capture or device reset.
//
// Schema drift: rows may carry keys the target table lacks (e.g. visits has no
// outlet_id). Rather than PostgREST's strict upsert, writes go through the
// DB's public.sync_apply() which filters to real columns and reports per-row
// conflicts — one bad row no longer aborts the whole chunk.
//
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

// Fields whose FK targets reps(id) or profiles(id) on the sync tables.
const repIdFields = [
  "rep_id",
  "enumerator_id",
  "created_by",
  "user_id",
  "supervisor_id",
  "manager_id",
  "updated_by",
  "revised_by",
];

// The DB's visits.status / visits.outcome are enum visit_status (completed |
// no-stock | closed | cancelled | missed). The app's VisitOutcome wire codes
// differ (COMPLETE / PARTIAL / REFUSED / CLOSED / NOT_AN_OUTLET / UNSAFE).
// Normalize so rows land instead of failing the enum cast.
const VISIT_OUTCOME_MAP: Record<string, string> = {
  "COMPLETE": "completed",
  "completed": "completed",
  "PARTIAL": "completed",
  "partial": "completed",
  "REFUSED": "closed",
  "refused": "closed",
  "duplicate_refusal": "closed",
  "CLOSED": "closed",
  "closed": "closed",
  "NOT_AN_OUTLET": "cancelled",
  "NOT_AN_OUTLET_LEGACY": "cancelled",
  "UNSAFE": "cancelled",
  "unsafe": "cancelled",
  "owner_absent": "completed",
};

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

  // Validate caller JWT (rep token) — service client does the writes
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Use anon+JWT to verify and resolve identity; fall back to service for DB writes.
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

  // The caller's stable profile id (== reps.id). Every FK on the sync tables
  // points at reps(id) / profiles(id), so rows must carry this id — not the
  // raw auth uid (which differs and violates e.g. outlets_created_by_fkey).
  let profileId: string | null = null;
  try {
    const { data: pid, error: pidErr } = await authed.rpc("current_profile_id");
    if (!pidErr && typeof pid === "string" && pid) profileId = pid;
  } catch (_) {
    // profiles lookup fallback below
  }
  if (!profileId) {
    try {
      const { data: prof, error: profErr } = await authed
        .from("profiles")
        .select("id")
        .eq("auth_id", user.id)
        .maybeSingle();
      if (!profErr && prof) profileId = prof.id as string;
    } catch (_) {}
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
  const conflicts: unknown[] = [];
  const hardConflicts: Array<{ entity: string; conflicts: Array<{ reason?: string }> }> = [];
  let rejected = false;
  let rejectedEntity = "";

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

    // Rewrite raw auth-uid id fields to the caller's profile id, then drop
    // keys that are not real columns (sync_apply filters anyway, belt-and-braces).
    const rewritten = rows.map((r) => {
      const row = { ...r } as Record<string, unknown>;
      if (profileId) {
        for (const f of repIdFields) {
          if (row[f] === user.id) row[f] = profileId;
        }
      }
      row["updated_at"] = row["updated_at"] ?? new Date().toISOString();
      return row;
    });

    // Normalize visit outcome/status codes to the visit_status enum.
    if (entity === "visits") {
      for (const r of rewritten as Record<string, unknown>[]) {
        for (const f of ["outcome", "status"]) {
          const v = r[f];
          if (typeof v === "string" && v && VISIT_OUTCOME_MAP[v]) r[f] = VISIT_OUTCOME_MAP[v];
        }
      }
    }

    // Self-heal: census creates an `outlets` row and a `visits` row whose
    // retailer_id == the outlet id, but the DB's visits.retailer_id FK points
    // at retailers(id) — a row that never exists for a brand-new census shop.
    // Ensure a minimal retailers row exists before pushing visits so the visit
    // FK resolves. Idempotent: only inserts when the retailer is unknown.
    if (entity === "visits") {
      const retailerIds = [
        ...new Set<string>(
          rewritten.map((r) => r["retailer_id"] as string).filter((x): x is string => !!x),
        ),
      ];
      for (const rid of retailerIds) {
        try {
          const { data: existing } = await admin
            .from("retailers")
            .select("id")
            .eq("id", rid)
            .maybeSingle();
          if (existing) continue;
          const sample = rewritten.find((r) => r["retailer_id"] === rid) ?? {};
          const rep = (sample["rep_id"] as string) ?? profileId ?? user.id;
          const name = (sample["outlet_name"] as string) ?? "Census outlet";
          await admin.from("retailers").upsert(
            {
              id: rid,
              name,
              rep_id: rep,
              created_by: rep,
              lat: sample["gps_lat"] as number | null ?? null,
              lng: sample["gps_lng"] as number | null ?? null,
              status: "active",
            },
            { onConflict: "id" },
          );
        } catch (e) {
          console.error(`sync-push retailer self-heal failed for ${rid}`, e);
        }
      }
    }

    // Writes go through the DB's sync_apply: column-filtered, per-row conflict
    // reporting, last-write-wins on updated_at. One bad row never aborts the
    // chunk; the applied count tells the client exactly what landed.
    const { data: applied, error: applyErr } = await admin.rpc("sync_apply", {
      p_entity: entity,
      p_rows: rewritten,
    });

    if (applyErr) {
      console.error(`sync-push ${entity} apply failed`, applyErr);
      return new Response(
        JSON.stringify({ error: applyErr.message, entity, applied: totalApplied }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const result = applied as { applied?: number; conflicts?: Array<{ reason?: string }> } | null;
    const appliedHere = result?.applied ?? 0;
    const chunkConflicts = result?.conflicts ?? [];
    totalApplied += appliedHere;
    conflicts.push(...chunkConflicts);

    // Hard row errors (FK / not-null / cast) mean those rows did NOT land.
    // Return an error so the client keeps the chunk queued and retries. Soft
    // conflicts (newer-server-row) are by design.
    const hard = chunkConflicts.filter(
      (c) => (c?.reason ?? "").startsWith("error:") || (c?.reason ?? "") === "insert-failed",
    );
    if (hard.length > 0) {
      console.warn(`sync-push ${entity}: ${appliedHere} applied, ${hard.length} failed`, hard[0]);
      rejected = true;
      rejectedEntity = entity;
      hardConflicts.push({ entity, conflicts: hard });
    }
  }

  if (rejected) {
    return new Response(
      JSON.stringify({
        error: `row_rejected: ${rejectedEntity}`,
        applied: totalApplied,
        conflicts: hardConflicts,
      }),
      { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  return new Response(JSON.stringify({ applied: totalApplied, conflicts }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});