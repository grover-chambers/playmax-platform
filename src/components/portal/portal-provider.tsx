"use client";

import React, { createContext, useContext, useEffect, useState, startTransition } from "react";

interface PortalClient {
  id: string;
  name: string;
  email: string | null;
  company: string | null;
  industry: string | null;
  phone: string | null;
  status: string;
  created_at: string;
  notification_prefs?: Record<string, boolean>;
}

interface PortalContextValue {
  client: PortalClient | null;
  loading: boolean;
  error: string | null;
}

const PortalContext = createContext<PortalContextValue>({
  client: null,
  loading: true,
  error: null,
});

export function usePortalClient() {
  return useContext(PortalContext);
}

export function PortalProvider({ children }: { children: React.ReactNode }) {
  const [client, setClient] = useState<PortalClient | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchClient = async () => {
      try {
        const res = await fetch("/api/portal/me");
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: "Failed to load client" }));
          startTransition(() => {
            setError(err.error || "Failed to load client");
            setLoading(false);
          });
          return;
        }
        const { client: clientData } = await res.json();
        startTransition(() => {
          setClient(clientData);
          setLoading(false);
        });
      } catch {
        startTransition(() => {
          setError("Network error");
          setLoading(false);
        });
      }
    };
    fetchClient();
  }, []);

  return (
    <PortalContext.Provider value={{ client, loading, error }}>
      {children}
    </PortalContext.Provider>
  );
}
