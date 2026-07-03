"use client";

import React, { useState } from "react";
import { ArrowLeft, Mail, Phone, Globe, MapPin } from "lucide-react";
import Link from "next/link";
import PageHeader from "@/components/layout/page-header";
import Avatar from "@/components/ui/avatar";
import StatusBadge from "@/components/ui/status-badge";
import Card from "@/components/ui/card";
import Button from "@/components/ui/button";

type Tab = "overview" | "projects" | "communications" | "invoices" | "activity";

interface Communication {
  type: string;
  with_: string;
  subject: string;
  date: string;
}

interface Invoice {
  id: string;
  amount: string;
  status: string;
  date: string;
}

interface Activity {
  action: string;
  detail: string;
  time: string;
  user: string;
}

const clientData = {
  id: "1",
  company: "Unga Group",
  industry: "FMCG / Manufacturing",
  website: "www.ungagroup.co.ke",
  location: "Nairobi, Kenya",
  phone: "+254 20 765 4321",
  email: "procurement@ungagroup.co.ke",
  owner: "Brian Mwangi",
  ownerInitials: "BM",
  totalValue: "KES 2.4M",
  activeProjects: 3,
  status: "active" as const,
  since: "Jan 2024",
  projects: [
    {
      name: "Brand Audit Q1",
      type: "Research",
      status: "active" as const,
      value: "KES 380K",
      deadline: "Mar 15, 2026",
    },
    {
      name: "Out-of-Home Campaign",
      type: "Campaign",
      status: "active" as const,
      value: "KES 1.2M",
      deadline: "Apr 30, 2026",
    },
    {
      name: "Billboard Inventory Rental",
      type: "Rental",
      status: "review" as const,
      value: "KES 820K",
      deadline: "Ongoing",
    },
  ],
  communications: [
    {
      type: "Email",
      with_: "Grace Njoroge — Procurement",
      subject: "Campaign brief revisions",
      date: "2h ago",
    },
    {
      type: "WhatsApp",
      with_: "Grace Njoroge",
      subject: "Site visit confirmation",
      date: "1d ago",
    },
    {
      type: "Call",
      with_: "CFO — James Kariuki",
      subject: "Budget approval for Q2",
      date: "3d ago",
    },
  ] as Communication[],
  invoices: [
    {
      id: "INV-2026-042",
      amount: "KES 380K",
      status: "Paid",
      date: "Jan 28, 2026",
    },
    {
      id: "INV-2026-038",
      amount: "KES 600K",
      status: "Pending",
      date: "Feb 15, 2026",
    },
    {
      id: "INV-2026-029",
      amount: "KES 1.2M",
      status: "Overdue",
      date: "Dec 20, 2025",
    },
  ] as Invoice[],
  activity: [
    {
      action: "Proposal sent",
      detail: "Out-of-Home Campaign proposal v3",
      time: "2h ago",
      user: "BM",
    },
    {
      action: "Note added",
      detail: "Client requested additional sites in Mombasa",
      time: "1d ago",
      user: "JK",
    },
    {
      action: "Invoice generated",
      detail: "INV-2026-042 for KES 380K",
      time: "5d ago",
      user: "AW",
    },
    {
      action: "Meeting completed",
      detail: "Kickoff for Brand Audit Q1",
      time: "1w ago",
      user: "BM",
    },
    {
      action: "Lead qualified",
      detail: "Moved from pipeline",
      time: "3w ago",
      user: "BM",
    },
  ] as Activity[],
};

const tabItems: { key: Tab; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "projects", label: "Projects" },
  { key: "communications", label: "Communications" },
  { key: "invoices", label: "Invoices" },
  { key: "activity", label: "Activity" },
];

export default function ClientDetailPage() {
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const c = clientData;

  return (
    <div>
      <PageHeader
        title={c.company}
        subtitle={`${c.industry} · Client since ${c.since}`}
        actions={
          <>
            <Link href="/app/clients">
              <Button variant="secondary" size="sm">
                <ArrowLeft size={12} className="mr-1" /> Back
              </Button>
            </Link>
            <Button variant="primary" size="sm">
              New Project
            </Button>
          </>
        }
      />

      <div className="px-7 py-3 flex items-center gap-1 border-b border-[#1E1E1E]">
        {tabItems.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`text-[12px] px-4 py-2 border-b-2 transition-colors cursor-pointer ${
              activeTab === tab.key
                ? "text-yellow border-yellow"
                : "text-gray-4 border-transparent hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="p-7">
        {activeTab === "overview" && (
          <div className="grid grid-cols-3 gap-5">
            <div className="col-span-2 space-y-5">
              <Card hover={false} className="p-5">
                <h3 className="font-display text-[13px] font-semibold mb-4">
                  Company Info
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2.5">
                    <MapPin size={13} className="text-gray-5" />
                    <span className="text-[12px] text-gray-3">
                      {c.location}
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Globe size={13} className="text-gray-5" />
                    <span className="text-[12px] text-gray-3">{c.website}</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Mail size={13} className="text-gray-5" />
                    <span className="text-[12px] text-gray-3">{c.email}</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Phone size={13} className="text-gray-5" />
                    <span className="text-[12px] text-gray-3">{c.phone}</span>
                  </div>
                </div>
              </Card>
              <Card hover={false} className="p-5">
                <h3 className="font-display text-[13px] font-semibold mb-4">
                  Active Projects
                </h3>
                <div className="space-y-3">
                  {c.projects.map((p) => (
                    <div
                      key={p.name}
                      className="flex items-center justify-between py-2 border-b border-[#1E1E1E] last:border-0"
                    >
                      <div>
                        <div className="text-[12px] font-semibold text-white">
                          {p.name}
                        </div>
                        <div className="text-[10px] text-gray-5 mt-0.5">
                          {p.type} · Due {p.deadline}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-display text-[11px] font-bold text-yellow">
                          {p.value}
                        </span>
                        <StatusBadge variant={p.status}>{p.status}</StatusBadge>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
              <Card hover={false} className="p-5">
                <h3 className="font-display text-[13px] font-semibold mb-4">
                  Recent Communications
                </h3>
                <div className="space-y-3">
                  {c.communications.map((comm, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between py-2 border-b border-[#1E1E1E] last:border-0"
                    >
                      <div>
                        <div className="text-[12px] text-white">
                          {comm.subject}
                        </div>
                        <div className="text-[10px] text-gray-5 mt-0.5">
                          {comm.type} · {comm.with_}
                        </div>
                      </div>
                      <span className="text-[10px] text-gray-5">
                        {comm.date}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
            <div className="space-y-5">
              <Card hover={false} className="p-5">
                <h3 className="font-display text-[13px] font-semibold mb-4">
                  Account Details
                </h3>
                <div className="space-y-3.5">
                  <div>
                    <div className="text-[10px] text-gray-5 uppercase font-mono tracking-wider mb-0.5">
                      Status
                    </div>
                    <StatusBadge variant={c.status}>{c.status}</StatusBadge>
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-5 uppercase font-mono tracking-wider mb-0.5">
                      Account Owner
                    </div>
                    <div className="flex items-center gap-2">
                      <Avatar
                        initials={c.ownerInitials}
                        variant="yellow"
                        size="sm"
                      />
                      <span className="text-[12px] text-gray-3">{c.owner}</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-5 uppercase font-mono tracking-wider mb-0.5">
                      Total Value
                    </div>
                    <span className="font-display text-[18px] font-bold text-yellow">
                      {c.totalValue}
                    </span>
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-5 uppercase font-mono tracking-wider mb-0.5">
                      Active Projects
                    </div>
                    <span className="font-display text-[18px] font-bold text-white">
                      {c.activeProjects}
                    </span>
                  </div>
                </div>
              </Card>
              <Card hover={false} className="p-5">
                <h3 className="font-display text-[13px] font-semibold mb-4">
                  Recent Invoices
                </h3>
                <div className="space-y-3">
                  {c.invoices.map((inv) => (
                    <div
                      key={inv.id}
                      className="flex items-center justify-between py-1.5"
                    >
                      <div>
                        <div className="text-[11px] text-gray-3">{inv.id}</div>
                        <div className="text-[10px] text-gray-5">
                          {inv.date}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[11px] font-semibold text-white">
                          {inv.amount}
                        </div>
                        <div
                          className={`text-[9px] font-mono font-bold ${inv.status === "Paid" ? "text-green" : inv.status === "Overdue" ? "text-red" : "text-yellow"}`}
                        >
                          {inv.status}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        )}

        {activeTab === "projects" && (
          <div className="grid grid-cols-2 gap-4">
            {c.projects.map((p) => (
              <Card key={p.name} className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-display text-[13px] font-semibold">
                    {p.name}
                  </span>
                  <StatusBadge variant={p.status}>{p.status}</StatusBadge>
                </div>
                <div className="text-[11px] text-gray-5 mb-3">{p.type}</div>
                <div className="flex items-center justify-between pt-2 border-t border-[#1E1E1E]">
                  <span className="text-[11px] text-gray-5">
                    Due {p.deadline}
                  </span>
                  <span className="font-display text-[11px] font-bold text-yellow">
                    {p.value}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        )}

        {activeTab === "communications" && (
          <Card hover={false} className="p-5">
            <div className="space-y-4">
              {c.communications.map((comm, i) => (
                <div
                  key={i}
                  className="flex items-start gap-4 py-3 border-b border-[#1E1E1E] last:border-0"
                >
                  <div className="w-8 h-8 rounded-full bg-black-4 flex items-center justify-center text-[10px] font-mono text-yellow flex-shrink-0">
                    {comm.type[0]}
                  </div>
                  <div className="flex-1">
                    <div className="text-[12px] text-white font-semibold">
                      {comm.subject}
                    </div>
                    <div className="text-[10px] text-gray-5 mt-0.5">
                      {comm.with_}
                    </div>
                  </div>
                  <span className="text-[10px] text-gray-5 flex-shrink-0">
                    {comm.date}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {activeTab === "invoices" && (
          <Card hover={false} className="p-5">
            <table className="w-full">
              <thead>
                <tr className="text-[10px] font-mono text-gray-5 uppercase tracking-wider border-b border-[#1E1E1E]">
                  <th className="text-left py-2.5 font-medium">Invoice</th>
                  <th className="text-left py-2.5 font-medium">Date</th>
                  <th className="text-right py-2.5 font-medium">Amount</th>
                  <th className="text-right py-2.5 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {c.invoices.map((inv) => (
                  <tr key={inv.id} className="border-b border-[#1A1A1A]">
                    <td className="py-3 text-[12px] text-white font-semibold">
                      {inv.id}
                    </td>
                    <td className="py-3 text-[12px] text-gray-4">{inv.date}</td>
                    <td className="py-3 text-right font-display text-[12px] font-semibold text-yellow">
                      {inv.amount}
                    </td>
                    <td className="py-3 text-right">
                      <span
                        className={`font-mono text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                          inv.status === "Paid"
                            ? "bg-green/10 text-green border-green/20"
                            : inv.status === "Overdue"
                              ? "bg-red/10 text-red border-red/20"
                              : "bg-yellow/10 text-yellow border-yellow/20"
                        }`}
                      >
                        {inv.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}

        {activeTab === "activity" && (
          <Card hover={false} className="p-5">
            <div className="space-y-0">
              {c.activity.map((a, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 py-3 border-b border-[#1E1E1E] last:border-0"
                >
                  <div className="flex flex-col items-center mt-1">
                    <div className="w-2 h-2 rounded-full bg-yellow flex-shrink-0" />
                    {i < c.activity.length - 1 && (
                      <div className="w-px h-full bg-[#1E1E1E] mt-1" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="text-[12px] text-white">
                      <span className="font-semibold">{a.action}</span>
                      <span className="text-gray-4"> — {a.detail}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Avatar initials={a.user} variant="dark" size="sm" />
                      <span className="text-[10px] text-gray-5">{a.time}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
