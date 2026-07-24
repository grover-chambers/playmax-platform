import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedClient, getCurrentUser } from "@/lib/supabase/api";
import { getPortalClient } from "@/lib/portal";
import { sanitizeError } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await getAuthenticatedClient();
    const currentUser = await getCurrentUser(supabase);
    if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const client = await getPortalClient(supabase, currentUser.id);
    if (!client) return NextResponse.json({ error: "No client account linked" }, { status: 404 });

    return NextResponse.json({ client });
  } catch {
    return NextResponse.json({ error: "Failed to fetch client data" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const supabase = await getAuthenticatedClient();
    const currentUser = await getCurrentUser(supabase);
    if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const client = await getPortalClient(supabase, currentUser.id);
    if (!client) return NextResponse.json({ error: "No client account linked" }, { status: 404 });

    if (client.portal_role === "viewer") {
      return NextResponse.json({ error: "Viewers cannot update profile" }, { status: 403 });
    }

    const body = await req.json();
    const allowedFields: Record<string, unknown> = {};
    if (body.name) allowedFields.name = body.name;
    if (body.email) allowedFields.email = body.email;
    if (body.phone) allowedFields.phone = body.phone;
    if (body.company) allowedFields.company = body.company;
    if (body.notification_prefs) allowedFields.notification_prefs = body.notification_prefs;

    if (Object.keys(allowedFields).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const { error } = await supabase
      .from("clients")
      .update(allowedFields)
      .eq("id", client.id);

    if (error) return NextResponse.json({ error: sanitizeError(error) }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}
