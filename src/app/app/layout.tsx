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

/* ── Nav structure matching the table ─────────────── */
interface NavItem {
  icon: React.ElementType;
  label: string;
  href: string;
  badge?: string;
  /** Which roles see this item. "super_admin" only by default. */
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
        label: "Leads / Pipeline",
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
        icon: Eye,
        label: "Client Portal Preview",
        href: "/app/preview-client",
        roles: ["super_admin"],
      },
    ],
  },
  {
    label: "Content",
    items: [
      {
        icon: Globe,
        label: "CMS — Website",
        href: "/app/content",
        roles: ["super_admin", "cms_admin"],
      },
    ],
  },
  {
    label: "Reports",
    items: [
      {
        icon: FileText,
        label: "Reports & Analytics",
        href: "/app/reports",
        roles: ["super_admin", "crm_admin", "crm_staff"],
      },
    ],
  },
  {
    label: "Administration",
    items: [
      {
        icon: Shield,
        label: "Users & Roles",
        href: "/app/admin",
        roles: ["super_admin"],
      },
      {
        icon: CreditCard,
        label: "Billing & SaaS License",
        href: "/app/admin/billing",
        roles: ["super_admin"],
      },
      {
        icon: Zap,
        label: "Automation Rules",
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
        label: "System Settings",
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
      const supabase = createClient();
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();
      startTransition(() => {
        setUser(currentUser);
        setLoadingUser(false);
      });
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
      className="platform-shell !min-h-screen !h-screen overflow-hidden"
      style={{
        gridTemplateColumns: `${sidebarCollapsed ? "64px" : "var(--sidebar-w)"} 1fr`,
        transition: "grid-template-columns 0.2s ease",
      }}
    >
      <aside
        className={`sidebar !h-screen ${sidebarCollapsed ? "collapsed" : ""}`}
        style={{
          width: sidebarCollapsed ? "64px" : "var(--sidebar-w)",
          transition: "width 0.2s ease",
          overflow: "hidden",
        }}
      >
        {/* Logo */}
        <div
          className="sidebar-logo"
          style={{
            padding: sidebarCollapsed ? "18px 0 20px" : "8px 20px 24px",
            textAlign: sidebarCollapsed ? "center" : "left",
            whiteSpace: "nowrap",
            overflow: "hidden",
          }}
        >
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
              {!sidebarCollapsed && (
                <div className="sidebar-section">{section.label}</div>
              )}
              {section.items.map((item) => {
                const active = isActive(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    className={`sidebar-item ${active ? "active" : ""}`}
                    style={{
                      padding: sidebarCollapsed ? "12px 0" : "9px 20px",
                      justifyContent: sidebarCollapsed
                        ? "center"
                        : "flex-start",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                    }}
                    title={sidebarCollapsed ? item.label : undefined}
                  >
                    <Icon
                      className="sidebar-item-icon"
                      style={{ flexShrink: 0 }}
                    />
                    {!sidebarCollapsed && (
                      <>
                        <span className="flex-1 truncate">{item.label}</span>
                        {item.badge && (
                          <span className="sidebar-badge">{item.badge}</span>
                        )}
                      </>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* User section */}
        <div
          className="sidebar-user"
          style={{
            padding: sidebarCollapsed ? "14px 0" : "16px 20px",
            flexDirection: sidebarCollapsed ? "column" : "row",
            alignItems: sidebarCollapsed ? "center" : "center",
            gap: sidebarCollapsed ? "8px" : "10px",
          }}
        >
          {loadingUser ? (
            <div
              className="user-avatar"
              style={{ margin: sidebarCollapsed ? "0 auto" : "0" }}
            >
              ?
            </div>
          ) : user ? (
            <>
              <div
                className="user-avatar"
                style={{ margin: sidebarCollapsed ? "0 auto" : "0" }}
              >
                {getInitials()}
              </div>
              {!sidebarCollapsed && (
                <div className="flex-1 min-w-0">
                  <div className="user-name truncate">{displayName}</div>
                  <div className="user-role truncate">{displayRole}</div>
                </div>
              )}
              <button
                onClick={handleSignOut}
                className="btn-sm p-1.5! border-none! hover:bg-red/20! hover:text-red! transition-colors"
                title="Sign out"
                style={{
                  margin: sidebarCollapsed ? "0 auto" : "0",
                }}
              >
                <LogOut className="w-4 h-4" />
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="btn-sm py-1! px-3! text-xs"
              style={{
                margin: sidebarCollapsed ? "0 auto" : "0",
              }}
            >
              Sign in
            </Link>
          )}
        </div>
      </aside>

      {/* Toggle button */}
      <button
        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        style={{
          position: "fixed",
          left: sidebarCollapsed ? "64px" : "var(--sidebar-w)",
          top: "50%",
          transform: "translateY(-50%)",
          zIndex: 40,
          width: "20px",
          height: "36px",
          background: "var(--pm-black-3)",
          border: "1px solid #2a2a2a",
          borderLeft: "none",
          borderRadius: "0 var(--radius) var(--radius) 0",
          color: "var(--pm-gray-5)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "left 0.2s ease, color 0.12s",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = "var(--pm-yellow)")}
        onMouseLeave={(e) => (e.currentTarget.style.color = "var(--pm-gray-5)")}
        aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {sidebarCollapsed ? (
          <ChevronRight size={20} />
        ) : (
          <ChevronLeft size={20} />
        )}
      </button>

      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
