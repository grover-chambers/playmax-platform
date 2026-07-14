import { NextResponse } from "next/server";
import { getAuthenticatedClient, getCurrentUser, isAdmin } from "@/lib/supabase/api";
import { sanitizeError } from "@/lib/errors";

export async function GET() {
  try {
    const supabase = await getAuthenticatedClient();
    const currentUser = await getCurrentUser(supabase);
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!isAdmin(currentUser.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [branchesRes, categoriesRes, manufacturersRes, productCountRes] =
      await Promise.all([
        supabase
          .from("analytics_branches")
          .select("*")
          .eq("active", true)
          .order("code"),
        supabase
          .from("analytics_categories")
          .select("*")
          .order("name"),
        supabase
          .from("analytics_manufacturers")
          .select("*")
          .order("name"),
        supabase
          .from("analytics_products")
          .select("id", { count: "exact", head: true }),
      ]);

    if (branchesRes.error)
      return NextResponse.json(
        { error: sanitizeError(branchesRes.error) },
        { status: 500 },
      );
    if (categoriesRes.error)
      return NextResponse.json(
        { error: sanitizeError(categoriesRes.error) },
        { status: 500 },
      );
    if (manufacturersRes.error)
      return NextResponse.json(
        { error: sanitizeError(manufacturersRes.error) },
        { status: 500 },
      );

    return NextResponse.json({
      branches: branchesRes.data ?? [],
      categories: categoriesRes.data ?? [],
      manufacturers: manufacturersRes.data ?? [],
      productCount: productCountRes.count ?? 0,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch dimensions" },
      { status: 500 },
    );
  }
}
