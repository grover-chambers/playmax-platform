import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // If an explicit next path was provided and it's portal-safe, use it
      if (next && (next.startsWith("/portal") || next === "/login")) {
        return NextResponse.redirect(`${origin}${next}`);
      }

      // Otherwise, check user role to pick the right default
      const { data: { user } } = await supabase.auth.getUser();
      const role = user?.user_metadata?.role;
      if (role === "client") {
        return NextResponse.redirect(`${origin}/portal`);
      }
      return NextResponse.redirect(`${origin}${next || "/app/pipeline"}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
