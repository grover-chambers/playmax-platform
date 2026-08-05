import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedClient, getCurrentUser, isAdmin } from "@/lib/supabase/api";
import { withPgFallback } from "@/lib/db-fallback";
import { queryMany } from "@/lib/db";
import { apiError, forbidden, internalError, unauthorized } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await getAuthenticatedClient();
    const currentUser = await getCurrentUser(supabase);
    if (!currentUser) return unauthorized();
    if (!isAdmin(currentUser.role)) return forbidden();

    const suppliers = await withPgFallback(
      async () => {
        const { data, error } = await supabase
          .from("analytics_suppliers")
          .select("id, name, code, contact_person, phone, email")
          .order("name");
        if (error) throw error;
        return data ?? [];
      },
      () => queryMany<{ id: string; name: string; code: string | null; contact_person: string | null; phone: string | null; email: string | null }>(
        `SELECT id, name, code, contact_person, phone, email FROM analytics_suppliers ORDER BY name`,
      ),
      "getAllSuppliers",
    );

    return NextResponse.json({ suppliers });
  } catch {
    return NextResponse.json({ error: "Failed to fetch suppliers" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await getAuthenticatedClient();
    const currentUser = await getCurrentUser(supabase);
    if (!currentUser) return unauthorized();
    if (!isAdmin(currentUser.role)) return forbidden();

    const body = await request.json();
    const { name, code, contact_person, phone, email } = body;

    if (!name || !name.trim()) {
      return apiError("validation", "Supplier name is required");
    }

    const { data, error } = await supabase
      .from("analytics_suppliers")
      .insert({ name: name.trim(), code: code || null, contact_person: contact_person || null, phone: phone || null, email: email || null })
      .select("id, name")
      .single();

    if (error) {
      return internalError(error);
    }

    return NextResponse.json({ supplier: data });
  } catch {
    return internalError(new Error("Failed to create supplier"));
  }
}