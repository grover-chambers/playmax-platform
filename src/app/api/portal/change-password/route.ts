import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedClient, getCurrentUser } from "@/lib/supabase/api";
import { getAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const supabase = await getAuthenticatedClient();
    const currentUser = await getCurrentUser(supabase);
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { newPassword } = await request.json();

    if (!newPassword || typeof newPassword !== "string" || newPassword.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 },
      );
    }

    // Set the new password for the signed-in user.
    const { error: updateErr } = await supabase.auth.updateUser({
      password: newPassword,
    });
    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 400 });
    }

    // Clear the temporary-password flag so the portal is reachable again.
    // app_metadata is service-role only — never client-writable.
    try {
      const admin = getAdminClient();
      await admin.auth.admin.updateUserById(currentUser.id, {
        app_metadata: {
          ...(currentUser.app_metadata ?? {}),
          must_change_password: false,
        },
      });
    } catch {
      // Flag clearing is best-effort; the password change itself succeeded.
      // A stuck flag would force the user to the change page repeatedly but
      // never leak data.
      console.warn("[portal/change-password] could not clear must_change_password flag");
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[portal/change-password] error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Failed to update password" }, { status: 500 });
  }
}
