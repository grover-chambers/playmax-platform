"use client";

import React from "react";
import Avatar from "@/components/ui/avatar";
import { Conversation } from "@/lib/types";

interface ConversationListProps {
  conversations: Conversation[];
  activeId?: string;
  onSelect: (id: string) => void;
  filter: string;
  search: string;
}

function ConversationList({
  conversations,
  activeId,
  onSelect,
  filter,
  search,
}: ConversationListProps) {
  const filtered = conversations.filter((c) => {
    if (filter === "WA" && c.channel !== "whatsapp") return false;
    if (filter === "Email" && c.channel !== "email") return false;
    if (filter === "Open" && c.status !== "open") return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        c.contactName.toLowerCase().includes(q) ||
        c.preview.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="flex flex-col overflow-y-auto">
      {filtered.map((conv) => (
        <button
          key={conv.id}
          onClick={() => onSelect(conv.id)}
          className={`thread-item w-full ${activeId === conv.id ? "active" : ""} ${conv.unread > 0 ? "unread" : ""}`}
        >
          <div className="relative flex-shrink-0 mt-0.5">
            <Avatar
              initials={conv.contactInitials}
              variant={activeId === conv.id ? "yellow" : "dark"}
              size="md"
            />
            <span
              className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#0A0A0A] ${
                conv.channel === "whatsapp" ? "bg-wa-green" : "bg-blue"
              }`}
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-0.5">
              <span className="thread-name">{conv.contactName}</span>
              <span className="text-[10px] text-gray-5 flex-shrink-0 ml-2">
                {conv.time}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="thread-preview">{conv.preview}</span>
              {conv.unread > 0 && (
                <span className="thread-unread-dot">{conv.unread}</span>
              )}
            </div>
          </div>
        </button>
      ))}
      {filtered.length === 0 && (
        <div className="py-12 text-center text-[12px] text-gray-5">
          No conversations found
        </div>
      )}
    </div>
  );
}

export default ConversationList;
