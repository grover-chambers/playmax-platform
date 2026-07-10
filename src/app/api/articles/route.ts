import { NextResponse } from "next/server";
import {
  getAuthenticatedClient,
  getCurrentUser,
  isAdmin,
} from "@/lib/supabase/api";

export async function GET() {
  try {
    const supabase = await getAuthenticatedClient();
    const currentUser = await getCurrentUser(supabase);

    let query = supabase.from("articles").select("*");

    if (!currentUser || !isAdmin(currentUser.role)) {
      query = query.eq("published", true);
    }

    query = query.order("date", { ascending: false });

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch articles" },
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
    const {
      slug,
      title,
      category,
      author,
      date,
      read_time,
      excerpt,
      content,
      image_url,
      image_alt,
      tags,
      published,
    } = body;

    if (!slug || !title || !excerpt || !content || !image_url) {
      return NextResponse.json(
        { error: "Missing required fields: slug, title, excerpt, content, image_url" },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from("articles")
      .insert({
        slug,
        title,
        category: category || "General",
        author: author || "PlayMax Team",
        date: date || new Date().toISOString().split("T")[0],
        read_time: read_time || "5 min read",
        excerpt,
        content,
        image_url,
        image_alt: image_alt || "",
        tags: tags || [],
        published: published !== undefined ? published : true,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "An article with this slug already exists" },
          { status: 409 },
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Failed to create article" },
      { status: 500 },
    );
  }
}
