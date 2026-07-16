import { NextResponse } from "next/server";
import {
  getAuthenticatedClient,
  getCurrentUser,
  isAdmin,
} from "@/lib/supabase/api";
import { sanitizeError } from "@/lib/errors";

export async function GET(request: Request) {
  try {
    const supabase = await getAuthenticatedClient();
    const currentUser = await getCurrentUser(supabase);

    if (!currentUser || !isAdmin(currentUser.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const entityType = searchParams.get("entity_type");
    const userId = searchParams.get("user_id");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const offset = (page - 1) * limit;

    let query = supabase
      .from("audit_log")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (entityType) query = query.eq("entity_type", entityType);
    if (userId) query = query.eq("user_id", userId);
    if (from) query = query.gte("created_at", from);
    if (to) query = query.lte("created_at", to);

    const { data, error, count } = await query;

    if (error) {
      return NextResponse.json({ error: sanitizeError(error) }, { status: 500 });
    }

    return NextResponse.json({
      entries: data ?? [],
      total: count ?? 0,
      page,
      limit,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch audit log" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await getAuthenticatedClient();
    const currentUser = await getCurrentUser(supabase);

    if (!currentUser || !isAdmin(currentUser.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action, entity_type, entity_id, entity_name, details, ip_address } = body;

    if (!action || !entity_type) {
      return NextResponse.json(
        { error: "Missing required fields: action, entity_type" },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from("audit_log")
      .insert({
        user_id: currentUser.id,
        user_email: currentUser.email,
        user_role: currentUser.role,
        action,
        entity_type,
        entity_id: entity_id || null,
        entity_name: entity_name || null,
        details: details || {},
        ip_address: ip_address || null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: sanitizeError(error) }, { status: 500 });
    }

    return NextResponse.json({ entry: data }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Failed to create audit entry" },
      { status: 500 },
    );
  }
}
