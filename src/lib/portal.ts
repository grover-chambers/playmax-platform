import type { SupabaseClient } from "@supabase/supabase-js";

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
 */
export async function getPortalClient(
  supabase: SupabaseClient,
  userId: string
): Promise<PortalClient | null> {
  // Try junction table first
  const { data: junction, error: jErr } = await supabase
    .from("client_users")
    .select("client_id, portal_role")
    .eq("user_id", userId)
    .maybeSingle();

  if (!jErr && junction) {
    const { data, error } = await supabase
      .from("clients")
      .select("id, name, email, company, industry, phone, status, created_at, notification_prefs, linked_supplier_id")
      .eq("id", junction.client_id)
      .maybeSingle();

    if (error || !data) return null;
    return { ...data, portal_role: junction.portal_role };
  }

  // Fallback: legacy 1:1 user_id on clients table
  const { data, error } = await supabase
    .from("clients")
    .select("id, name, email, company, industry, phone, status, created_at, notification_prefs, linked_supplier_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) return null;
  return { ...data, portal_role: "admin" };
}
