import { NextResponse } from "next/server";
import {
  getAuthenticatedClient,
  getCurrentUser,
  isAdmin,
} from "@/lib/supabase/api";
import { sanitizeError } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: contentId } = await params;
  try {
    const supabase = await getAuthenticatedClient();
    const currentUser = await getCurrentUser(supabase);
    if (!currentUser || !isAdmin(currentUser.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;

    const statusMap: Record<string, string> = {
      submit: "review",
      publish: "published",
      archive: "archived",
    };

    const newStatus = statusMap[action];
    if (!newStatus) {
      return NextResponse.json(
        { error: "action must be submit, publish, or archive" },
        { status: 400 },
      );
    }

    const updatePayload: Record<string, unknown> = {
      workflow_status: newStatus,
    };

    if (action === "publish") {
      updatePayload.published_by = currentUser.id;
    }

    const { data, error } = await supabase
      .from("cms_content")
      .update(updatePayload)
      .eq("id", contentId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: sanitizeError(error) }, { status: 500 });
    }

    return NextResponse.json({ content: data });
  } catch {
    return NextResponse.json(
      { error: "Failed to update content workflow" },
      { status: 500 },
    );
  }
}
