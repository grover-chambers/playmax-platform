import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ensureDefaultRole } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      // Backfill the default `client` role for users who never got one in
      // app_metadata (OAuth sign-ups, invites that wrote user_metadata, and
      // pre-migration users). This runs BEFORE any redirect so middleware can
      // never bounce these users in a login loop. Idempotent: only fires when
      // the role is missing, and merges existing app_metadata.
      const role = user?.app_metadata?.role as string | undefined;
      if (user && !role) {
        await ensureDefaultRole(user);
      }

      // Portal next paths are honored only for clients; staff are sent to their default
      if (next?.startsWith("/portal") && role === "client") {
        return NextResponse.redirect(`${origin}${next}`);
      }
      if (next?.startsWith("/portal") && role) {
        return NextResponse.redirect(`${origin}/app/pipeline`);
      }
      if (next === "/login") {
        return NextResponse.redirect(`${origin}${next}`);
      }

      // Otherwise, check user role to pick the right default. A user without a
      // role (just backfilled, or service-role key unavailable) lands on the
      // client portal — never a staff area.
      if (role === "client" || !role) {
        return NextResponse.redirect(`${origin}/portal`);
      }
      return NextResponse.redirect(`${origin}${next || "/app/pipeline"}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
