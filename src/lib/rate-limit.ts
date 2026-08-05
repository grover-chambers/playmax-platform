import { createHmac } from "crypto";
import { NextResponse } from "next/server";
import { queryOne } from "@/lib/db";

/**
 * DB-backed rate limiter.
 *
 * Replaces the previous in-memory Map limiter. The window state lives in
 * `public.api_rate_limits` (migration 053) so the limiter is correct across
 * serverless instances on Vercel. Client identifiers are HMAC'd with
 * RATE_LIMIT_PEPPER before being stored so raw IPs never touch the table.
 */

export interface RateLimitOptions {
  /** Window length in seconds. */
  windowSec: number;
  /** Maximum number of requests allowed within the window. */
  maxRequests: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  /** Seconds until the window resets. 0 when allowed. */
  retryAfterSec: number;
}

const PEPPER = process.env.RATE_LIMIT_PEPPER || "rate-limit";

/**
 * Returns the client IP from the LAST hop of `x-forwarded-for`.
 * Vercel appends the real client IP last, so earlier entries may be
 * user-controlled. `x-real-ip` is never trusted.
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const parts = forwarded
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
    const last = parts[parts.length - 1];
    if (last) return last;
  }
  return "127.0.0.1";
}

/** HMAC a client identifier so raw IPs / user ids are not persisted. */
export function hashClientKey(clientKey: string): string {
  return createHmac("sha256", PEPPER).update(clientKey).digest("hex");
}

interface RateLimitRow {
  count: number;
  window_start: Date | string;
}

/**
 * Single-query atomic limiter. The upsert resets the count when the window
 * has fully elapsed, otherwise it increments it:
 *
 *   INSERT ... ON CONFLICT (route_key, client_key) DO UPDATE
 *   SET count = CASE
 *         WHEN window_start + make_interval(secs => $window) <= now() THEN 1
 *         ELSE count + 1
 *       END
 *
 * Fails open (logs + allows) if the store is unavailable so rate limiting
 * never becomes an availability hazard.
 *
 * @param routeKey          logical route namespace (e.g. "leads")
 * @param request           the incoming request (IP is derived from it)
 * @param options           windowSec + maxRequests
 * @param clientKeyOverride optional explicit client key (e.g. an
 *                          authenticated client/user id) instead of the IP
 */
export async function rateLimit(
  routeKey: string,
  request: Request,
  options: RateLimitOptions,
  clientKeyOverride?: string,
): Promise<RateLimitResult> {
  const clientKey = hashClientKey(clientKeyOverride || getClientIp(request));
  const { windowSec, maxRequests } = options;

  try {
    const row = await queryOne<RateLimitRow>(
      `INSERT INTO public.api_rate_limits (route_key, client_key, window_start, count)
       VALUES ($1, $2, now(), 1)
       ON CONFLICT (route_key, client_key) DO UPDATE SET
         count = CASE
           WHEN api_rate_limits.window_start + make_interval(secs => $3::int) <= now() THEN 1
           ELSE api_rate_limits.count + 1
         END,
         window_start = CASE
           WHEN api_rate_limits.window_start + make_interval(secs => $3::int) <= now() THEN now()
           ELSE api_rate_limits.window_start
         END
       RETURNING count AS count, window_start AS window_start`,
      [routeKey, clientKey, windowSec],
    );

    if (!row) {
      // Should not happen after INSERT..RETURNING, but be defensive.
      return { allowed: true, remaining: maxRequests, retryAfterSec: 0 };
    }

    const count = Number(row.count);
    if (count > maxRequests) {
      const windowStart = new Date(row.window_start as string).getTime();
      const windowEnd = windowStart + windowSec * 1000;
      const retryAfterSec = Math.max(
        1,
        Math.ceil((windowEnd - Date.now()) / 1000),
      );
      return { allowed: false, remaining: 0, retryAfterSec };
    }

    return {
      allowed: true,
      remaining: Math.max(0, maxRequests - count),
      retryAfterSec: 0,
    };
  } catch (err) {
    // Fail open: the API must keep serving even if the limiter store breaks.
    console.error("[rate-limit] store error, allowing request:", err);
    return { allowed: true, remaining: maxRequests, retryAfterSec: 0 };
  }
}

/** Standard 429 response with Retry-After header and error envelope. */
export function rateLimitResponse(retryAfterSec: number): NextResponse {
  const sec = Math.max(1, Math.ceil(retryAfterSec));
  return NextResponse.json(
    {
      error: {
        code: "rate_limited",
        message: `Too many requests. Try again in ${sec}s.`,
      },
    },
    { status: 429, headers: { "Retry-After": String(sec) } },
  );
}
