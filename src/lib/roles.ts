import { UserRole } from "@/lib/types";

/**
 * Route permissions for each role.
 * "staff" means any non-client role can access it.
 * Specific roles are listed explicitly.
 */
type AccessLevel = "all" | UserRole[];

const routePermissions: Record<string, AccessLevel> = {
  // Staff app — only staff roles
  "/app": ["super_admin", "cms_admin", "crm_admin", "crm_staff", "finance"],
  "/app/my-day": ["crm_staff"],
  "/app/content": ["cms_admin"],
  "/app/pipeline": ["super_admin", "crm_admin", "crm_staff"],
  "/app/clients": ["super_admin", "crm_admin"],
  "/app/projects": ["super_admin", "crm_admin", "crm_staff"],
  "/app/tasks": ["super_admin", "crm_admin", "crm_staff"],
  "/app/inbox": ["super_admin", "crm_admin", "crm_staff"],
  "/app/inventory": ["super_admin", "crm_admin"],
  "/app/bookings": ["super_admin", "crm_admin", "finance"],
  "/app/research": ["super_admin", "crm_admin"],
  "/app/invoices": ["super_admin", "finance"],
  "/app/analytics": ["super_admin", "crm_admin", "finance"],
  // Super admin pages
  "/app/settings": ["super_admin"],
  "/app/reports": ["super_admin", "crm_admin", "crm_staff"],
  "/app/preview-client": ["super_admin"],

  // Admin pages
  "/app/admin": ["super_admin"],
  "/app/admin/staff": ["super_admin"],
  "/app/admin/billing": ["super_admin"],
  "/app/admin/automation": ["super_admin"],
  "/app/admin/whatsapp": ["super_admin"],
  "/app/admin/audit": ["super_admin"],
};

/** Get the base path for permission checking */
function getBasePath(pathname: string): string {
  // Try exact match first, then prefix matches
  const sorted = Object.keys(routePermissions).sort(
    (a, b) => b.length - a.length,
  );
  for (const base of sorted) {
    if (pathname === base || pathname.startsWith(base + "/")) {
      return base;
    }
  }
  // Default: if it starts with /app, check base /app
  if (pathname.startsWith("/app")) return "/app";
  return pathname;
}

/**
 * Check if a user role is allowed to access a given path.
 */
export function canAccess(
  role: UserRole | undefined | null,
  pathname: string,
): boolean {
  if (!role) return false;

  // Super admin can access everything
  if (role === "super_admin") return true;

  // Client can only access portal
  if (role === "client") {
    return pathname.startsWith("/portal") || pathname === "/login";
  }

  // Portal is accessible by clients + all staff
  if (pathname.startsWith("/portal")) return true;

  const base = getBasePath(pathname);
  const allowed = routePermissions[base];

  if (!allowed) {
    // If not explicitly listed, block by default for /app routes
    if (pathname.startsWith("/app")) return false;
    return true;
  }

  if (allowed === "all") return true;
  return allowed.includes(role);
}

/**
 * Get the redirect path for users who don't have access.
 */
export function getDefaultRedirect(role: UserRole | undefined | null): string {
  if (!role || role === "client") return "/portal";
  return "/app/pipeline";
}

/**
 * Get readable role label.
 */
export function getRoleLabel(role: string | undefined | null): string {
  if (!role) return "User";
  const labels: Record<string, string> = {
    super_admin: "Super Admin",
    cms_admin: "CMS Admin",
    crm_admin: "CRM Admin",
    crm_staff: "CRM Staff",
    finance: "Finance",
    client: "Client",
  };
  return labels[role] || role;
}
