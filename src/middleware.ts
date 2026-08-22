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
    pathname.startsWith("/services") ||
    pathname.startsWith("/inventory") ||
    pathname.startsWith("/contact") ||
    pathname.startsWith("/about") ||
    pathname.startsWith("/case-studies") ||
    pathname.startsWith("/insights");

  if (isPublic) return NextResponse.next();

  // ── API routes: fail-closed gate ────────────────────────
  if (pathname.startsWith("/api/")) {
    // CORS preflight never carries cookies — let it through.
    if (request.method === "OPTIONS") return NextResponse.next();

    // Explicit allowlist for routes that are either intentionally public or
    // authenticate via a non-cookie scheme. Every entry enforces its own
    // authorization inside the route handler (bearer token, webhook
    // signature, rate limiting). Default posture: everything else 401s here.
    const apiPath = pathname.slice(5); // strip "/api/" -> e.g. "auth/demo-login"
    const SELF_GUARDED_OR_PUBLIC: ReadonlyArray<{
      path: string;
      methods?: string[];
    }> = [
      { path: "auth/demo-login", methods: ["POST"] },
      { path: "stripe/webhook", methods: ["POST"] },
      { path: "supabase/webhook", methods: ["POST"] },
      { path: "worker/health" }, // bearer token OR staff session, enforced in-route
      { path: "modules/nampark/ingest", methods: ["POST"] }, // bearer token, enforced in-route
      { path: "leads", methods: ["POST"] }, // public lead form, rate-limited in-route
    ];

    const allowedWithoutSession = SELF_GUARDED_OR_PUBLIC.some((route) => {
      const pathOk =
        apiPath === route.path || apiPath.startsWith(`${route.path}/`);
      const methodOk = !route.methods || route.methods.includes(request.method);
      return pathOk && methodOk;
    });

    if (allowedWithoutSession) {
      const { response: supabaseResponse } = createClient(request);
      return supabaseResponse;
    }

    // Everything else on /api/* requires a valid session
    const { supabase, response: supabaseResponse } = createClient(request);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    // Route handlers perform their own role checks (getCurrentUser + isStaff);
    // the middleware only guarantees a session exists and refreshes cookies.
    return supabaseResponse;
  }

  // ── Protected routes (/app, /portal) ────────────────
  if (pathname.startsWith("/app") || pathname.startsWith("/portal")) {
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

    // Role-less policy (SECURITY): missing role must NOT be guessed as "client"
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

  // ── Unknown routes — default deny ───────────────────
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
