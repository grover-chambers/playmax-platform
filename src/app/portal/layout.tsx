"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  FileText,
  MessageSquare,
  CreditCard,
  Calendar,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { getRoleLabel } from "@/lib/roles";
import type { UserRole } from "@/lib/types";

interface NavItem {
  icon: React.ElementType;
  label: string;
  href: string;
  badge?: string;
}

const portalNavItems: NavItem[] = [
  { icon: Home, label: "Overview", href: "/portal" },
  {
    icon: FileText,
    label: "Deliverables",
    href: "/portal/deliverables",
    badge: "3",
  },
  {
    icon: MessageSquare,
    label: "Messages",
    href: "/portal/messages",
    badge: "2",
  },
  { icon: CreditCard, label: "Invoices", href: "/portal/invoices" },
  { icon: Calendar, label: "Bookings", href: "/portal/bookings" },
];

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<{
    email?: string;
    user_metadata?: { name?: string; role?: string };
  } | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

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

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  const role: UserRole = (user?.user_metadata?.role as UserRole) || "client";
  const initials =
    user?.user_metadata?.name
      ?.split(" ")
      .map((n: string) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) ||
    user?.email?.[0]?.toUpperCase() ||
    "?";

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  return (
    <div className="portal-shell min-h-screen overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`portal-sidebar transition-all duration-200 ${
          sidebarCollapsed ? "collapsed" : ""
        }`}
      >
        {/* Logo */}
        <div className="portal-sidebar-logo">
          {!sidebarCollapsed && (
            <>
              PLAY<span className="text-yellow">MAX</span>
              <span className="ml-2 text-[10px] font-mono text-gray-5 uppercase tracking-widest">
                Portal
              </span>
            </>
          )}
          {sidebarCollapsed && (
            <span className="text-yellow font-display text-xl">PM</span>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3">
          {portalNavItems.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`portal-nav-item ${active ? "active" : ""} ${
                  sidebarCollapsed ? "collapsed" : ""
                }`}
                title={sidebarCollapsed ? item.label : undefined}
              >
                <Icon className="portal-nav-icon" />
                {!sidebarCollapsed && (
                  <>
                    <span className="flex-1">{item.label}</span>
                    {item.badge && (
                      <span className="portal-nav-badge">{item.badge}</span>
                    )}
                  </>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        <div
          className={`portal-sidebar-user ${sidebarCollapsed ? "collapsed" : ""}`}
        >
          <div className="user-info">
            <div className="user-avatar">{initials}</div>
            {!sidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <div className="user-name truncate">
                  {user?.user_metadata?.name || user?.email || "Client"}
                </div>
                <div className="user-role text-[10px] font-mono text-yellow tracking-wider uppercase">
                  {getRoleLabel(role)}
                </div>
              </div>
            )}
          </div>
          {!sidebarCollapsed && (
            <div className="flex gap-1 mt-2">
              <Link
                href="/portal/settings"
                className="flex-1 text-center py-1.5 text-[11px] font-medium rounded border border-[#2A2A2A] text-gray-4 hover:text-white hover:border-[#555] transition-all"
              >
                Settings
              </Link>
              <button
                onClick={handleSignOut}
                className="flex-1 py-1.5 text-[11px] font-medium rounded border border-red/30 text-red hover:bg-red/10 transition-all"
              >
                Sign out
              </button>
            </div>
          )}
          {sidebarCollapsed && (
            <button
              onClick={handleSignOut}
              className="w-full py-2 text-center text-red hover:bg-red/10 rounded transition-colors"
              title="Sign out"
            >
              <LogOut className="w-5 h-5 mx-auto" />
            </button>
          )}
        </div>
      </aside>

      {/* Toggle button */}
      <button
        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        className="portal-sidebar-toggle"
        aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {sidebarCollapsed ? (
          <ChevronRight size={20} />
        ) : (
          <ChevronLeft size={20} />
        )}
      </button>

      {/* Main content */}
      <main className="portal-main flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
