import { NextResponse } from "next/server";
import { getAuthenticatedClient, getCurrentUser, isAdmin } from "@/lib/supabase/api";
import { forbidden, internalError, unauthorized } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await getAuthenticatedClient();
    const currentUser = await getCurrentUser(supabase);
    if (!currentUser) return unauthorized();
    if (!isAdmin(currentUser.role)) return forbidden();

    const { data, error } = await supabase
      .from("clients")
      .select("id, name, company")
      .order("name");

    if (error) return internalError(error);
    return NextResponse.json({ clients: data ?? [] });
  } catch {
    return internalError(new Error("Failed to fetch clients"));
  }
}
