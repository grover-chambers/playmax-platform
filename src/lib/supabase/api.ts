import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { UserRole } from "@/lib/types";

export interface ApiUser {
  id: string;
  role: UserRole;
  email?: string;
}

export async function getAuthenticatedClient() {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {}
        },
      },
    },
  );

  return supabase;
}

export async function getCurrentUser(supabase: Awaited<ReturnType<typeof getAuthenticatedClient>>): Promise<ApiUser | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  return {
    id: user.id,
    role: (user.app_metadata?.role as UserRole) || "client",
    email: user.email,
  };
}

const ADMIN_ROLES = ["super_admin", "crm_admin", "cms_admin"];
const STAFF_ROLES = [...ADMIN_ROLES, "crm_staff", "finance"];

export function isAdmin(role: UserRole): boolean {
  return ADMIN_ROLES.includes(role);
}

/**
 * True for any non-client role (admin + finance + crm_staff).
 * Used to guard internal staff-only API routes so that portal
 * client users cannot read or mutate staff data.
 */
export function isStaff(role: UserRole): boolean {
  return STAFF_ROLES.includes(role);
}

export function isCrmStaff(role: UserRole): boolean {
  return role === "crm_staff";
}
