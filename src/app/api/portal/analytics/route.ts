import { NextResponse } from "next/server";
import { getAuthenticatedClient, getCurrentUser } from "@/lib/supabase/api";
import { getPortalClient } from "@/lib/portal";

export async function GET() {
  try {
    const supabase = await getAuthenticatedClient();
    const currentUser = await getCurrentUser(supabase);
    if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const client = await getPortalClient(supabase, currentUser.id);
    if (!client) return NextResponse.json({ error: "No client account linked" }, { status: 404 });

    // Fetch sharing records for this client
    const { data: sharing, error: shareErr } = await supabase
      .from("portal_analytics_sharing")
      .select("id, period_id, branch_id, category_id")
      .eq("client_id", client.id)
      .eq("visible", true);

    if (shareErr) {
      return NextResponse.json({ error: shareErr.message }, { status: 500 });
    }

    if (!sharing || sharing.length === 0) {
      return NextResponse.json({ sharing: [], sales: [], inventory: [] });
    }

    const periodIds = [...new Set(sharing.map((s) => s.period_id))];
    const branchIds = [...new Set(sharing.map((s) => s.branch_id).filter(Boolean))] as string[];
    const categoryIds = [...new Set(sharing.map((s) => s.category_id).filter(Boolean))] as string[];

    // Fetch sales data matching the shared periods
    const salesQuery = supabase
      .from("analytics_fact_sales")
      .select("id, quantity, total_amount, cost_amount, weight_tonnes, period_id, branch_id, category_id, product:analytics_products(name, stock_code), period:analytics_periods(label, year, quarter, month), branch:analytics_branches(name, code), category:analytics_categories(name)")
      .in("period_id", periodIds);

    if (branchIds.length > 0) salesQuery.in("branch_id", branchIds);
    if (categoryIds.length > 0) salesQuery.in("category_id", categoryIds);

    const { data: sales, error: salesErr } = await salesQuery;

    // Fetch inventory data
    const invQuery = supabase
      .from("analytics_fact_inventory")
      .select("id, snapshot_date, quantity_on_hand, unit_cost, total_value, product:analytics_products(name, stock_code), branch:analytics_branches(name, code)")
      .order("snapshot_date", { ascending: false })
      .limit(200);

    if (branchIds.length > 0) invQuery.in("branch_id", branchIds);

    const { data: inventory, error: invErr } = await invQuery;

    if (salesErr || invErr) {
      return NextResponse.json({
        error: salesErr?.message || invErr?.message || "Query failed",
        sharing,
        sales: [],
        inventory: [],
      });
    }

    return NextResponse.json({
      sharing,
      sales: sales || [],
      inventory: inventory || [],
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 });
  }
}
