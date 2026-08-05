"use client";

import React, { createContext, useContext, useState, useEffect, startTransition, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/browser";
import type { User } from "@supabase/supabase-js";
import type { UserRole } from "@/lib/types";

interface UserContextValue {
  user: User | null;
  role: UserRole | null;
  loading: boolean;
  isAdmin: boolean;
}

const UserContext = createContext<UserContextValue>({
  user: null,
  role: null,
  loading: true,
  isAdmin: false,
});

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase.auth.getUser();
        startTransition(() => {
          setUser(data?.user ?? null);
          setLoading(false);
        });
      } catch {
        try {
          const supabase = createClient();
          const { data: sessionData } = await supabase.auth.getSession();
          startTransition(() => {
            setUser(sessionData?.session?.user ?? null);
            setLoading(false);
          });
        } catch {
          startTransition(() => setLoading(false));
        }
      }
    };
    init();
  }, []);

  const metadata = (user?.app_metadata as Record<string, unknown>) ?? {};
  // A missing app_metadata.role (OAuth users, invites that wrote user_metadata,
  // pre-migration users) resolves to the least-privilege "client" role so the
  // portal renders instead of crashing or redirect-looping. Explicit roles are
  // preserved verbatim.
  const role = (metadata?.role as UserRole) ?? "client";
  const adminRoles: UserRole[] = ["super_admin", "crm_admin", "cms_admin"];
  const isAdmin = !!role && adminRoles.includes(role);

  return (
    <UserContext.Provider value={{ user, role, loading, isAdmin }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
