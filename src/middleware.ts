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

  // A missing role must NEVER bounce an authenticated user back to /login.
  // The auth callback backfills `client` via the Admin API (service-role key);
  // between sign-in and that backfill, treat the user as a client.
  // The /app staff area is still protected: a role-less user goes to /portal,
  // never /login — so there is no redirect chain that loops.
  if (!role) {
    if (pathname.startsWith("/app")) {
      console.warn(`[middleware] No role for user ${user.id} on staff path ${pathname} — redirecting to portal`);
      const url = request.nextUrl.clone();
      url.pathname = "/portal";
      return NextResponse.redirect(url);
    }
    // /portal (and anything else) is safe for a role-less authenticated user:
    // the portal layout and user-context default to "client".
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
