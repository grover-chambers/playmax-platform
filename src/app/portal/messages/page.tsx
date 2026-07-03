"use client";

import React, { useState, useRef, useEffect } from "react";
import { Send } from "lucide-react";
import Avatar from "@/components/ui/avatar";
import Button from "@/components/ui/button";
import MessageBubble from "@/components/inbox/message-bubble";
import { Message } from "@/lib/types";

const sampleMessages: Message[] = [
  {
    id: "pm-1",
    conversationId: "conv-pm",
    direction: "outbound",
    text: "Hi P&G team! Just wanted to confirm — the Westlands Screen Package is on track for deployment next week. Everything looks good on our end.",
    time: "10:30 AM",
    channel: "email",
    senderName: "PlayMax Agency",
  },
  {
    id: "pm-2",
    conversationId: "conv-pm",
    direction: "inbound",
    text: "Great, thanks for the update! Do you have the final creative assets ready? We need to get internal sign-off by Thursday.",
    time: "11:15 AM",
    channel: "email",
    senderName: "P&G East Africa",
  },
  {
    id: "pm-3",
    conversationId: "conv-pm",
    direction: "outbound",
    text: "Yes, the Campaign Creative Deck will be uploaded to your portal by end of day Wednesday. I'll ping you once it's ready.",
    time: "11:22 AM",
    channel: "email",
    senderName: "PlayMax Agency",
  },
  {
    id: "pm-4",
    conversationId: "conv-pm",
    direction: "inbound",
    text: "Perfect. Also, can we schedule a quick call to discuss the Campaign Expansion timeline? We have some budget adjustments to review.",
    time: "2:00 PM",
    channel: "email",
    senderName: "P&G East Africa",
  },
  {
    id: "pm-5",
    conversationId: "conv-pm",
    direction: "outbound",
    text: "Absolutely! I'll send over a calendar invite for tomorrow afternoon. We'll walk through the revised scope and updated pricing.",
    time: "2:18 PM",
    channel: "email",
    senderName: "PlayMax Agency",
  },
];

export default function PortalMessagesPage() {
  const [messages, setMessages] = useState<Message[]>(sampleMessages);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    const newMsg: Message = {
      id: `pm-${Date.now()}`,
      conversationId: "conv-pm",
      direction: "inbound",
      text: input.trim(),
      time: new Date().toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }),
      channel: "email",
      senderName: "P&G East Africa",
    };
    setMessages((prev) => [...prev, newMsg]);
    setInput("");
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="page-title">Messages</h1>
        <p className="page-subtitle">Communication with PlayMax Agency</p>
      </div>

      <div
        className="card !bg-black-2 overflow-hidden"
        style={{ height: "calc(100vh - 260px)" }}
      >
        <div className="flex h-full">
          <div className="w-[220px] border-r border-[#1A1A1A] flex flex-col flex-shrink-0">
            <div className="px-4 py-3 border-b border-[#1A1A1A]">
              <span className="eyebrow !text-[9px] !text-gray-5">
                Conversations
              </span>
            </div>
            <div className="px-3 py-3">
              <div className="card-hover-yellow card !bg-yellow/5 !border-yellow/20 px-3 py-2.5 cursor-pointer flex items-center gap-2.5">
                <Avatar initials="PM" variant="yellow" size="md" />
                <div className="min-w-0">
                  <div className="text-[12px] font-semibold truncate">
                    PlayMax Agency
                  </div>
                  <div className="text-[10px] text-gray-5 truncate">
                    Absolutely! I&apos;ll send over...
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 flex flex-col min-w-0">
            <div className="px-5 py-3 border-b border-[#1A1A1A] bg-black flex items-center gap-3">
              <Avatar initials="PM" variant="yellow" size="md" />
              <div>
                <div className="text-[13px] font-semibold">PlayMax Agency</div>
                <div className="text-[10px] text-gray-5 font-mono">
                  Account Manager · Active
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 bg-[#0D0D0D]">
              {messages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} />
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="px-5 py-3 border-t border-[#1A1A1A] bg-black">
              <div className="flex items-end gap-2">
                <div className="compose-input flex items-end gap-2">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    placeholder="Type a message..."
                    rows={1}
                    className="flex-1 bg-transparent border-none outline-none text-[13px] text-white resize-none placeholder:text-[#555]"
                  />
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleSend}
                    disabled={!input.trim()}
                  >
                    <Send className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
