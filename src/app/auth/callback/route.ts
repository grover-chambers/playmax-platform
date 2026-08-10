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

      // Backfill a missing role in app_metadata BEFORE any redirect so
      // middleware can never bounce these users in a login loop. Resolves
      // known accounts (by email) to their true role — e.g. a role-less
      // demo.cmsadmin backfills to cms_admin, NOT client — and defaults
      // unknown accounts to least-privilege client. Idempotent: only fires
      // when the role is missing, and merges existing app_metadata.
      let role = user?.app_metadata?.role as string | undefined;
      if (user && !role) {
        role = await ensureDefaultRole(user);
      }

      // Portal next paths are honored only for clients; staff (and role-less
      // staff-intent users) are sent to their staff default.
      if (next?.startsWith("/portal")) {
        if (role === "client") {
          return NextResponse.redirect(`${origin}${next}`);
        }
        return NextResponse.redirect(`${origin}/app/pipeline`);
      }
      if (next === "/login") {
        return NextResponse.redirect(`${origin}${next}`);
      }

      // Otherwise, use the (possibly backfilled) role to pick the right
      // default: clients land in the portal, staff land in the staff app.
      if (!role) {
        return NextResponse.redirect(`${origin}/portal`);
      }
      if (role === "client") {
        return NextResponse.redirect(`${origin}/portal`);
      }
      return NextResponse.redirect(`${origin}${next || "/app/pipeline"}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
