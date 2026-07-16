"use client";

import { useState } from "react";
import SearchBox from "@/components/ui/search-box";
import FilterPill from "@/components/ui/filter-pill";
import ConversationList from "@/components/inbox/conversation-list";
import ConversationPanel from "@/components/inbox/conversation-panel";
import { sampleConversations, sampleMessages } from "@/lib/data";
import { Message } from "@/lib/types";

const tabs = ["All", "WA", "Email", "Open"];

export default function InboxPage() {
  const [activeTab, setActiveTab] = useState("All");
  const [search, setSearch] = useState("");
  const [activeConvId, setActiveConvId] = useState(sampleConversations[0].id);
  const [messagesMap, setMessagesMap] = useState(sampleMessages);

  const activeConv = sampleConversations.find((c) => c.id === activeConvId);
  const activeMessages = messagesMap[activeConvId] || [];

  const handleSendMessage = (text: string, channel: "whatsapp" | "email") => {
    if (!activeConv) return;
    const newMsg: Message = {
      id: `m-${Date.now()}`,
      conversationId: activeConvId,
      direction: "outbound",
      text,
      time: new Date().toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }),
      channel,
      senderName: "Brian Mwangi",
    };
    setMessagesMap((prev) => ({
      ...prev,
      [activeConvId]: [...(prev[activeConvId] || []), newMsg],
    }));
  };

  return (
    <div className="flex h-full">
      <div className="w-[300px] border-r border-[#1A1A1A] pm-dash-card pm-dash-card-b-0 flex flex-col flex-shrink-0">
        <div className="px-4 py-4 border-b border-[#1A1A1A]">
          <h1 className="font-display text-[15px] font-bold mb-3">Inbox</h1>
          <SearchBox
            placeholder="Search conversations..."
            value={search}
            onChange={setSearch}
          />
        </div>
        <div className="flex gap-1 px-4 py-2.5 border-b border-[#1A1A1A]">
          {tabs.map((tab) => (
            <FilterPill
              key={tab}
              active={activeTab === tab}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </FilterPill>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto">
          <ConversationList
            conversations={sampleConversations}
            activeId={activeConvId}
            onSelect={setActiveConvId}
            filter={activeTab}
            search={search}
          />
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        {activeConv ? (
          <div className="pm-dash-card flex-1">
            <ConversationPanel
              conversation={activeConv}
              messages={activeMessages}
              onSendMessage={handleSendMessage}
            />
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-[13px] text-gray-5">
            Select a conversation
          </div>
        )}
      </div>
    </div>
  );
}
