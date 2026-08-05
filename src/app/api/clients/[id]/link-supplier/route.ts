import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedClient, getCurrentUser, isAdmin } from "@/lib/supabase/api";
import { forbidden, internalError, unauthorized } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await getAuthenticatedClient();
    const currentUser = await getCurrentUser(supabase);
    if (!currentUser) return unauthorized();
    if (!isAdmin(currentUser.role)) return forbidden();

    const { id } = await params;
    const { supplier_id } = await request.json();

    const { error } = await supabase
      .from("clients")
      .update({ linked_supplier_id: supplier_id || null })
      .eq("id", id);

    if (error) {
      return internalError(error);
    }

    return NextResponse.json({ success: true });
  } catch {
    return internalError(new Error("Failed to link supplier"));
  }
}