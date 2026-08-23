import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import {
  getAuthenticatedClient,
  getCurrentUser,
  isStaff,
} from "@/lib/supabase/api";
import { apiError, forbidden, internalError, unauthorized } from "@/lib/errors";
import { fieldTeamActionSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

/**
 * Field team provisioning — proxies the NAMPARK RMS admin rep API
 * (GET /api/v1/admin/reps and POST with action create|deactivate).
 * PlayMax never writes RMS's database directly; all access is via this
 * REST surface authenticated with REP_ADMIN_SECRET.
 */

const RMS_TIMEOUT_MS = 10_000;

interface RmsRep {
  id: string;
  userId?: string | null;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  isActive?: boolean;
}

interface RmsConfig {
  baseUrl: string;
  secret: string;
}

function getRmsConfig(): RmsConfig | null {
  const baseUrl = process.env.NAMPARK_RMS_URL?.replace(/\/+$/, "");
  const secret = process.env.REP_ADMIN_SECRET;
  if (!baseUrl || !secret) return null;
  return { baseUrl, secret };
}

async function rmsRequest(
  config: RmsConfig,
  path: string,
  init?: RequestInit,
): Promise<unknown> {
  try {
    const res = await fetch(`${config.baseUrl}${path}`, {
      ...init,
      headers: {
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        Authorization: `Bearer ${config.secret}`,
      },
      signal: AbortSignal.timeout(RMS_TIMEOUT_MS),
      cache: "no-store",
    });
    if (!res.ok) {
      console.warn(`[field-team] RMS request failed with status ${res.status}`);
      return null;
    }
    return await res.json();
  } catch (err) {
    console.warn(
      "[field-team] RMS request failed:",
      err instanceof Error ? err.message : err,
    );
    return null;
  }
}

export async function GET() {
  try {
    const supabase = await getAuthenticatedClient();
    const currentUser = await getCurrentUser(supabase);
    if (!currentUser) return unauthorized();
    if (!isStaff(currentUser.role)) return forbidden();

    const config = getRmsConfig();
    if (!config) {
      return apiError(
        "not_configured",
        "RMS integration is not configured on this deployment",
        500,
      );
    }

    const payload = await rmsRequest(config, "/api/v1/admin/reps");
    const rows =
      payload &&
      typeof payload === "object" &&
      Array.isArray((payload as { data?: unknown }).data)
        ? ((payload as { data: unknown[] }).data as RmsRep[])
        : null;

    if (!rows) {
      return apiError(
        "rms_unavailable",
        "The RMS service could not be reached. Try again shortly.",
        502,
      );
    }

    const reps = rows.map((rep) => ({
      id: rep.id,
      name: rep.name ?? "",
      email: rep.email ?? "",
      phone: rep.phone ?? "",
      isActive: rep.isActive ?? false,
    }));

    return NextResponse.json({ reps });
  } catch (err) {
    return internalError(err);
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await getAuthenticatedClient();
    const currentUser = await getCurrentUser(supabase);
    if (!currentUser) return unauthorized();
    if (!isStaff(currentUser.role)) return forbidden();

    const config = getRmsConfig();
    if (!config) {
      return apiError(
        "not_configured",
        "RMS integration is not configured on this deployment",
        500,
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return apiError("validation", "Invalid JSON body");
    }

    const parsed = fieldTeamActionSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("validation", "Invalid field team action payload");
    }

    const { action, email } = parsed.data;

    // Passwords are generated server-side and never accepted from clients;
    // the generated value is returned once so an admin can hand it to the rep.
    const tempPassword =
      action === "create" ? randomBytes(9).toString("base64url") : undefined;

    const rmsPayload: Record<string, unknown> = { action, email };
    if (parsed.data.name) rmsPayload.name = parsed.data.name;
    if (parsed.data.phone) rmsPayload.phone = parsed.data.phone;
    if (tempPassword) rmsPayload.password = tempPassword;

    const payload = await rmsRequest(config, "/api/v1/admin/reps", {
      method: "POST",
      body: JSON.stringify(rmsPayload),
    });

    if (
      !payload ||
      typeof payload !== "object" ||
      (payload as { success?: unknown }).success !== true
    ) {
      return apiError(
        "rms_unavailable",
        "The RMS service could not process the request. Try again shortly.",
        502,
      );
    }

    return NextResponse.json({
      ok: true,
      action,
      email,
      ...(tempPassword ? { tempPassword } : {}),
    });
  } catch (err) {
    return internalError(err);
  }
}
