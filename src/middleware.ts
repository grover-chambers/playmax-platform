import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/middleware";
import { canAccess, getDefaultRedirect } from "@/lib/roles";
import type { UserRole } from "@/lib/types";

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // ── Public routes — always allow, skip auth ────────
  const isPublic =
    pathname === "/login" ||
    pathname === "/forgot-password" ||
    pathname.startsWith("/auth/") ||
    pathname === "/" ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/services") ||
    pathname.startsWith("/inventory") ||
    pathname.startsWith("/contact") ||
    pathname.startsWith("/about") ||
    pathname.startsWith("/case-studies") ||
    pathname.startsWith("/insights");

  if (isPublic) return NextResponse.next();

  // ── Protected routes only from here ────────────────
  const isProtected =
    pathname.startsWith("/app") || pathname.startsWith("/portal");

  if (!isProtected) return NextResponse.next();

  const { supabase, response: supabaseResponse } = createClient(request);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  const role = user.app_metadata?.role as UserRole | undefined;

  // ── Role-less policy (SECURITY) ──────────────────────────────────────
  // A missing app_metadata.role (pre-backfill session, invite that wrote
  // user_metadata, pre-migration account) must NEVER be guessed as "client".
  // That silent default bounced role-less staff (demo.cmsadmin etc.) into the
  // client portal. Instead: honor the zone the user is trying to enter.
  //   - /app → staff-intent: ALLOW through. No redirect to /portal (the bug)
  //     and no redirect to /login (would loop — the user is authenticated).
  //   - /portal → client-intent: ALLOW through; the portal layout renders it
  //     and the portal APIs reject role-less callers, so no data is exposed.
  // The auth callback / demo-login backfill the real role via the Admin API;
  // the app layout + API guards fail closed until then.
  if (!role) {
    return supabaseResponse;
  }

  if (!canAccess(role, pathname)) {
    console.warn(`[middleware] Access denied: role=${role}, path=${pathname}`);
    const url = request.nextUrl.clone();
    url.pathname = getDefaultRedirect(role);
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
