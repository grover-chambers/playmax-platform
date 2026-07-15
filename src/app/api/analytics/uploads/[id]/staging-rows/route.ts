import { NextResponse } from "next/server";
import { getAuthenticatedClient, getCurrentUser, isAdmin } from "@/lib/supabase/api";
import { sanitizeError } from "@/lib/errors";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const supabase = await getAuthenticatedClient();
    const currentUser = await getCurrentUser(supabase);
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("analytics_staging_rows")
      .select("*")
      .eq("upload_id", id)
      .order("row_number");

    if (error) {
      return NextResponse.json(
        { error: sanitizeError(error) },
        { status: 500 },
      );
    }

    return NextResponse.json({ rows: data ?? [] });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch staging rows" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const supabase = await getAuthenticatedClient();
    const currentUser = await getCurrentUser(supabase);
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!isAdmin(currentUser.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { rows } = body;

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json(
        { error: "rows array is required" },
        { status: 400 },
      );
    }

    const rowsToInsert = rows.map(
      (row: {
        row_number: number;
        stock_code?: string;
        product_name?: string;
        sub_category?: string;
        unit_cost?: number;
        unit_price?: number;
        quantity?: number;
        weight_tonnes?: number;
        total_amount?: number;
        raw_data?: Record<string, unknown>;
      }) => ({
        upload_id: id,
        row_number: row.row_number,
        stock_code: row.stock_code ?? null,
        product_name: row.product_name ?? null,
        sub_category: row.sub_category ?? null,
        unit_cost: row.unit_cost ?? null,
        unit_price: row.unit_price ?? null,
        quantity: row.quantity ?? null,
        weight_tonnes: row.weight_tonnes ?? null,
        total_amount: row.total_amount ?? null,
        raw_data: row.raw_data ?? null,
      }),
    );

    const { data: insertedRows, error } = await supabase
          .from("analytics_staging_rows")
          .insert(rowsToInsert)
          .select();

        if (error) {
          return NextResponse.json(
            { error: sanitizeError(error) },
            { status: 500 },
          );
        }

        // Update upload total_rows count
        await supabase
          .from("analytics_staging_uploads")
          .update({
            total_rows: rows.length,
            status: "parsed",
          })
          .eq("id", id);

        return NextResponse.json({ rows: insertedRows }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Failed to insert staging rows" },
      { status: 500 },
    );
  }
}
