import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/middleware";
import { canAccess, getDefaultRedirect } from "@/lib/roles";
import type { UserRole } from "@/lib/types";

export async function middleware(request: NextRequest) {
  const { supabase, response: supabaseResponse } = createClient(request);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // ── Public routes — always allow ───────────────────
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

  if (isPublic) {
    return supabaseResponse;
  }

  // ── Protected routes — require authentication ──────
  const isProtected =
    pathname.startsWith("/app") || pathname.startsWith("/portal");

  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // ── Role-based access control ───────────────────────
  if (user && isProtected) {
    const role = (user.user_metadata?.role as UserRole) || "client";

    if (!canAccess(role, pathname)) {
      const url = request.nextUrl.clone();
      url.pathname = getDefaultRedirect(role);
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
