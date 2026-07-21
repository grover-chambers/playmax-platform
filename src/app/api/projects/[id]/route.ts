import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedClient, getCurrentUser, isAdmin } from "@/lib/supabase/api";
import { getPortalClient } from "@/lib/portal";
import type { UserRole } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await getAuthenticatedClient();
    const currentUser = await getCurrentUser(supabase);

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: project, error: projectErr } = await supabase
      .from("projects")
      .select("*, clients(company)")
      .eq("id", id)
      .single();

    if (projectErr || !project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    if (!isAdmin(currentUser.role as UserRole)) {
      const client = await getPortalClient(supabase, currentUser.id);
      if (!client || project.client_id !== client.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const [
      tasksRes,
      deliverablesRes,
      documentsRes,
      milestonesRes,
      notesRes,
      membersRes,
      messagesRes,
      analyticsRes,
      researchRes,
    ] = await Promise.all([
      supabase.from("tasks").select("*").eq("project_id", id).order("created_at", { ascending: false }),
      supabase.from("deliverables").select("*").eq("project_id", id).order("created_at", { ascending: false }),
      supabase.from("documents").select("*").eq("project_id", id).order("created_at", { ascending: false }),
      supabase.from("project_milestones").select("*").eq("project_id", id).order("sort_order", { ascending: true }),
      supabase.from("project_notes").select("*").eq("project_id", id).order("sort_order", { ascending: true }),
      supabase.from("project_members").select("*, auth_users:user_id(email, raw_user_meta_data)").eq("project_id", id),
      supabase.from("project_messages").select("*").eq("project_id", id).order("created_at", { ascending: true }),
      supabase
        .from("project_analytics_reports")
        .select("*, analytics_saved_reports(*)")
        .eq("project_id", id),
      supabase.from("research_projects").select("*").eq("project_id", id),
    ]);

    return NextResponse.json({
      project,
      tasks: tasksRes.data || [],
      deliverables: deliverablesRes.data || [],
      documents: documentsRes.data || [],
      milestones: milestonesRes.data || [],
      notes: notesRes.data || [],
      members: membersRes.data || [],
      messages: messagesRes.data || [],
      analyticsReports: analyticsRes.data || [],
      research: researchRes.data || [],
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch project" }, { status: 500 });
  }
}
