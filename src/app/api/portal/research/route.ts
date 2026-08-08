import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedClient, getCurrentUser } from "@/lib/supabase/api";
import { requirePortalClient } from "@/lib/portal-guard";
import { sanitizeError } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const supabase = await getAuthenticatedClient();
    const currentUser = await getCurrentUser(supabase);

    const portal = await requirePortalClient(supabase, currentUser);
    if (portal.response) return portal.response;
    const client = portal.client;

    const { searchParams } = new URL(req.url);
    const reportId = searchParams.get("reportId");

    let query = supabase
      .from("report_metrics")
      .select("id, report_id, metric_key, metric_label, metric_value, unit, chart_type, sort_order")
      .order("sort_order", { ascending: true });

    if (reportId) {
      // scope fix: explicit ownership check — the report must belong to this
      // client directly or via a project the client owns (mirrors RLS).
      const { data: report } = await supabase
        .from("reports")
        .select("id, client_id, project_id")
        .eq("id", reportId)
        .maybeSingle();

      let owned = !!report && report.client_id === client.id;
      if (!owned && report?.project_id) {
        const { data: project } = await supabase
          .from("projects")
          .select("id")
          .eq("id", report.project_id)
          .eq("client_id", client.id)
          .maybeSingle();
        owned = !!project;
      }
      if (!owned) {
        return NextResponse.json({ findings: [] });
      }
      query = query.eq("report_id", reportId);
    } else {
      const { data: reports } = await supabase
        .from("reports")
        .select("id")
        .eq("client_id", client.id)
        .eq("visible_to_client", true)
        .order("created_at", { ascending: false })
        .limit(1);

      if (reports && reports.length > 0) {
        query = query.eq("report_id", reports[0].id);
      } else {
        return NextResponse.json({ findings: [] });
      }
    }

    const { data, error } = await query;

    if (error) {
      if (error.code === "42P01") {
        return NextResponse.json({ findings: [] });
      }
      return NextResponse.json({ error: sanitizeError(error) }, { status: 500 });
    }

    return NextResponse.json({ findings: data || [] });
  } catch {
    return NextResponse.json({ error: "Failed to fetch research" }, { status: 500 });
  }
}
