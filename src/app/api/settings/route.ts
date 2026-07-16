import { NextResponse } from "next/server";
import {
  getAuthenticatedClient,
  getCurrentUser,
  isAdmin,
} from "@/lib/supabase/api";
import { sanitizeError } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await getAuthenticatedClient();
    const currentUser = await getCurrentUser(supabase);

    if (!currentUser || !isAdmin(currentUser.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("org_settings")
      .select("*")
      .order("key");

    if (error) {
      return NextResponse.json({ error: sanitizeError(error) }, { status: 500 });
    }

    // Convert array of {key, value} to a flat object for easier consumption
    const settings: Record<string, unknown> = {};
    (data ?? []).forEach((row) => {
      settings[row.key] = row.value;
    });

    return NextResponse.json({ settings, raw: data ?? [] });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await getAuthenticatedClient();
    const currentUser = await getCurrentUser(supabase);

    if (!currentUser || !isAdmin(currentUser.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { key, value } = body;

    if (!key || value === undefined) {
      return NextResponse.json(
        { error: "Missing required fields: key, value" },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from("org_settings")
      .upsert(
        { key, value, updated_by: currentUser.id },
        { onConflict: "key" }
      )
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: sanitizeError(error) }, { status: 500 });
    }

    return NextResponse.json({ setting: data });
  } catch {
    return NextResponse.json(
      { error: "Failed to update setting" },
      { status: 500 },
    );
  }
}
