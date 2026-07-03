"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  MessageSquare,
  MapPin,
  BarChart3,
  Users,
  FolderKanban,
  CheckSquare,
  Receipt,
  Settings,
  Calendar,
  LogOut,
} from "lucide-react";
import { createClient } from "@/lib/supabase/browser";

const navSections = [
  {
    label: "Operations",
    items: [
      {
        icon: FolderKanban,
        label: "Pipeline",
        href: "/app/pipeline",
        badge: "24",
      },
      { icon: Users, label: "Clients", href: "/app/clients" },
      { icon: FolderKanban, label: "Projects", href: "/app/projects" },
      { icon: CheckSquare, label: "Tasks", href: "/app/tasks" },
    ],
  },
  {
    label: "Communications",
    items: [
      { icon: MessageSquare, label: "Inbox", href: "/app/inbox", badge: "7" },
    ],
  },
  {
    label: "Assets",
    items: [
      { icon: MapPin, label: "Inventory", href: "/app/inventory" },
      { icon: Calendar, label: "Bookings", href: "/app/bookings" },
      { icon: BarChart3, label: "Research", href: "/app/research" },
    ],
  },
  {
    label: "Finance",
    items: [{ icon: Receipt, label: "Invoices", href: "/app/invoices" }],
  },
  {
    label: "System",
    items: [{ icon: Settings, label: "Settings", href: "/app/settings" }],
  },
];

export default function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [user, setUser] = useState<any>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      const supabase = createClient();
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();
      setUser(currentUser);
      setLoadingUser(false);
    };
    loadUser();
  }, []);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

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
  const displayRole = user?.user_metadata?.role || "User";

  return (
    <div className="platform-shell !min-h-screen !h-screen overflow-hidden">
      <aside className="sidebar !h-screen">
        <div className="sidebar-logo">
          PLAY<span className="text-yellow">MAX</span>
        </div>

        {navSections.map((section) => (
          <div key={section.label}>
            <div className="sidebar-section">{section.label}</div>
            {section.items.map((item) => {
              const isActive =
                pathname === item.href || pathname?.startsWith(item.href + "/");
              const Icon = item.icon;
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`sidebar-item ${isActive ? "active" : ""}`}
                >
                  <Icon className="sidebar-item-icon" />
                  <span className="flex-1">{item.label}</span>
                  {item.badge && (
                    <span className="sidebar-badge">{item.badge}</span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}

        <div className="sidebar-user">
          {loadingUser ? (
            <>
              <div className="user-avatar">?</div>
              <div className="flex-1 min-w-0">
                <div className="user-name truncate">Loading...</div>
                <div className="user-role">—</div>
              </div>
            </>
          ) : user ? (
            <>
              <div className="user-avatar">{getInitials()}</div>
              <div className="flex-1 min-w-0">
                <div className="user-name truncate">{displayName}</div>
                <div className="user-role">{displayRole}</div>
              </div>
              <button
                onClick={handleSignOut}
                className="btn-sm !p-1.5 !border-none hover:!bg-red/20 hover:!text-red transition-colors"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              <div className="user-avatar">?</div>
              <div className="flex-1 min-w-0">
                <div className="user-name truncate">Not signed in</div>
                <div className="user-role">—</div>
              </div>
              <Link href="/login" className="btn-sm !py-1 !px-3 text-xs">
                Sign in
              </Link>
            </>
          )}
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
