import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import {
  getAuthenticatedClient,
  getCurrentUser,
  isAdmin,
} from "@/lib/supabase/api";
import { sanitizeError } from "@/lib/errors";
import type { StaffMember, UserRole } from "@/lib/types";

export const dynamic = "force-dynamic";

const STAFF_ROLES = [
  "super_admin",
  "cms_admin",
  "crm_admin",
  "crm_staff",
  "finance",
];

export async function GET() {
  try {
    const supabase = await getAuthenticatedClient();
    const currentUser = await getCurrentUser(supabase);

    if (!currentUser || !isAdmin(currentUser.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Use service-role key to call Supabase Admin API for listing users
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      return NextResponse.json(
        { error: "Server misconfigured — missing service role key" },
        { status: 500 },
      );
    }

    const cookieStore = await cookies();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

    const adminClient = createServerClient(supabaseUrl, serviceRoleKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {},
      },
    });

    // List all users — Supabase caps at 1000 per call; paginate if needed
    const { data, error } = await adminClient.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });

    if (error) {
      return NextResponse.json(
        { error: sanitizeError(error) },
        { status: 500 },
      );
    }

    // Map auth users → StaffMember, filter to staff roles only
    const staffMembers: StaffMember[] = (data?.users ?? [])
      .filter((u) => {
        const role = (u.user_metadata?.role as UserRole) || "client";
        return STAFF_ROLES.includes(role);
      })
      .map((u) => {
        const role = (u.user_metadata?.role as UserRole) || "crm_staff";
        return {
          id: u.id,
          email: u.email ?? "",
          name: u.user_metadata?.name ?? u.email?.split("@")[0] ?? "Unknown",
          role,
          status: ((u as unknown as Record<string, unknown>).banned_at ? "inactive" : "active") as "active" | "inactive",
          createdAt: u.created_at
            ? new Date(u.created_at).toISOString().slice(0, 10)
            : "",
        };
      })
      .sort((a, b) => {
        // Super admin first, then alphabetically
        if (a.role === "super_admin") return -1;
        if (b.role === "super_admin") return 1;
        return a.name.localeCompare(b.name);
      });

    return NextResponse.json({ staff: staffMembers });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch staff" },
      { status: 500 },
    );
  }
}
