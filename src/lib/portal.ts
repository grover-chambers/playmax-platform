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
}

/**
 * Look up the client record for the currently authenticated user.
 * Returns null if the user has no linked client record.
 */
export async function getPortalClient(
  supabase: SupabaseClient,
  userId: string
): Promise<PortalClient | null> {
  const { data, error } = await supabase
    .from("clients")
    .select("id, name, email, company, industry, phone, status, created_at, notification_prefs, linked_supplier_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) return null;
  return data;
}
