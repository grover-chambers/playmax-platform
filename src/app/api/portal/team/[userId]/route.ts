import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedClient, getCurrentUser } from "@/lib/supabase/api";
import { requirePortalClient } from "@/lib/portal-guard";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ userId: string }>;
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const supabase = await getAuthenticatedClient();
    const currentUser = await getCurrentUser(supabase);

    const portal = await requirePortalClient(supabase, currentUser);
    if (portal.response) return portal.response;
    const client = portal.client;

    if (client.portal_role !== "admin") {
      return NextResponse.json(
        { error: "Only the account admin can remove team members" },
        { status: 403 },
      );
    }

    const { userId } = await context.params;

    // The account owner (admin) can never be removed.
    if (client.user_id === userId) {
      return NextResponse.json(
        {
          error: {
            code: "admin_immutable",
            message: "The account admin cannot be removed.",
          },
        },
        { status: 403 },
      );
    }

    // The row must belong to THIS client.
    const { data: member } = await supabase
      .from("client_users")
      .select("user_id, portal_role")
      .eq("client_id", client.id)
      .eq("user_id", userId)
      .maybeSingle();

    if (!member) {
      return NextResponse.json(
        { error: "Team member not found" },
        { status: 404 },
      );
    }

    // Defense in depth: any admin-role junction row is also immutable.
    if (member.portal_role === "admin") {
      return NextResponse.json(
        {
          error: {
            code: "admin_immutable",
            message: "Admin team members cannot be removed.",
          },
        },
        { status: 403 },
      );
    }

    const { error } = await supabase
      .from("client_users")
      .delete()
      .eq("client_id", client.id)
      .eq("user_id", userId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[portal/team] DELETE error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Failed to remove team member" }, { status: 500 });
  }
}
