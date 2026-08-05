import { NextResponse } from "next/server";

/**
 * Unified error envelope: `{ error: { code, message } }`.
 * Use these helpers instead of leaking raw `error.message` to clients.
 */

export function apiError(
  code: string,
  message: string,
  status = 400,
): NextResponse {
  return NextResponse.json({ error: { code, message } }, { status });
}

export function unauthorized(): NextResponse {
  return apiError("unauthorized", "Unauthorized", 401);
}

export function forbidden(): NextResponse {
  return apiError("forbidden", "Forbidden", 403);
}

export function notFound(msg = "Not found"): NextResponse {
  return apiError("not_found", msg, 404);
}

/**
 * Logs the internal error and returns a generic 500 so stack traces and
 * DB/SQL details never leak to clients.
 */
export function internalError(err: unknown): NextResponse {
  console.error("[internalError]", err);
  return apiError("internal", "Internal server error", 500);
}

/**
 * Kept for existing callers. Returns the real error message in development
 * and a generic fallback in production.
 */
export function sanitizeError(
  error: unknown,
  fallback = "Internal server error",
): string {
  if (process.env.NODE_ENV === "development") {
    return error instanceof Error ? error.message : fallback;
  }
  return fallback;
}
