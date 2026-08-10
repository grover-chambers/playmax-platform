import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedClient, getCurrentUser } from "@/lib/supabase/api";
import { isAnalyticsSubscriptionAllowed } from "@/lib/portal";
import { requirePortalClient, subscriptionRequiredResponse } from "@/lib/portal-guard";
import {
  getCategoriesByNamePg,
  withPgFallback,
} from "@/lib/db-fallback";
import { categoryAnalyticsHandler } from "../handler";

export const dynamic = "force-dynamic";

/**
 * Legacy alias for /api/portal/analytics/category/[id] that resolves the
 * maize/maizze category by name (case-insensitive) and delegates to the same
 * shared, security-scoped handler as the dynamic route. Keeps the old
 * hardcoded client URL working until the frontend moves to dynamic category
 * tabs keyed by real category UUIDs.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await getAuthenticatedClient();
    const currentUser = await getCurrentUser(supabase);

    const portal = await requirePortalClient(supabase, currentUser);
    if (portal.response) return portal.response;
    const client = portal.client;

    // Paid market-analytics gate: free tier cannot read market analytics.
    if (!isAnalyticsSubscriptionAllowed(client.subscription_tier)) {
      return subscriptionRequiredResponse();
    }

    const { searchParams } = new URL(request.url);
    const filterPeriodId = searchParams.get("period_id");
    const filterBranchIds = searchParams.get("branch_ids")?.split(",").filter(Boolean) || [];

    // Find the Maize category (with pg fallback)
    let catId: string | null = null;
    let catName = "Maize Flour";
    const cats = await withPgFallback(
      async () => {
        const { data } = await supabase
          .from("analytics_categories")
          .select("id, name")
          .or("name.ilike.%maize%,name.ilike.%maizze%,name.ilike.%maize flour%")
          .limit(5);
        return data ?? [];
      },
      () => getCategoriesByNamePg("maize"),
      "getCategoriesByName",
    );

    if (cats && cats.length > 0) {
      const sorted = cats.sort((a: { name: string }, b: { name: string }) => {
        const aScore = a.name.toLowerCase().includes("flour") ? 2 : a.name.toLowerCase().includes("maize") ? 1 : 0;
        const bScore = b.name.toLowerCase().includes("flour") ? 2 : b.name.toLowerCase().includes("maize") ? 1 : 0;
        return bScore - aScore;
      });
      catId = sorted[0].id;
      catName = sorted[0].name;
    }

    if (!catId) {
      return NextResponse.json({ category: null, summary: "Maize/maizze category not found in analytics_categories" });
    }

    return categoryAnalyticsHandler(
      supabase,
      client,
      catId,
      catName,
      filterPeriodId,
      filterBranchIds,
    );
  } catch {
    return NextResponse.json({ error: "Failed to fetch Maize analytics" }, { status: 500 });
  }
}
