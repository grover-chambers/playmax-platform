import type { SupabaseClient } from "@supabase/supabase-js";
import { queryOne } from "./db";
import { withPgFallback } from "./db-fallback";

export interface PortalClient {
  id: string;
  name: string;
  email: string | null;
  company: string | null;
  industry: string | null;
  phone: string | null;
  status: string;
  created_at: string;
  notification_prefs?: Record<string, boolean>;
  linked_supplier_id: string | null;
  portal_role?: string;
}

/**
 * Look up the client record for the currently authenticated user.
 * First checks client_users junction table; falls back to legacy
 * clients.user_id lookup for backward compatibility.
 * Uses withPgFallback for resilience on Vercel.
 */
export async function getPortalClient(
  supabase: SupabaseClient,
  userId: string
): Promise<PortalClient | null> {
  const CLIENT_COLS = "id, name, email, company, industry, phone, status, created_at, notification_prefs, linked_supplier_id";

  // Try junction table first
  const junction = await withPgFallback(
    async () => {
      const { data, error } = await supabase
        .from("client_users")
        .select("client_id, portal_role")
        .eq("user_id", userId)
        .order("created_at", { ascending: true })
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    () => queryOne<{ client_id: string; portal_role: string }>(
      `SELECT client_id, portal_role FROM client_users WHERE user_id = $1 ORDER BY created_at ASC LIMIT 1`,
      [userId],
    ),
    "getPortalClient-junction",
  );

  if (junction) {
    const client = await withPgFallback(
      async () => {
        const { data, error } = await supabase
          .from("clients")
          .select(CLIENT_COLS)
          .eq("id", junction.client_id)
          .maybeSingle();
        if (error) throw error;
        return data;
      },
      () => queryOne<{ id: string; name: string; email: string | null; company: string | null; industry: string | null; phone: string | null; status: string; created_at: string; notification_prefs: unknown; linked_supplier_id: string | null }>(
        `SELECT ${CLIENT_COLS} FROM clients WHERE id = $1 LIMIT 1`,
        [junction.client_id],
      ),
      "getPortalClient-byId",
    );
    if (!client) return null;
    return { ...client, portal_role: junction.portal_role, notification_prefs: (client.notification_prefs as Record<string, boolean>) || undefined };
  }

  // Fallback: legacy 1:1 user_id on clients table
  const client = await withPgFallback(
    async () => {
      const { data, error } = await supabase
        .from("clients")
        .select(CLIENT_COLS)
        .eq("user_id", userId)
        .order("created_at", { ascending: true })
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    () => queryOne<{ id: string; name: string; email: string | null; company: string | null; industry: string | null; phone: string | null; status: string; created_at: string; notification_prefs: unknown; linked_supplier_id: string | null }>(
      `SELECT ${CLIENT_COLS} FROM clients WHERE user_id = $1 ORDER BY created_at ASC LIMIT 1`,
      [userId],
    ),
    "getPortalClient-legacy",
  );

  if (!client) return null;
  return { ...client, portal_role: "admin", notification_prefs: (client.notification_prefs as Record<string, boolean>) || undefined };
}
