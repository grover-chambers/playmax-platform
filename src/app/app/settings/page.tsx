"use client";

import React, { useState } from "react";
import PageHeader from "@/components/layout/page-header";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";

const tabs = ["General", "Team", "Automations", "Templates", "Integrations"];

const teamMembers = [
  { name: "Brian Mwangi", initials: "BM", role: "Director", email: "brian@playmaxagency.co.ke", status: "active" },
  { name: "Amina Mohamed", initials: "AM", role: "Account Manager", email: "amina@playmaxagency.co.ke", status: "active" },
  { name: "Joy Kariuki", initials: "JK", role: "Research Lead", email: "joy@playmaxagency.co.ke", status: "active" },
  { name: "Peter Odhiambo", initials: "PO", role: "Media Ops", email: "peter@playmaxagency.co.ke", status: "inactive" },
];

const automations = [
  { id: "whatsapp-reply", label: "Auto WhatsApp Reply", description: "Automatically reply to incoming WhatsApp messages with a preset greeting", enabled: true },
  { id: "invoice-reminders", label: "Auto Invoice Reminders", description: "Send payment reminders to clients 3 days before invoice due date", enabled: true },
  { id: "portal-notifications", label: "Auto Client Portal Notifications", description: "Notify clients when project updates are posted to the portal", enabled: false },
  { id: "lead-assignment", label: "Auto Lead Assignment", description: "Assign incoming leads to account managers based on industry", enabled: true },
];

const templates = [
  { name: "Welcome Email", type: "Email", lastEdited: "2025-06-12" },
  { name: "Project Brief", type: "Document", lastEdited: "2025-06-08" },
  { name: "Invoice Template", type: "Finance", lastEdited: "2025-05-29" },
  { name: "Completion Report", type: "Report", lastEdited: "2025-05-15" },
  { name: "WhatsApp Quick Reply", type: "WhatsApp", lastEdited: "2025-06-20" },
];

const integrations = [
  { name: "WhatsApp Business API", connected: true },
  { name: "Supabase", connected: true },
  { name: "M-Pesa", connected: true },
  { name: "Gmail", connected: false },
  { name: "Slack", connected: false },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("General");
  const [agencyName, setAgencyName] = useState("PlayMax Agency");
  const [agencyEmail, setAgencyEmail] = useState("hello@playmaxagency.co.ke");
  const [agencyPhone, setAgencyPhone] = useState("+254 700 000 000");
  const [whatsappNumber, setWhatsappNumber] = useState("+254 700 000 000");
  const [currency, setCurrency] = useState("KES");
  const [toggles, setToggles] = useState<Record<string, boolean>>(
    Object.fromEntries(automations.map((a) => [a.id, a.enabled]))
  );

  return (
    <div>
      <PageHeader title="Settings" subtitle="System configuration & team management" />

      <div className="border-b border-[#1E1E1E] flex">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-3 text-[13px] font-display cursor-pointer transition-colors ${
              activeTab === tab
                ? "text-yellow border-b-2 border-yellow font-semibold"
                : "text-gray-4 hover:text-white font-medium border-b-2 border-transparent"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="px-7 py-6 bg-[#0D0D0D] min-h-[calc(100vh-140px)]">
        {activeTab === "General" && (
          <div className="max-w-xl space-y-5">
            <Input label="Agency Name" value={agencyName} onChange={(e) => setAgencyName(e.target.value)} />
            <Input label="Agency Email" value={agencyEmail} onChange={(e) => setAgencyEmail(e.target.value)} />
            <Input label="Agency Phone" value={agencyPhone} onChange={(e) => setAgencyPhone(e.target.value)} />
            <Input label="WhatsApp Business Number" value={whatsappNumber} onChange={(e) => setWhatsappNumber(e.target.value)} />
            <Input label="Default Currency" value={currency} onChange={(e) => setCurrency(e.target.value)} />
            <div className="pt-2">
              <Button variant="primary" size="sm">Save Changes</Button>
            </div>
          </div>
        )}

        {activeTab === "Team" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-4">
              <span className="font-display text-[13px] text-gray-3">{teamMembers.length} team members</span>
              <Button variant="primary" size="sm">+ Invite Member</Button>
            </div>
            {teamMembers.map((member) => (
              <div
                key={member.name}
                className="flex items-center justify-between bg-black-3 border border-[#252525] rounded-sm px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-yellow/15 text-yellow flex items-center justify-center font-display text-[11px] font-bold">
                    {member.initials}
                  </div>
                  <div>
                    <p className="font-display text-[13px] font-semibold text-white">{member.name}</p>
                    <p className="text-[11px] text-gray-5">{member.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-mono text-[11px] text-gray-4">{member.role}</span>
                  <span
                    className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      member.status === "active"
                        ? "bg-green/10 text-green border-green/20"
                        : "bg-gray-4/10 text-gray-4 border-[#2A2A2A]"
                    }`}
                  >
                    {member.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === "Automations" && (
          <div className="max-w-xl space-y-4">
            {automations.map((automation) => (
              <div
                key={automation.id}
                className="flex items-center justify-between bg-black-3 border border-[#252525] rounded-sm px-4 py-4"
              >
                <div className="flex-1 mr-4">
                  <p className="font-display text-[13px] font-semibold text-white">{automation.label}</p>
                  <p className="text-[11px] text-gray-5 mt-0.5">{automation.description}</p>
                </div>
                <button
                  onClick={() =>
                    setToggles((prev) => ({ ...prev, [automation.id]: !prev[automation.id] }))
                  }
                  className={`w-10 h-5 rounded-full relative transition-colors cursor-pointer ${
                    toggles[automation.id] ? "bg-yellow" : "bg-[#333]"
                  }`}
                >
                  <span
                    className={`w-4 h-4 rounded-full absolute top-0.5 transition-transform ${
                      toggles[automation.id]
                        ? "bg-white translate-x-5"
                        : "bg-gray-4 translate-x-0.5"
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        )}

        {activeTab === "Templates" && (
          <div className="space-y-2">
            {templates.map((template) => (
              <div
                key={template.name}
                className="flex items-center justify-between bg-black-3 border border-[#252525] rounded-sm px-4 py-3"
              >
                <div className="flex items-center gap-4 flex-1">
                  <p className="font-display text-[13px] font-semibold text-white">{template.name}</p>
                  <span className="font-mono text-[10px] text-gray-5 bg-[#1A1A1A] px-2 py-0.5 rounded-full border border-[#252525]">
                    {template.type}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-[11px] text-gray-5">Last edited {template.lastEdited}</span>
                  <Button variant="secondary" size="sm">Edit</Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === "Integrations" && (
          <div className="space-y-3">
            {integrations.map((integration) => (
              <div
                key={integration.name}
                className="flex items-center justify-between bg-black-3 border border-[#252525] rounded-sm px-4 py-4"
              >
                <div className="flex items-center gap-3">
                  <p className="font-display text-[13px] font-semibold text-white">{integration.name}</p>
                  <span
                    className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      integration.connected
                        ? "bg-green/10 text-green border-green/20"
                        : "bg-gray-4/10 text-gray-4 border-[#2A2A2A]"
                    }`}
                  >
                    {integration.connected ? "Connected" : "Not Connected"}
                  </span>
                </div>
                <Button variant={integration.connected ? "secondary" : "primary"} size="sm">
                  {integration.connected ? "Disconnect" : "Connect"}
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
