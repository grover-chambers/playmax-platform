"use client";

import React, { useState, useEffect, startTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  GitBranch,
  Users,
  FolderKanban,
  MessageSquare,
  MapPin,
  Calendar,
  BarChart3,
  Eye,
  FileText,
  Shield,
  CreditCard,
  Zap,
  MessageCircle,
  Settings,
  ClipboardList,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Globe,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { getRoleLabel } from "@/lib/roles";
import type { UserRole } from "@/lib/types";

/* ── Clean nav structure — super_admin sees everything, others get role-scoped ── */
interface NavItem {
  icon: React.ElementType;
  label: string;
  href: string;
  badge?: string;
  roles: UserRole[];
}

interface NavSection {
  label: string;
  items: NavItem[];
}

const allNavSections: NavSection[] = [
  {
    label: "Overview",
    items: [
      {
        icon: LayoutDashboard,
        label: "Dashboard",
        href: "/app",
        roles: [
          "super_admin",
          "crm_admin",
          "crm_staff",
          "cms_admin",
          "finance",
        ],
      },
      {
        icon: GitBranch,
        label: "Pipeline",
        href: "/app/pipeline",
        badge: "24",
        roles: ["super_admin", "crm_admin", "crm_staff"],
      },
      {
        icon: Users,
        label: "Clients",
        href: "/app/clients",
        roles: ["super_admin", "crm_admin"],
      },
      {
        icon: FolderKanban,
        label: "Projects",
        href: "/app/projects",
        roles: ["super_admin", "crm_admin", "crm_staff"],
      },
    ],
  },
  {
    label: "Operations",
    items: [
      {
        icon: MessageSquare,
        label: "Inbox",
        href: "/app/inbox",
        badge: "7",
        roles: ["super_admin", "crm_admin", "crm_staff"],
      },
      {
        icon: MapPin,
        label: "Inventory",
        href: "/app/inventory",
        roles: ["super_admin", "crm_admin"],
      },
      {
        icon: Calendar,
        label: "Bookings",
        href: "/app/bookings",
        roles: ["super_admin", "crm_admin", "finance"],
      },
      {
        icon: BarChart3,
        label: "Research & Data",
        href: "/app/research",
        roles: ["super_admin", "crm_admin"],
      },
      {
        icon: Globe,
        label: "Website CMS",
        href: "/app/content",
        roles: ["super_admin", "cms_admin"],
      },
      {
        icon: FileText,
        label: "Reports",
        href: "/app/reports",
        roles: ["super_admin", "crm_admin", "crm_staff"],
      },
      {
        icon: Eye,
        label: "Preview Client",
        href: "/app/preview-client",
        roles: ["super_admin"],
      },
    ],
  },
  {
    label: "Admin",
    items: [
      {
        icon: Shield,
        label: "Users & Roles",
        href: "/app/admin",
        roles: ["super_admin"],
      },
      {
        icon: CreditCard,
        label: "Billing & License",
        href: "/app/admin/billing",
        roles: ["super_admin"],
      },
      {
        icon: Zap,
        label: "Automation",
        href: "/app/admin/automation",
        roles: ["super_admin"],
      },
      {
        icon: MessageCircle,
        label: "WhatsApp Templates",
        href: "/app/admin/whatsapp",
        roles: ["super_admin"],
      },
      {
        icon: Settings,
        label: "Settings",
        href: "/app/settings",
        roles: ["super_admin"],
      },
      {
        icon: ClipboardList,
        label: "Audit Log",
        href: "/app/admin/audit",
        roles: ["super_admin"],
      },
    ],
  },
];

export default function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [user, setUser] = useState<any>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase.auth.getUser();
        const currentUser = data?.user ?? null;
        startTransition(() => {
          setUser(currentUser);
          setLoadingUser(false);
        });
      } catch {
        try {
          const supabase = createClient();
          const { data: sessionData } = await supabase.auth.getSession();
          startTransition(() => {
            setUser(sessionData?.session?.user ?? null);
            setLoadingUser(false);
          });
        } catch {
          startTransition(() => {
            setLoadingUser(false);
          });
        }
      }
    };
    init();
  }, []);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  const role = (user?.user_metadata?.role as UserRole) || null;

  // Filter nav sections by role
  const navSections = allNavSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => {
        if (!role) return false;
        if (role === "super_admin") return true;
        return item.roles.includes(role);
      }),
    }))
    .filter((section) => section.items.length > 0);

  const getInitials = () => {
    if (!user) return "?";
    const name = user.user_metadata?.name;
    if (name) {
      return name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return user.email?.[0]?.toUpperCase() || "?";
  };

  const displayName =
    user?.user_metadata?.name || user?.email || "Not signed in";
  const displayRole = role ? getRoleLabel(role) : "User";

  const isActive = (href: string) =>
    pathname === href || pathname?.startsWith(href + "/");

  return (
    <div
      className={`platform-shell !min-h-screen ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}
    >
      <aside
        className={`sidebar !h-screen ${sidebarCollapsed ? "collapsed" : ""}`}
      >
        {/* Logo */}
        <div className="sidebar-logo">
          {sidebarCollapsed ? (
            <span className="text-yellow font-display text-xl">PM</span>
          ) : (
            <>
              PLAY<span className="text-yellow">MAX</span>
            </>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden px-0">
          {navSections.map((section) => (
            <div key={section.label}>
              <div className="sidebar-section">{section.label}</div>
              {section.items.map((item) => {
                const active = isActive(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    className={`sidebar-item ${active ? "active" : ""}`}
                    title={sidebarCollapsed ? item.label : undefined}
                  >
                    <Icon className="sidebar-item-icon" />
                    <span className="flex-1 truncate">{item.label}</span>
                    {item.badge && (
                      <span className="sidebar-badge">{item.badge}</span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* User section */}
        <div className="sidebar-user">
          {loadingUser ? (
            <div className="user-avatar">?</div>
          ) : user ? (
            <>
              <div className="user-avatar">{getInitials()}</div>
              <div className="flex-1 min-w-0">
                <div className="user-name truncate">{displayName}</div>
                <div className="user-role truncate">{displayRole}</div>
              </div>
              <button
                onClick={handleSignOut}
                className="btn-sm p-1.5! border-none! hover:bg-red/20! hover:text-red! transition-colors"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </>
          ) : (
            <Link href="/login" className="btn-sm py-1! px-3! text-xs">
              Sign in
            </Link>
          )}
        </div>
      </aside>

      {/* Toggle button */}
      <button
        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        className="sidebar-toggle-btn"
        style={{
          left: sidebarCollapsed ? "64px" : "var(--sidebar-w)",
        }}
        aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {sidebarCollapsed ? (
          <ChevronRight size={20} />
        ) : (
          <ChevronLeft size={20} />
        )}
      </button>

      <main className="flex-1 overflow-y-auto min-h-screen">{children}</main>
    </div>
  );
}
