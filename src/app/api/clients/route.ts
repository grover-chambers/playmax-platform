import { NextResponse } from "next/server";
import { getAuthenticatedClient, getCurrentUser, isAdmin, isStaff } from "@/lib/supabase/api";
import { sanitizeError } from "@/lib/errors";
import { onboardClient } from "@/lib/onboarding";
import { syncClientScope } from "@/lib/analytics-scope";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await getAuthenticatedClient();
    const currentUser = await getCurrentUser(supabase);

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // Client records are internal CRM data — staff route only.
    if (!isStaff(currentUser.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let query = supabase
      .from("clients")
      .select("*")
      .order("created_at", { ascending: false });

    if (currentUser.role === "crm_staff") {
      query = query.eq("assigned_to", currentUser.id);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: sanitizeError(error) }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch clients" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await getAuthenticatedClient();
    const currentUser = await getCurrentUser(supabase);

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isAdmin(currentUser.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { name, company, industry, website, phone, email, assigned_to, category_ids, linked_supplier_id } = body;

    if (!name || !email) {
      return NextResponse.json(
        { error: "Name and email are required" },
        { status: 400 },
      );
    }

    const categoryIdList: string[] = Array.isArray(category_ids)
      ? category_ids.filter(Boolean)
      : category_ids
        ? [category_ids]
        : [];

    const { data: created, error } = await supabase
      .from("clients")
      .insert({
        name,
        company: company || name,
        industry,
        website,
        phone,
        email,
        assigned_to,
        status: "active",
        category_id: categoryIdList[0] || null,
        linked_supplier_id: linked_supplier_id || null,
      })
      .select("id")
      .single();

    if (error) {
      return NextResponse.json({ error: sanitizeError(error) }, { status: 500 });
    }

    const clientId = created.id;

    if (categoryIdList.length > 0) {
      const categoryRows = categoryIdList.map((cid, idx) => ({
        client_id: clientId,
        category_id: cid,
        is_primary: idx === 0,
        created_by: currentUser.id,
      }));
      const { error: catErr } = await supabase
        .from("client_categories")
        .insert(categoryRows);
      if (catErr) {
        console.error("Failed to assign categories:", catErr);
      }
    }

    const onboarding = await onboardClient({ email, name, company: company || name });

    if (onboarding.userId) {
      const { error: linkErr } = await supabase
        .from("client_users")
        .insert({
          client_id: clientId,
          user_id: onboarding.userId,
          portal_role: "admin",
        });
      if (linkErr) {
        console.error("Failed to link client user:", linkErr);
      }
    }

    try {
      await syncClientScope(clientId);
    } catch (scopeErr) {
      console.error("Failed to sync client scope:", scopeErr);
    }

    return NextResponse.json({
      success: true,
      clientId,
      onboarding: onboarding.success
        ? { emailSent: true }
        : { emailSent: false, reason: onboarding.reason },
    }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
