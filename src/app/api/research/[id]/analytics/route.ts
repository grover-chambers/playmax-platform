import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedClient, getCurrentUser, isAdmin } from "@/lib/supabase/api";
import { sanitizeError } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await getAuthenticatedClient();
    const currentUser = await getCurrentUser(supabase);
    if (!currentUser || !isAdmin(currentUser.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: project } = await supabase
      .from("research_projects")
      .select("id, client_id")
      .eq("id", id)
      .single();

    if (!project) {
      return NextResponse.json({ error: "Research project not found" }, { status: 404 });
    }

    if (!project.client_id) {
      return NextResponse.json({
        analytics: null,
        summary: "No client linked to this research project. Link a client to see analytics data.",
      });
    }

    const { data: sharing } = await supabase
      .from("portal_analytics_sharing")
      .select("period_id, branch_id, category_id")
      .eq("client_id", project.client_id)
      .eq("visible", true);

    const periodIds = [...new Set((sharing || []).map((s) => s.period_id))];
    const branchIds = [...new Set((sharing || []).map((s) => s.branch_id).filter(Boolean))] as string[];
    const categoryIds = [...new Set((sharing || []).map((s) => s.category_id).filter(Boolean))] as string[];

    if (periodIds.length === 0) {
      return NextResponse.json({
        analytics: null,
        sharing: [],
        summary: "No analytics sharing configured for this client. Configure sharing in the analytics module.",
      });
    }

    const [competition, categories, branches, consumer, supplyDemand] = await Promise.all([
      supabase.from("v_competition_matrix").select("*").limit(100),
      supabase.from("v_category_analysis").select("*").order("total_revenue", { ascending: false }).limit(50),
      supabase.from("v_branch_analysis").select("*").limit(200),
      supabase.from("v_consumer_behaviour").select("*").order("total_revenue", { ascending: false }).limit(50),
      supabase.from("v_supply_demand_gap").select("*").limit(100),
    ]);

    const { data: clientRow } = await supabase
      .from("clients")
      .select("name, company, dashboard_color")
      .eq("id", project.client_id)
      .single();

    return NextResponse.json({
      project_id: project.id,
      client: clientRow || null,
      sharing: { periodIds, branchIds, categoryIds },
      analytics: {
        competition_matrix: competition.data || [],
        category_analysis: categories.data || [],
        branch_analysis: branches.data || [],
        consumer_behaviour: consumer.data || [],
        supply_demand_gap: supplyDemand.data || [],
      },
      summary: {
        total_competitors: competition.data?.length || 0,
        total_categories: categories.data?.length || 0,
        total_branches: branches.data?.length || 0,
      },
    });
  } catch (e) {
    return NextResponse.json({ error: sanitizeError(e) }, { status: 500 });
  }
}
