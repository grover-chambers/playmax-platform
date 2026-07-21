import { NextResponse } from "next/server";
import { getAuthenticatedClient, getCurrentUser, isAdmin } from "@/lib/supabase/api";
import { getPortalClient } from "@/lib/portal";
import { sanitizeError } from "@/lib/errors";
import type { UserRole } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await getAuthenticatedClient();
    const currentUser = await getCurrentUser(supabase);

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let query = supabase
      .from("projects")
      .select("*, clients(company)")
      .order("created_at", { ascending: false });

    if (currentUser.role === "crm_staff") {
      query = query.eq("assigned_to", currentUser.id);
    } else if (!isAdmin(currentUser.role as UserRole)) {
      // Portal clients see only their projects
      const client = await getPortalClient(supabase, currentUser.id);
      if (client) {
        query = query.eq("client_id", client.id);
      } else {
        // Non-admin, non-client users see nothing
        return NextResponse.json({ data: [] });
      }
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: sanitizeError(error) }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch projects" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await getAuthenticatedClient();
    const currentUser = await getCurrentUser(supabase);

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isAdmin(currentUser.role as UserRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { name, client_id, type, status, value, end_date, assigned_to } = body;

    if (!name || !client_id || !type) {
      return NextResponse.json(
        { error: "Name, client, and type are required" },
        { status: 400 },
      );
    }

    const { error } = await supabase.from("projects").insert({
      name,
      client_id,
      type,
      status: status || "draft",
      value,
      end_date,
      assigned_to,
    });

    if (error) {
      return NextResponse.json({ error: sanitizeError(error) }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
