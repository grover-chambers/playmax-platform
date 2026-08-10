import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";

export function getAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY not set");
  return createClient(url, key);
}

/**
 * Deterministic roles for accounts created before `app_metadata.role` existed.
 * A missing role must NEVER silently demote a staff-intent user to the client
 * portal; for known accounts the email maps to the account's true role so a
 * staff backfill can never land in the client zone.
 */
const ROLE_BY_EMAIL: Record<string, string> = {
  "demo.superadmin@playmax.com": "super_admin",
  "demo.crmadmin@playmax.com": "crm_admin",
  "demo.crmstaff@playmax.com": "crm_staff",
  "demo.cmsadmin@playmax.com": "cms_admin",
  "demo.finance@playmax.com": "finance",
  "demo.client@playmax.com": "client",
  "demo@nicesupermarket.co.ke": "client",
};

/**
 * Backfill a missing `app_metadata.role` for users that were created without
 * one (OAuth sign-ups, invites that wrote `user_metadata`, and pre-migration
 * users). Roles live in `app_metadata` and can only be written through the
 * Admin API, so this is server-side only.
 *
 * Policy: known accounts resolve to their true role by email; unknown accounts
 * get the least-privilege `client` role — loudly logged, never silent. This
 * eliminates the old behavior where a role-less staff account was backfilled
 * as `client` and bounced into the client portal.
 *
 * Idempotent and cheap: only calls the Admin API when the role is missing, and
 * merges — never overwrites — existing app_metadata. Returns the resolved role.
 */
export async function ensureDefaultRole(user: User): Promise<string> {
  const existingRole = user.app_metadata?.role;
  if (existingRole) return String(existingRole);

  const email = (user.email || "").toLowerCase();
  const resolvedRole = ROLE_BY_EMAIL[email] ?? "client";

  if (!ROLE_BY_EMAIL[email]) {
    console.warn(
      `[auth] Role backfill: unknown role-less user ${user.id} (${email || "no email"}) defaulting to "${resolvedRole}"`,
    );
  }

  try {
    const admin = getAdminClient();
    const { error } = await admin.auth.admin.updateUserById(user.id, {
      app_metadata: {
        ...(user.app_metadata ?? {}),
        role: resolvedRole,
      },
    });
    if (error) {
      console.error(`[auth] Role backfill failed for ${user.id}: ${error.message}`);
    }
  } catch {
    // No service role key in local dev — the resolved role is still returned
    // so callers redirect deterministically; the role is backfilled later.
    console.warn("[auth] Role backfill skipped — SUPABASE_SERVICE_ROLE_KEY unavailable");
  }

  return resolvedRole;
}
