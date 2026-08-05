import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";

export function getAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY not set");
  return createClient(url, key);
}

/**
 * Backfill a least-privilege `client` role for users that were created without
 * `app_metadata.role` (OAuth sign-ups, invites that wrote `user_metadata`, and
 * pre-migration users). Roles live in `app_metadata` and can only be written
 * through the Admin API, so this is server-side only.
 *
 * Idempotent and cheap: only calls the Admin API when the role is missing, and
 * merges — never overwrites — existing app_metadata. Returns the resolved role.
 */
export async function ensureDefaultRole(user: User): Promise<string> {
  const existingRole = user.app_metadata?.role;
  if (existingRole) return String(existingRole);

  try {
    const admin = getAdminClient();
    const { error } = await admin.auth.admin.updateUserById(user.id, {
      app_metadata: {
        ...(user.app_metadata ?? {}),
        role: "client",
      },
    });
    if (error) {
      console.error(`[auth] Role backfill failed for ${user.id}: ${error.message}`);
    }
  } catch {
    // No service role key in local dev — middleware + layouts default to "client",
    // so the login flow still works; the role is backfilled on the next callback.
    console.warn("[auth] Role backfill skipped — SUPABASE_SERVICE_ROLE_KEY unavailable");
  }

  return "client";
}
