"use client";

import React from "react";
import PortalHeader from "@/components/layout/portal-header";

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-black">
      <PortalHeader
        userName="James K."
        companyName="Miti Fresh Ltd."
        userInitials="JK"
      />
      <main>{children}</main>
    </div>
  );
}
