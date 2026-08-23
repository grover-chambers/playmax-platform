"use client";

import React, { useState, useEffect, startTransition } from "react";
import { useRouter } from "next/navigation";
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
  Globe,
  TrendingUp,
  Upload,
  Database,
} from "lucide-react";
import { createClient } from "@/lib/supabase/browser";
import { getRoleLabel } from "@/lib/roles";
import type { UserRole } from "@/lib/types";
import { UserProvider } from "@/lib/user-context";
import NotificationBell from "@/components/layout/notification-bell";
import DashboardLayout from "@/components/layout/dashboard-layout";
import type { DashboardNavSection } from "@/components/layout/dashboard-layout";

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
        roles: ["super_admin", "crm_admin", "crm_staff", "cms_admin", "finance"],
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
    label: "Analytics",
    items: [
      {
        icon: TrendingUp,
        label: "Dashboard",
        href: "/app/analytics",
        roles: ["super_admin", "crm_admin"],
      },
      {
        icon: Upload,
        label: "Data Upload",
        href: "/app/analytics/upload",
        roles: ["super_admin", "crm_admin"],
      },
      {
        icon: BarChart3,
        label: "Reports",
        href: "/app/analytics/reports",
        roles: ["super_admin", "crm_admin"],
      },
      {
        icon: Database,
        label: "Dimensions",
        href: "/app/analytics/dimensions",
        roles: ["super_admin", "crm_admin"],
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
        icon: Users,
        label: "Field Team",
        href: "/app/admin/field-team",
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
  const router = useRouter();

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

  const role = (user?.app_metadata?.role as UserRole) || null;

  // Staff-side defense in depth: an explicit client must never render the
  // staff shell (middleware already bounces clients, this covers client-side
  // navigation / stale state). Role-less users are staff-intent per middleware
  // policy and render here; data APIs fail closed until the role backfills.
  useEffect(() => {
    if (user && role === "client") {
      router.replace("/portal");
    }
  }, [user, role, router]);

  const navSections: DashboardNavSection[] = allNavSections
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

  return (
    <UserProvider>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:bg-[var(--ws-accent)] focus:text-white focus:px-4 focus:py-2 focus:rounded-md focus:text-sm focus:font-semibold"
      >
        Skip to content
      </a>
      <DashboardLayout
        navSections={navSections}
        topBar={
          <div className="flex items-center gap-2">
            <span className="pm-zone-chip pm-zone-chip-staff">Staff</span>
            <NotificationBell />
          </div>
        }
        user={{
          initials: getInitials(),
          name: displayName,
          role: displayRole,
        }}
        loadingUser={loadingUser}
        onSignOut={handleSignOut}
        logoSubtitle="Staff Portal"
      >
        {children}
      </DashboardLayout>
    </UserProvider>
  );
}
