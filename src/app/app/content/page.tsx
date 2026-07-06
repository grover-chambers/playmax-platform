"use client";

import React from "react";
import PageHeader from "@/components/layout/page-header";
import Button from "@/components/ui/button";
import {
  FileText,
  PenLine,
  LayoutDashboard,
  CheckCircle,
  AlertTriangle,
  Clock,
  Eye,
  FileEdit,
  FileCheck,
  MessageSquare,
  BarChart3,
  UserPlus,
  Circle,
  ArrowUpRight,
} from "lucide-react";

const healthItems = [
  {
    label: "Case Studies",
    count: 8,
    meta: "Live · Updated 5d ago",
    status: "good" as const,
  },
  {
    label: "Blog / Insights",
    count: 4,
    meta: "Live · Last: 42d ago",
    status: "warn" as const,
  },
  {
    label: "Inventory",
    count: 48,
    meta: "Active · Updated today",
    status: "good" as const,
  },
  {
    label: "Services",
    count: 6,
    meta: "Live · Updated 10d ago",
    status: "good" as const,
  },
  {
    label: "About / Team",
    count: 1,
    meta: "Live · Last: 94d ago",
    status: "stale" as const,
  },
];

const cqItems = [
  {
    icon: FileText,
    title: "About Us Rewrite",
    meta: "Jake M · Due Fri",
    badge: { label: "Overdue", type: "r" as const },
    actions: true,
  },
  {
    icon: PenLine,
    title: "Case Study: Vertex",
    meta: "Sarah K · Last edit 2h ago",
    badge: { label: "Draft", type: "y" as const },
    actions: true,
  },
  {
    icon: FileEdit,
    title: "Blog: SEO Trends 2025",
    meta: "Tom L · In review queue",
    badge: { label: "In Review", type: "b" as const },
    actions: true,
  },
  {
    icon: LayoutDashboard,
    title: "Service Page Update",
    meta: "Mia R · Due next Wed",
    badge: { label: "Scheduled", type: "g" as const },
    actions: true,
  },
  {
    icon: MessageSquare,
    title: "Portfolio Gallery",
    meta: "Alex P · v2 submitted",
    badge: { label: "Changes requested", type: "n" as const },
    actions: true,
  },
];

const barData = [
  { day: "Mon", value: 55, active: false },
  { day: "Tue", value: 40, active: false },
  { day: "Wed", value: 70, active: false },
  { day: "Thu", value: 35, active: false },
  { day: "Fri", value: 90, active: false },
  { day: "Sat", value: 20, active: false },
  { day: "Sun", value: 45, active: true },
];

const leadSources = [
  { label: "Contact form", count: 28, color: "var(--pm-yellow)" },
  { label: "Billboard inquiry", count: 12, color: "var(--pm-blue)" },
  { label: "Newsletter", count: 7, color: "var(--pm-green)" },
];

const staffList = [
  {
    initials: "SC",
    name: "Sarah Chen",
    role: "Content Director",
    status: "online" as const,
  },
  {
    initials: "JM",
    name: "Jake Martinez",
    role: "Senior Copywriter",
    status: "online" as const,
  },
  {
    initials: "TL",
    name: "Tom Liu",
    role: "SEO Specialist",
    status: "away" as const,
  },
  {
    initials: "MR",
    name: "Mia Rodriguez",
    role: "Content Coordinator",
    status: "online" as const,
  },
  {
    initials: "AP",
    name: "Alex Park",
    role: "Junior Copywriter",
    status: "online" as const,
  },
  {
    initials: "OB",
    name: "Olivia Baker",
    role: "Video Producer",
    status: "away" as const,
  },
  {
    initials: "DK",
    name: "David Kim",
    role: "Graphic Designer",
    status: "online" as const,
  },
];

function HealthIcon({ status }: { status: "good" | "warn" | "stale" }) {
  if (status === "good")
    return (
      <CheckCircle
        className="w-3.5 h-3.5"
        style={{ color: "var(--pm-green)" }}
      />
    );
  if (status === "warn")
    return (
      <AlertTriangle
        className="w-3.5 h-3.5"
        style={{ color: "var(--pm-yellow)" }}
      />
    );
  return (
    <AlertTriangle className="w-3.5 h-3.5" style={{ color: "var(--pm-red)" }} />
  );
}

export default function ContentDeskPage() {
  return (
    <div
      className="flex flex-col h-full"
      style={{ background: "var(--pm-black)" }}
    >
      <PageHeader
        title="Content Desk"
        subtitle="Review content items that need attention across all channels."
      />

      {/* ── Health Bar ── */}
      <div style={{ padding: "0 22px 8px" }}>
        <div className="pm-dash-health-bar">
          {healthItems.map((item) => (
            <div
              key={item.label}
              className={`pm-dash-hb-item${
                item.status === "warn"
                  ? " warn"
                  : item.status === "stale"
                    ? " stale"
                    : ""
              }`}
            >
              <div className="pm-dash-hb-label">{item.label}</div>
              <div className="pm-dash-hb-count">{item.count}</div>
              <div
                className="pm-dash-hb-meta"
                style={{ display: "flex", alignItems: "center", gap: 4 }}
              >
                <HealthIcon status={item.status} />
                {item.meta}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Two-Column Grid ── */}
      <div
        className="flex-1"
        style={{
          display: "grid",
          gridTemplateColumns: "2fr 1fr",
          gap: 14,
          padding: "0 22px 22px",
          overflow: "hidden",
        }}
      >
        {/* ════ Left Column ════ */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 14,
            overflow: "hidden",
          }}
        >
          {/* ── Card 1: Content Queue ── */}
          <div
            className="pm-dash-card"
            style={{
              flex: "1 1 auto",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div className="pm-dash-card-h">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span className="pm-dash-card-t">Content Queue</span>
                <span className="pm-dash-bdg pm-dash-bdg-r">3 need action</span>
              </div>
              <button className="btn-sm" type="button">
                <Eye className="w-3.5 h-3.5" />
                View all
              </button>
            </div>
            <div
              className="pm-dash-card-b pm-dash-card-b-0"
              style={{ overflow: "auto" }}
            >
              {cqItems.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.title} className="pm-dash-cq-row">
                    <div className="pm-dash-cq-icon">
                      <Icon
                        className="w-4 h-4"
                        style={{ color: "var(--pm-gray-3)" }}
                      />
                    </div>
                    <div className="pm-dash-cq-body">
                      <div className="pm-dash-cq-title">{item.title}</div>
                      <div className="pm-dash-cq-meta">{item.meta}</div>
                    </div>
                    <div className="pm-dash-cq-right">
                      <span
                        className={`pm-dash-bdg pm-dash-bdg-${item.badge.type}`}
                      >
                        {item.badge.label}
                      </span>
                      {item.actions && (
                        <>
                          <button
                            className="btn-sm py-1! px-2! border-none!"
                            type="button"
                            title="Edit"
                            style={{ color: "var(--pm-gray-4)" }}
                          >
                            <FileEdit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            className="btn-sm py-1! px-2! border-none!"
                            type="button"
                            title="Review / Approve"
                            style={{ color: "var(--pm-gray-4)" }}
                          >
                            <FileCheck className="w-3.5 h-3.5" />
                          </button>
                          <button
                            className="btn-sm py-1! px-2! border-none!"
                            type="button"
                            title="Open"
                            style={{ color: "var(--pm-gray-4)" }}
                          >
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Card 2: Lead Volume ── */}
          <div className="pm-dash-card" style={{ flexShrink: 0 }}>
            <div className="pm-dash-card-h">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span className="pm-dash-card-t">Website Lead Volume</span>
                <span className="pm-dash-bdg pm-dash-bdg-b">47 total</span>
              </div>
              <div style={{ display: "flex", gap: 4 }}>
                <button
                  className="btn-sm py-1! px-2!"
                  type="button"
                  title="This week"
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <div className="pm-dash-card-b">
              {/* Bar Chart */}
              <div className="pm-dash-bchart">
                {barData.map((bar) => (
                  <div
                    key={bar.day}
                    style={{
                      flex: 1,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                    }}
                  >
                    <div
                      className={`pm-dash-bbar${bar.active ? " active" : ""}`}
                      style={{
                        height: `${bar.value}%`,
                        width: "100%",
                        maxWidth: 32,
                      }}
                    />
                    <div className="pm-dash-bbar-label">{bar.day}</div>
                  </div>
                ))}
              </div>

              {/* Legend / stats */}
              <div
                style={{
                  display: "flex",
                  gap: 20,
                  marginTop: 16,
                  paddingTop: 12,
                  borderTop: "1px solid #1a1a1a",
                }}
              >
                {leadSources.map((src) => (
                  <div
                    key={src.label}
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: src.color,
                        flexShrink: 0,
                      }}
                    />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>
                        {src.count}
                      </div>
                      <div style={{ fontSize: 10, color: "var(--pm-gray-5)" }}>
                        {src.label}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ════ Right Column ════ */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 14,
            overflow: "hidden",
          }}
        >
          {/* ── Card: Staff Directory ── */}
          <div
            className="pm-dash-card"
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            <div className="pm-dash-card-h">
              <span className="pm-dash-card-t">Staff Directory</span>
              <Button variant="primary" size="sm">
                <UserPlus className="w-3.5 h-3.5" />
                Add staff
              </Button>
            </div>
            <div
              className="pm-dash-card-b pm-dash-card-b-0"
              style={{ flex: 1, overflow: "auto", padding: "0 14px" }}
            >
              {staffList.map((staff) => (
                <div key={staff.initials} className="pm-dash-staff-row">
                  <div className="user-avatar">{staff.initials}</div>
                  <div className="pm-dash-staff-info">
                    <div className="pm-dash-staff-name">{staff.name}</div>
                    <div className="pm-dash-staff-role">{staff.role}</div>
                  </div>
                  {staff.status === "online" ? (
                    <span
                      className="pm-dash-bdg pm-dash-bdg-g"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <Circle
                        className="w-2 h-2"
                        fill="var(--pm-green)"
                        stroke="none"
                      />
                      Online
                    </span>
                  ) : (
                    <span
                      className="pm-dash-bdg pm-dash-bdg-n"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <Clock className="w-2.5 h-2.5" />
                      Away
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
