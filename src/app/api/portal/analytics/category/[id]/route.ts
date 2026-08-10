import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedClient, getCurrentUser } from "@/lib/supabase/api";
import { isAnalyticsSubscriptionAllowed } from "@/lib/portal";
import { requirePortalClient, subscriptionRequiredResponse } from "@/lib/portal-guard";
import { getCategoriesByIds } from "@/lib/db-fallback";
import { categoryAnalyticsHandler } from "../handler";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await getAuthenticatedClient();
    const currentUser = await getCurrentUser(supabase);

    const portal = await requirePortalClient(supabase, currentUser);
    if (portal.response) return portal.response;
    const client = portal.client;

    if (!isAnalyticsSubscriptionAllowed(client.subscription_tier)) {
      return subscriptionRequiredResponse();
    }

    const { searchParams } = new URL(request.url);
    const filterPeriodId = searchParams.get("period_id");
    const filterBranchIds = searchParams.get("branch_ids")?.split(",").filter(Boolean) || [];

    const categories = await getCategoriesByIds(supabase, [id]);
    if (!categories || categories.length === 0) {
      return NextResponse.json({ category: null, summary: "Category not found" });
    }
    const category = categories[0];

    return categoryAnalyticsHandler(
      supabase,
      client,
      category.id,
      category.name,
      filterPeriodId,
      filterBranchIds,
    );
  } catch {
    return NextResponse.json({ error: "Failed to fetch category analytics" }, { status: 500 });
  }
}
