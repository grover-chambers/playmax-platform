"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

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
        const role = data?.user?.user_metadata?.role;
        if (data?.user && ALLOWED_ROLES.includes(role)) {
          setAuthed(true);
          return;
        }
      } catch {
        // fallback below
      }
      router.push("/login");
    };
    check();
  }, [router]);

  if (!authed) return null;

  return <div className="min-h-screen bg-black-2 text-white">{children}</div>;
}
