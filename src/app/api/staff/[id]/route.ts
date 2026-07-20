import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getAuthenticatedClient, getCurrentUser, isAdmin } from "@/lib/supabase/api";
import { sanitizeError } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await getAuthenticatedClient();
    const currentUser = await getCurrentUser(supabase);
    if (!currentUser || !isAdmin(currentUser.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { role, status } = body;

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      return NextResponse.json({ error: "Server misconfigured — missing service role key" }, { status: 500 });
    }

    const cookieStore = await cookies();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const adminClient = createServerClient(supabaseUrl, serviceRoleKey, {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll() {},
      },
    });

    if (role) {
      const ALLOWED = ["super_admin", "cms_admin", "crm_admin", "crm_staff", "finance"];
      if (!ALLOWED.includes(role)) {
        return NextResponse.json({ error: "Invalid role" }, { status: 400 });
      }
      const { error: roleError } = await adminClient.auth.admin.updateUserById(id, {
        user_metadata: { role },
      });
      if (roleError) return NextResponse.json({ error: sanitizeError(roleError) }, { status: 500 });
    }

    if (status !== undefined) {
      if (status === "inactive") {
        const { error: banError } = await adminClient.auth.admin.deleteUser(id, false);
        if (banError) return NextResponse.json({ error: sanitizeError(banError) }, { status: 500 });
      } else {
        const { error: unbanError } = await adminClient.auth.admin.updateUserById(id, {
          ban_duration: "none",
        });
        if (unbanError) return NextResponse.json({ error: sanitizeError(unbanError) }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to update staff member" }, { status: 500 });
  }
}
