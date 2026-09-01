import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getPortalClient, type PortalClient } from "./portal";
import type { ApiUser } from "./supabase/api";

/**
 * Staff roles that must NEVER see client-portal data, even when a staff
 * member has a row in client_users (e.g. seeded from a legacy 1:1 link).
 * This is API-layer defense in depth; the routing layer separately makes
 * /portal unreachable for staff.
 */
const STAFF_ROLES = ["super_admin", "cms_admin", "crm_admin", "crm_staff", "finance", "data_handler"] as const;

export type PortalGuardResult =
  | { client: PortalClient; role: string | undefined; response?: undefined }
  | { client?: undefined; role?: undefined; response: NextResponse };

/**
 * Hard client-portal guard:
 * - currentUser missing        -> 401 { error: "Unauthorized" }
 * - role is a staff role       -> 403 { error: "Staff accounts cannot access the client portal", code: "PORTAL_STAFF_FORBIDDEN" }
 * - role is missing (null)     -> 403 { error: "No role assigned", code: "PORTAL_ROLE_REQUIRED" }
 * - no linked client record    -> 404 { error: "No client account linked" }
 * - otherwise                  -> { client, role }
 *
 * Role-less callers are REJECTED, never treated as clients: the "missing role
 * means client" default was a misclassification vector for staff accounts and
 * is eliminated. Only an explicit `client` role may read portal data.
 *
 * Usage:
 *   const portal = await requirePortalClient(supabase, currentUser);
 *   if (portal.response) return portal.response;
 *   const client = portal.client;
 */
export async function requirePortalClient(
  supabase: SupabaseClient,
  currentUser: Pick<ApiUser, "id" | "role"> | null,
): Promise<PortalGuardResult> {
  if (!currentUser) {
    return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  if (STAFF_ROLES.includes(currentUser.role as (typeof STAFF_ROLES)[number])) {
    return {
      response: NextResponse.json(
        {
          error: "Staff accounts cannot access the client portal",
          code: "PORTAL_STAFF_FORBIDDEN",
        },
        { status: 403 },
      ),
    };
  }

  if (!currentUser.role) {
    return {
      response: NextResponse.json(
        {
          error: "No role assigned — portal access requires the client role",
          code: "PORTAL_ROLE_REQUIRED",
        },
        { status: 403 },
      ),
    };
  }

  const client = await getPortalClient(supabase, currentUser.id);
  if (!client) {
    return { response: NextResponse.json({ error: "No client account linked" }, { status: 404 }) };
  }

  return { client, role: currentUser.role };
}

/**
 * Standard 402 for the paid market-analytics gate. Returned BEFORE any data
 * fetch when the client's subscription_tier is not 'pro'/'enterprise'.
 */
export function subscriptionRequiredResponse(): NextResponse {
  return NextResponse.json(
    {
      error: "An active subscription is required to access market analytics",
      code: "SUBSCRIPTION_REQUIRED",
    },
    { status: 402 },
  );
}
