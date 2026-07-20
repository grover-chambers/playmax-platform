import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedClient, getCurrentUser } from "@/lib/supabase/api";
import { getPortalClient } from "@/lib/portal";
import { sanitizeError } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const supabase = await getAuthenticatedClient();
    const currentUser = await getCurrentUser(supabase);
    if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const client = await getPortalClient(supabase, currentUser.id);
    if (!client) return NextResponse.json({ error: "No client account linked" }, { status: 404 });

    const { searchParams } = new URL(req.url);
    const slug = searchParams.get("slug");

    if (slug) {
      const { data, error } = await supabase
        .from("cms_content")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();

      if (error) return NextResponse.json({ error: sanitizeError(error) }, { status: 500 });
      if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json({ article: data });
    }

    const { data, error } = await supabase
      .from("cms_content")
      .select("id, title, slug, excerpt, category, published_at")
      .eq("published", true)
      .order("published_at", { ascending: false });

    if (error) {
      if (error.code === "42P01") return NextResponse.json({ articles: [] });
      return NextResponse.json({ error: sanitizeError(error) }, { status: 500 });
    }
    return NextResponse.json({ articles: data || [] });
  } catch {
    return NextResponse.json({ error: "Failed to fetch content" }, { status: 500 });
  }
}
