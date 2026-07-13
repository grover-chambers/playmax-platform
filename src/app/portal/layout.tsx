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
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { getRoleLabel } from "@/lib/roles";
import type { UserRole } from "@/lib/types";
import DashboardLayout from "@/components/layout/dashboard-layout";
import type { DashboardNavItem } from "@/components/layout/dashboard-layout";

const portalNavItems: DashboardNavItem[] = [
  { icon: Home, label: "Overview", href: "/portal" },
  { icon: FileText, label: "Deliverables", href: "/portal/deliverables", badge: "3" },
  { icon: MessageSquare, label: "Messages", href: "/portal/messages", badge: "2" },
  { icon: CreditCard, label: "Invoices", href: "/portal/invoices" },
  { icon: Calendar, label: "Bookings", href: "/portal/bookings" },
];

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [user, setUser] = useState<{
    email?: string;
    user_metadata?: { name?: string; role?: string };
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

  return (
    <DashboardLayout
      navItems={portalNavItems}
      user={{
        initials,
        name: user?.user_metadata?.name || user?.email || "Client",
        role: getRoleLabel(role),
      }}
      onSignOut={handleSignOut}
      logoSubtitle="Portal"
      userExtra={
        <Link
          href="/portal/settings"
          className="text-[11px] font-medium px-2 py-1 rounded border border-[#2A2A2A] text-gray-4 hover:text-white hover:border-[#555] transition-all"
        >
          Settings
        </Link>
      }
    >
      {children}
    </DashboardLayout>
  );
}
