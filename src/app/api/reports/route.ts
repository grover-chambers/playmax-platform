import { NextResponse } from "next/server";
import { getAuthenticatedClient, getCurrentUser, isAdmin, isStaff } from "@/lib/supabase/api";
import { sanitizeError } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const supabase = await getAuthenticatedClient();
    const currentUser = await getCurrentUser(supabase);
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // Reports include internal analysis. Portal clients use
    // /api/portal/reports (client-scoped); this route is staff-only.
    if (!isStaff(currentUser.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("project_id");
    const clientId = searchParams.get("client_id");
    const visibleOnly = searchParams.get("visible_only") === "true";

    let query = supabase
      .from("reports")
      .select("*, metrics:report_metrics(*), published:documents!source_report_id(id, visible_to_client)")
      .order("created_at", { ascending: false });

    if (projectId) query = query.eq("project_id", projectId);
    if (clientId) query = query.eq("client_id", clientId);
    if (visibleOnly) query = query.eq("visible_to_client", true);

    if (!isAdmin(currentUser.role) && currentUser.role !== "finance") {
      if (clientId) {
        query = query.eq("visible_to_client", true);
      }
    }

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: sanitizeError(error) }, { status: 500 });
    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: "Failed to fetch reports" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await getAuthenticatedClient();
    const currentUser = await getCurrentUser(supabase);
    if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!isAdmin(currentUser.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await request.json();
    const { project_id, client_id, title, type, content, visible_to_client, metrics } = body;

    if (!project_id || !title) {
      return NextResponse.json({ error: "project_id and title are required" }, { status: 400 });
    }

    const { data: report, error: reportError } = await supabase
      .from("reports")
      .insert({ project_id, client_id, title, type: type || "market_research", content, visible_to_client: visible_to_client || false })
      .select()
      .single();

    if (reportError) return NextResponse.json({ error: sanitizeError(reportError) }, { status: 500 });

    if (metrics && metrics.length > 0) {
      const { error: metricsError } = await supabase
        .from("report_metrics")
        .insert(metrics.map((m: Record<string, unknown>) => ({ ...m, report_id: report.id })));

      if (metricsError) return NextResponse.json({ error: sanitizeError(metricsError) }, { status: 500 });
    }

    return NextResponse.json({ data: report });
  } catch {
    return NextResponse.json({ error: "Failed to create report" }, { status: 500 });
  }
}
