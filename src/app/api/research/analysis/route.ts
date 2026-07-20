import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedClient, getCurrentUser, isAdmin } from "@/lib/supabase/api";
import { sanitizeError } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const supabase = await getAuthenticatedClient();
    const currentUser = await getCurrentUser(supabase);
    if (!currentUser || !isAdmin(currentUser.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { project_id, algorithms } = body;

    if (!project_id) {
      return NextResponse.json({ error: "project_id is required" }, { status: 400 });
    }

    const { data: project } = await supabase
      .from("research_projects")
      .select("id, client_id")
      .eq("id", project_id)
      .single();

    if (!project) {
      return NextResponse.json({ error: "Research project not found" }, { status: 404 });
    }

    const { data, error } = await supabase
      .from("report_jobs")
      .insert({
        project_id,
        client_id: project.client_id,
        report_type: "ai_analysis",
        status: "queued",
        algorithms: algorithms || ["competition", "category", "branch", "consumer", "supply_demand"],
        metadata: { triggered_by: currentUser.id },
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: sanitizeError(error) }, { status: 500 });
    return NextResponse.json({ job: data });
  } catch {
    return NextResponse.json({ error: "Failed to queue analysis" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await getAuthenticatedClient();
    const currentUser = await getCurrentUser(supabase);
    if (!currentUser || !isAdmin(currentUser.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const project_id = searchParams.get("project_id");

    let query = supabase
      .from("report_jobs")
      .select("*")
      .order("created_at", { ascending: false });

    if (project_id) query = query.eq("project_id", project_id);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: sanitizeError(error) }, { status: 500 });
    return NextResponse.json({ jobs: data || [] });
  } catch {
    return NextResponse.json({ error: "Failed to fetch report jobs" }, { status: 500 });
  }
}
