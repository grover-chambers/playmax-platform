"use client";

import React, { useState, useEffect, startTransition } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight, LogOut, Menu, X } from "lucide-react";

export interface DashboardNavItem {
  icon: React.ElementType;
  label: string;
  href: string;
  badge?: string;
}

export interface DashboardNavSection {
  label: string;
  items: DashboardNavItem[];
}

interface DashboardLayoutProps {
  children: React.ReactNode;
  navSections?: DashboardNavSection[];
  navItems?: DashboardNavItem[];
  topBar?: React.ReactNode;
  user?: {
    initials: string;
    name: string;
    role: string;
  } | null;
  loadingUser?: boolean;
  onSignOut: () => void;
  logoSubtitle?: string;
  userExtra?: React.ReactNode;
}

export default function DashboardLayout({
  children,
  navSections,
  navItems,
  topBar,
  user,
  loadingUser,
  onSignOut,
  logoSubtitle,
  userExtra,
}: DashboardLayoutProps) {
  const pathname = usePathname();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Restore collapse state on mount (SNDBX-style persistence)
  useEffect(() => {
    startTransition(() => {
      const saved = localStorage.getItem("pm-sidebar-collapsed");
      if (saved !== null) setSidebarCollapsed(saved === "true");
    });
  }, []);

  const toggleSidebar = () => {
    const next = !sidebarCollapsed;
    setSidebarCollapsed(next);
    localStorage.setItem("pm-sidebar-collapsed", String(next));
  };

  // Close the mobile drawer whenever the route changes
  useEffect(() => {
    startTransition(() => setMobileOpen(false));
  }, [pathname]);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  return (
    <div
      className={`platform-shell !min-h-screen ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}
    >
      {/* Mobile menu trigger */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="mobile-menu-btn"
        aria-label={mobileOpen ? "Close menu" : "Open menu"}
      >
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Backdrop behind the mobile drawer */}
      <div
        className={`sidebar-overlay ${mobileOpen ? "open" : ""}`}
        onClick={() => setMobileOpen(false)}
      />

      {/* Sidebar */}
      <aside
        className={`sidebar !h-screen ${sidebarCollapsed ? "collapsed" : ""} ${mobileOpen ? "mobile-open" : ""}`}
      >
        {/* Logo */}
        <div className="sidebar-logo">
          {sidebarCollapsed ? (
            <span className="flex items-center justify-center w-6 h-6 rounded-full border-2 border-[var(--pm-gold)] mx-auto">
              <span className="w-2.5 h-2.5 rounded-full bg-[var(--pm-gold)]" />
            </span>
          ) : (
            <div className="flex items-center gap-2.5">
              <span className="flex items-center justify-center w-6 h-6 rounded-full border-2 border-[var(--pm-gold)] flex-shrink-0">
                <span className="w-2.5 h-2.5 rounded-full bg-[var(--pm-gold)]" />
              </span>
              <div className="flex flex-col">
                <span className="font-display text-[14px] font-bold uppercase tracking-wider text-white leading-tight">
                  Market Link
                </span>
                {logoSubtitle && (
                  <span className="text-[9px] font-mono text-gray-5 uppercase tracking-[0.15em] leading-tight mt-0.5">
                    {logoSubtitle}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden px-0">
          {navSections
            ? navSections.map((section) => (
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
                        title={sidebarCollapsed ? item.label : undefined}
                      >
                        <Icon className="sidebar-item-icon" />
                        {!sidebarCollapsed && (
                          <>
                            <span className="flex-1 truncate">
                              {item.label}
                            </span>
                            {item.badge && (
                              <span className="sidebar-badge">
                                {item.badge}
                              </span>
                            )}
                          </>
                        )}
                      </Link>
                    );
                  })}
                </div>
              ))
            : navItems?.map((item) => {
                const active = isActive(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`sidebar-item ${active ? "active" : ""}`}
                    title={sidebarCollapsed ? item.label : undefined}
                  >
                    <Icon className="sidebar-item-icon" />
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
        </nav>

        {/* User section */}
        <div className="sidebar-user">
          {loadingUser ? (
            <div className="user-avatar">?</div>
          ) : user ? (
            <>
              <div className="user-avatar">{user.initials}</div>
              {!sidebarCollapsed && (
                <>
                  <div className="flex-1 min-w-0">
                    <div className="user-name truncate">{user.name}</div>
                    <div className="user-role truncate">{user.role}</div>
                  </div>
                  <div className="flex items-center gap-1">
                    {userExtra}
                    <button
                      onClick={onSignOut}
                      className="btn-sm p-1.5! border-none! hover:bg-red/20! hover:text-red! transition-colors"
                      title="Sign out"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  </div>
                </>
              )}
              {sidebarCollapsed && (
                <button
                  onClick={onSignOut}
                  className="w-full py-2 text-center text-red hover:bg-red/10 rounded transition-colors"
                  title="Sign out"
                >
                  <LogOut className="w-5 h-5 mx-auto" />
                </button>
              )}
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
        onClick={toggleSidebar}
        className="sidebar-toggle-btn"
        style={{
          left: sidebarCollapsed ? "60px" : "var(--sidebar-w)",
        }}
        aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {sidebarCollapsed ? (
          <ChevronRight size={20} />
        ) : (
          <ChevronLeft size={20} />
        )}
      </button>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto min-h-screen">
        {topBar && (
          <div className="sticky top-0 z-30 flex items-center justify-end px-6 py-2 bg-[var(--ws-surface)]/90 backdrop-blur-sm border-b border-[var(--ws-border)]">
            {topBar}
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
