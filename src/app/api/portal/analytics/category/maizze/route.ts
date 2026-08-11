import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedClient, getCurrentUser } from "@/lib/supabase/api";
import { withPgFallback, getCategoriesByNamePg } from "@/lib/db-fallback";

export const dynamic = "force-dynamic";

/**
 * Legacy alias for /api/portal/analytics/category/[id]. Resolves the
 * maize/maizze category by name and issues a 307 redirect so old hardcoded
 * client URLs keep working while everything serves from the dynamic route.
 * The target route performs the full portal + subscription + scope checks.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await getAuthenticatedClient();
    await getCurrentUser(supabase);

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

    if (!cats || cats.length === 0) {
      return NextResponse.json({ category: null, summary: "Maize/maizze category not found in analytics_categories" });
    }

    const sorted = cats.sort((a: { name: string }, b: { name: string }) => {
      const score = (n: string) => (n.toLowerCase().includes("flour") ? 2 : n.toLowerCase().includes("maize") ? 1 : 0);
      return score(b.name) - score(a.name);
    });
    const catId = sorted[0].id;

    const { searchParams } = new URL(request.url);
    const target = `/api/portal/analytics/category/${catId}`;
    const periodId = searchParams.get("period_id");
    const branchIds = searchParams.get("branch_ids");
    const qs: string[] = [];
    if (periodId) qs.push(`period_id=${encodeURIComponent(periodId)}`);
    if (branchIds) qs.push(`branch_ids=${encodeURIComponent(branchIds)}`);

    return NextResponse.redirect(new URL(qs.length > 0 ? `${target}?${qs.join("&")}` : target, request.url), 307);
  } catch {
    return NextResponse.json({ error: "Failed to resolve maize analytics" }, { status: 500 });
  }
}
