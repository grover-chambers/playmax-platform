import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedClient, getCurrentUser, isAdmin } from "@/lib/supabase/api";
import { sanitizeError } from "@/lib/errors";
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

    if (!isAdmin(currentUser.role as UserRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data, error } = await supabase
      .from("research_projects")
      .select("*, research(*)")
      .eq("project_id", id);

    if (error) {
      return NextResponse.json({ error: sanitizeError(error) }, { status: 500 });
    }

    return NextResponse.json({ research: data || [] });
  } catch {
    return NextResponse.json({ error: "Failed to fetch research" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await getAuthenticatedClient();
    const currentUser = await getCurrentUser(supabase);

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isAdmin(currentUser.role as UserRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { research_id } = body;

    if (!research_id) {
      return NextResponse.json({ error: "Research ID is required" }, { status: 400 });
    }

    const { error } = await supabase
      .from("research_projects")
      .update({ project_id: id })
      .eq("id", research_id);

    if (error) {
      return NextResponse.json({ error: sanitizeError(error) }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
