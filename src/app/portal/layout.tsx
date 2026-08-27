"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Home,
  FileText,
  MessageSquare,
  CreditCard,
  Calendar,
  BarChart3,
  BookOpen,
  Map,
} from "lucide-react";
import { createClient } from "@/lib/supabase/browser";
import { getRoleLabel } from "@/lib/roles";
import type { UserRole } from "@/lib/types";
import DashboardLayout from "@/components/layout/dashboard-layout";
import type { DashboardNavItem } from "@/components/layout/dashboard-layout";
import { PortalProvider } from "@/components/portal/portal-provider";
import NotificationBell from "@/components/portal/notification-bell";
import LiveRegion from "@/components/portal/live-region";

const portalNavItems: DashboardNavItem[] = [
  { icon: Home, label: "Overview", href: "/portal" },
  { icon: BarChart3, label: "Data Analytics", href: "/portal/analytics" },
  { icon: Map, label: "Route Mapping", href: "/portal/route-mapping" },
  { icon: FileText, label: "Deliverables", href: "/portal/deliverables", badge: "3" },
  { icon: MessageSquare, label: "Messages", href: "/portal/messages", badge: "2" },
  { icon: CreditCard, label: "Invoices", href: "/portal/invoices" },
  { icon: Calendar, label: "Bookings", href: "/portal/bookings" },
  { icon: BookOpen, label: "Content", href: "/portal/content" },
];

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [user, setUser] = useState<{
    email?: string;
    user_metadata?: { name?: string };
    app_metadata?: Record<string, unknown>;
  } | null>(null);

  useEffect(() => {
    const init = async () => {
      const supabase = createClient();
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();
      setUser(currentUser);
    };
    init();
  }, []);

  const role: UserRole =
    (user?.app_metadata?.role as UserRole) || "client";

  // Redirect staff users to admin dashboard — portal is client-only
  useEffect(() => {
    if (user && role !== "client") {
      router.replace("/app");
    }
  }, [user, role, router]);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };
  const initials =
    user?.user_metadata?.name
      ?.split(" ")
      .map((n: string) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) ||
    user?.email?.[0]?.toUpperCase() ||
    "?";

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:bg-[var(--ws-accent)] focus:text-white focus:px-4 focus:py-2 focus:rounded-md focus:text-sm focus:font-semibold"
      >
        Skip to content
      </a>
      <LiveRegion />
      <DashboardLayout
        navItems={portalNavItems}
        topBar={
          <div className="flex items-center gap-2">
            <span className="pm-zone-chip pm-zone-chip-client">Client</span>
            <NotificationBell />
          </div>
        }
        user={{
          initials,
          name: user?.user_metadata?.name || user?.email || "Client",
          role: getRoleLabel(role),
        }}
        onSignOut={handleSignOut}
        logoSubtitle="Client Portal"
        accent="#B45309"
        userExtra={
          <Link
            href="/portal/settings"
            className="text-[11px] font-medium px-2 py-1 rounded border border-[var(--ws-border)] text-gray-4 hover:text-teal hover:border-teal transition-all"
          >
            Settings
          </Link>
        }
      >
        <PortalProvider>{children}</PortalProvider>
      </DashboardLayout>
    </>
  );
}
