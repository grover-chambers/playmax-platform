import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminClient } from "@/lib/supabase/admin";

/**
 * Category scoping service. A client's analytics access is the product of
 * (a) their profile (clients.category_id + client_categories) and (b) the
 * sharing allowlist (portal_analytics_sharing). This service keeps the two in
 * sync: assigning a category to a client grants them that category across all
 * periods and all branches (branch_id = NULL acts as a wildcard in RLS).
 */

async function getScopePeriodIds(supabase: SupabaseClient): Promise<string[]> {
  const { data, error } = await supabase
    .from("analytics_periods")
    .select("id")
    .order("start_date", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((p) => p.id);
}

async function getAssignedCategoryIds(
  supabase: SupabaseClient,
  clientId: string,
): Promise<string[]> {
  const ids: string[] = [];
  const { data: primary, error: primaryErr } = await supabase
    .from("clients")
    .select("category_id")
    .eq("id", clientId)
    .maybeSingle();
  if (primaryErr) throw primaryErr;
  if (primary?.category_id) ids.push(primary.category_id);

  const { data: extra, error: extraErr } = await supabase
    .from("client_categories")
    .select("category_id")
    .eq("client_id", clientId);
  if (extraErr) throw extraErr;
  for (const row of extra ?? []) ids.push(row.category_id);

  return [...new Set(ids)];
}

/**
 * Replace a client's category-specific sharing rows so they exactly match the
 * assigned categories, granted across all periods and all branches.
 * Rows with category_id = NULL (all-categories grants) are preserved.
 */
export async function setClientCategoryScope(
  supabase: SupabaseClient,
  clientId: string,
): Promise<{ periods: number; categories: string[] }> {
  const categoryIds = await getAssignedCategoryIds(supabase, clientId);
  const periodIds = await getScopePeriodIds(supabase);

  const { data: existing, error: existingErr } = await supabase
    .from("portal_analytics_sharing")
    .select("id")
    .eq("client_id", clientId)
    .not("category_id", "is", null);
  if (existingErr) throw existingErr;
  const existingIds = (existing ?? []).map((r) => r.id);
  if (existingIds.length > 0) {
    const { error: delErr } = await supabase
      .from("portal_analytics_sharing")
      .delete()
      .in("id", existingIds);
    if (delErr) throw delErr;
  }

  if (categoryIds.length > 0 && periodIds.length > 0) {
    const rows: {
      client_id: string;
      period_id: string;
      branch_id: null;
      category_id: string;
    }[] = [];
    for (const categoryId of categoryIds) {
      for (const periodId of periodIds) {
        rows.push({ client_id: clientId, period_id: periodId, branch_id: null, category_id: categoryId });
      }
    }
    const { error: insErr } = await supabase
      .from("portal_analytics_sharing")
      .insert(rows);
    if (insErr) throw insErr;
  }

  return { periods: periodIds.length, categories: categoryIds };
}

/**
 * Idempotent single-client scope refresh. Safe to call from onboarding, the
 * client detail panel, and the category PATCH handler.
 */
export async function syncClientScope(clientId: string) {
  const supabase = getAdminClient();
  const { data: client, error } = await supabase
    .from("clients")
    .select("id")
    .eq("id", clientId)
    .maybeSingle();
  if (error) throw error;
  if (!client) throw new Error("Client not found");
  return setClientCategoryScope(supabase, clientId);
}
