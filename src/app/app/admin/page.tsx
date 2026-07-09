"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AdminPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/app/admin/staff");
  }, [router]);
  return (
    <div className="p-6">
      <p className="text-gray-5">Redirecting to Users &amp; Roles...</p>
    </div>
  );
}
