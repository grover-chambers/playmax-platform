import { NextResponse } from "next/server";
import { getAuthenticatedClient, getCurrentUser } from "@/lib/supabase/api";
import { getAdminClient } from "@/lib/supabase/admin";
import { sanitizeError } from "@/lib/errors";

export const dynamic = "force-dynamic";

const WRITER_ROLES = ["super_admin", "data_handler"] as const;

type Resource = "categories" | "subcategories" | "products";

const TABLE_BY_RESOURCE: Record<Resource, string> = {
  categories: "analytics_categories",
  subcategories: "analytics_subcategories",
  products: "analytics_products",
};

function isWriter(role: string | null | undefined): boolean {
  return !!role && (WRITER_ROLES as readonly string[]).includes(role);
}

export async function POST(
  request: Request,
  context: { params: Promise<{ resource: string }> },
) {
  const { resource } = await context.params;
  if (!(resource in TABLE_BY_RESOURCE)) {
    return NextResponse.json({ error: "Unknown resource" }, { status: 400 });
  }
  const table = TABLE_BY_RESOURCE[resource as Resource];

  try {
    const supabase = await getAuthenticatedClient();
    const currentUser = await getCurrentUser(supabase);
    if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!isWriter(currentUser.role)) {
      return NextResponse.json({ error: "Forbidden — write access requires data_handler or super_admin" }, { status: 403 });
    }

    const body = await request.json();
    const db = getAdminClient();

    let insert: Record<string, unknown>;
    if (resource === "categories") {
      if (!body.name) return NextResponse.json({ error: "name is required" }, { status: 400 });
      insert = { name: body.name, description: body.description ?? null };
    } else if (resource === "subcategories") {
      if (!body.name || !body.category_id) {
        return NextResponse.json({ error: "name and category_id are required" }, { status: 400 });
      }
      insert = { name: body.name, category_id: body.category_id };
    } else {
      if (!body.name || !body.stock_code) {
        return NextResponse.json({ error: "name and stock_code are required" }, { status: 400 });
      }
      insert = {
        name: body.name,
        stock_code: body.stock_code,
        category_id: body.category_id ?? null,
        manufacturer_id: body.manufacturer_id ?? null,
        sub_category: body.sub_category ?? null,
        unit_of_measure: body.unit_of_measure ?? "pcs",
        active: body.active ?? true,
      };
    }

    const { data, error } = await db.from(table).insert(insert).select().single();
    if (error) {
      const msg = sanitizeError(error);
      if (error.code === "23505") {
        return NextResponse.json({ error: "A record with this unique value already exists" }, { status: 409 });
      }
      return NextResponse.json({ error: msg }, { status: 500 });
    }
    return NextResponse.json({ [resource.slice(0, -1)]: data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create record" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ resource: string }> },
) {
  const { resource } = await context.params;
  if (!(resource in TABLE_BY_RESOURCE)) {
    return NextResponse.json({ error: "Unknown resource" }, { status: 400 });
  }
  const table = TABLE_BY_RESOURCE[resource as Resource];

  try {
    const supabase = await getAuthenticatedClient();
    const currentUser = await getCurrentUser(supabase);
    if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!isWriter(currentUser.role)) {
      return NextResponse.json({ error: "Forbidden — write access requires data_handler or super_admin" }, { status: 403 });
    }

    const body = await request.json();
    const id = body.id as string;
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    const db = getAdminClient();
    const allowed: Record<string, Record<string, unknown>> = {
      categories: { name: body.name, description: body.description },
      subcategories: { name: body.name, category_id: body.category_id },
      products: {
        name: body.name,
        stock_code: body.stock_code,
        category_id: body.category_id,
        manufacturer_id: body.manufacturer_id,
        sub_category: body.sub_category,
        unit_of_measure: body.unit_of_measure,
        active: body.active,
      },
    };
    const cleaned: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(allowed[resource])) {
      if (v !== undefined) cleaned[k] = v;
    }
    if (Object.keys(cleaned).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const { data, error } = await db.from(table).update(cleaned).eq("id", id).select().single();
    if (error) return NextResponse.json({ error: sanitizeError(error) }, { status: 500 });
    return NextResponse.json({ [resource.slice(0, -1)]: data });
  } catch {
    return NextResponse.json({ error: "Failed to update record" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ resource: string }> },
) {
  const { resource } = await context.params;
  if (!(resource in TABLE_BY_RESOURCE)) {
    return NextResponse.json({ error: "Unknown resource" }, { status: 400 });
  }
  const table = TABLE_BY_RESOURCE[resource as Resource];

  try {
    const supabase = await getAuthenticatedClient();
    const currentUser = await getCurrentUser(supabase);
    if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!isWriter(currentUser.role)) {
      return NextResponse.json({ error: "Forbidden — write access requires data_handler or super_admin" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id query param is required" }, { status: 400 });

    const db = getAdminClient();
    const { error } = await db.from(table).delete().eq("id", id);
    if (error) return NextResponse.json({ error: sanitizeError(error) }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete record" }, { status: 500 });
  }
}
