"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Store, ClipboardCheck, Users, MapPin, Activity, Layers } from "lucide-react";

const tabs = [
  { href: "/app/kanini-field", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/app/kanini-field/census", label: "Census", icon: Store },
  { href: "/app/kanini-field/visits", label: "Visits", icon: ClipboardCheck },
  { href: "/app/kanini-field/team", label: "Team", icon: Users },
  { href: "/app/kanini-field/map", label: "Map", icon: MapPin },
  { href: "/app/kanini-field/submissions", label: "Submissions", icon: Activity },
];

export default function KaniniFieldSuperAdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="page-content space-y-5">
      <div className="pm-dash-card p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-[var(--ws-radius-sm)] bg-gradient-to-br from-teal-600 to-emerald-700 flex items-center justify-center shrink-0">
              <Layers size={15} className="text-white" />
            </div>
            <div>
              <div className="text-[14px] font-semibold text-[var(--ws-text)] flex items-center gap-2">
                Kanini Field
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-teal/10 text-teal border border-teal/20">FIELD APP</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--ws-surface)] text-gray-4 border border-[var(--ws-border)]">MarketLink</span>
              </div>
              <div className="text-[12px] text-[var(--ws-text-muted)]">Outlet census · visits · intercepts · territory — live field operations via Kanini Field</div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[11px]">
            <span className="hidden sm:inline-flex items-center gap-1 text-[var(--ws-text-muted)]">Superadmin view</span>
            <Link href="/portal/kanini" className="btn-secondary px-3 py-1.5 rounded-[var(--ws-radius-sm)]">Client portal →</Link>
          </div>
        </div>
        <div className="border-t border-[var(--ws-border)] px-3 py-2.5 flex gap-2 overflow-x-auto">
          {tabs.map((t) => {
            const Icon = t.icon;
            const active = t.exact ? pathname === t.href : pathname === t.href || pathname?.startsWith(t.href + "/");
            return (
              <Link
                key={t.href}
                href={t.href}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[12px] font-medium whitespace-nowrap border transition-colors ${active ? "bg-[var(--ws-accent)] text-white border-[var(--ws-accent)] shadow-sm" : "bg-[var(--ws-surface)] border-[var(--ws-border)] text-[var(--ws-text-muted)] hover:text-[var(--ws-text)] hover:border-[var(--ws-accent)]"}`}
              >
                <Icon size={13} /> {t.label}
              </Link>
            );
          })}
        </div>
      </div>

      {children}
    </div>
  );
}