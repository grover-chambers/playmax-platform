import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedClient, getCurrentUser, isAdmin } from "@/lib/supabase/api";
import { sanitizeError } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await getAuthenticatedClient();
    const currentUser = await getCurrentUser(supabase);
    if (!currentUser || !isAdmin(currentUser.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const { data, error } = await supabase
      .from("client_users")
      .select("id, user_id, portal_role, created_at, profiles!client_users_user_id_fkey(full_name, email)")
      .eq("client_id", id)
      .order("created_at", { ascending: true });

    if (error) {
      return NextResponse.json({ error: sanitizeError(error) }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await getAuthenticatedClient();
    const currentUser = await getCurrentUser(supabase);
    if (!currentUser || !isAdmin(currentUser.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { email, portal_role } = await request.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const role = portal_role === "admin" ? "admin" : "viewer";

    // Check client exists
    const { data: client, error: clientErr } = await supabase
      .from("clients")
      .select("id")
      .eq("id", id)
      .maybeSingle();

    if (clientErr || !client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    // Check if user already exists in auth
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existing = existingUsers?.users?.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase(),
    );

    let userId: string;

    if (existing) {
      userId = existing.id;
    } else {
      // Invite via Supabase auth
      const { data: inviteData, error: inviteErr } = await supabase.auth.admin.inviteUserByEmail(email, {
        data: { role: "client" },
        redirectTo: `${process.env.NEXT_PUBLIC_BASE_URL || ""}/portal/login`,
      });

      if (inviteErr) {
        return NextResponse.json({ error: sanitizeError(inviteErr) }, { status: 500 });
      }

      userId = inviteData.user.id;
    }

    // Insert into junction
    const { error: insertErr } = await supabase
      .from("client_users")
      .insert({ client_id: id, user_id: userId, portal_role: role });

    if (insertErr) {
      if (insertErr.code === "23505") {
        return NextResponse.json({ error: "User is already linked to this client" }, { status: 409 });
      }
      return NextResponse.json({ error: sanitizeError(insertErr) }, { status: 500 });
    }

    return NextResponse.json({ success: true, user_id: userId }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to invite user" }, { status: 500 });
  }
}
