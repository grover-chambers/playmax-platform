import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedClient, getCurrentUser, isAdmin } from "@/lib/supabase/api";
import { forbidden, internalError, unauthorized } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await getAuthenticatedClient();
    const currentUser = await getCurrentUser(supabase);
    if (!currentUser) return unauthorized();
    if (!isAdmin(currentUser.role)) return forbidden();

    const { id } = await params;

    const { error } = await supabase
      .from("analytics_suppliers")
      .delete()
      .eq("id", id);

    if (error) {
      return internalError(error);
    }

    return NextResponse.json({ success: true });
  } catch {
    return internalError(new Error("Failed to delete supplier"));
  }
}

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
    const body = await request.json();
    const { name, code, contact_person, phone, email } = body;

    const { error } = await supabase
      .from("analytics_suppliers")
      .update({
        ...(name !== undefined && { name }),
        ...(code !== undefined && { code }),
        ...(contact_person !== undefined && { contact_person }),
        ...(phone !== undefined && { phone }),
        ...(email !== undefined && { email }),
      })
      .eq("id", id);

    if (error) {
      return internalError(error);
    }

    return NextResponse.json({ success: true });
  } catch {
    return internalError(new Error("Failed to update supplier"));
  }
}