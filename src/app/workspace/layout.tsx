"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";

const ALLOWED_ROLES = ["super_admin", "cms_admin", "crm_admin", "crm_staff", "finance"];

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    const check = async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase.auth.getUser();
        const role = data?.user?.app_metadata?.role;
        if (data?.user && ALLOWED_ROLES.includes(role)) {
          setAuthed(true);
          return;
        }
        // Unauthenticated: off to /login (no loop — not signed in).
        if (!data?.user) {
          router.push("/login");
          return;
        }
        // Explicit clients never render the staff workspace.
        if (role === "client") {
          router.push("/portal");
          return;
        }
        // Role-less authenticated user: staff-intent (same policy as the
        // middleware) — let them through; data APIs fail closed until the
        // role is backfilled via the Admin API. Never bounce to /portal.
        setAuthed(true);
      } catch {
        router.push("/login");
      }
    };
    check();
  }, [router]);

  if (!authed) return null;

  return (
    <div className="platform-workspace min-h-screen bg-[var(--ws-bg)] text-[var(--ws-text)]">
      {children}
    </div>
  );
}
