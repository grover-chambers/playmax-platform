"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Phone,
  Mail,
  Link2,
  MoreHorizontal,
  Send,
  FileText,
  ArrowRightLeft,
} from "lucide-react";
import Avatar from "@/components/ui/avatar";
import Badge from "@/components/ui/badge";
import Button from "@/components/ui/button";
import MessageBubble from "./message-bubble";
import { Conversation, Message } from "@/lib/types";

interface ConversationPanelProps {
  conversation: Conversation;
  messages: Message[];
  onSendMessage: (text: string, channel: "whatsapp" | "email") => void;
}

function ConversationPanel({
  conversation,
  messages,
  onSendMessage,
}: ConversationPanelProps) {
  const [input, setInput] = useState("");
  const [activeChannel, setActiveChannel] = useState<"whatsapp" | "email">(
    conversation.channel,
  );
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (input.trim()) {
      onSendMessage(input.trim(), activeChannel);
      setInput("");
    }
  };

  return (
    <div className="inbox-chat flex flex-col h-full">
      <div className="pm-chat-head px-6 py-4 border-b border-[#1A1A1A] bg-black">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <Avatar
              initials={conversation.contactInitials}
              variant="yellow"
              size="lg"
            />
            <div>
              <h2 className="font-display text-[15px] font-semibold">
                {conversation.contactName}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <Badge
                  variant={
                    conversation.channel === "whatsapp" ? "whatsapp" : "active"
                  }
                >
                  {conversation.channel === "whatsapp" ? "WhatsApp" : "Email"}
                </Badge>
                {conversation.projectName && (
                  <span className="text-[10px] text-gray-5 font-mono">
                    {conversation.projectName}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 hover:bg-white/5 rounded transition-colors">
              <Phone className="w-4 h-4 text-gray-4" />
            </button>
            <button className="p-2 hover:bg-white/5 rounded transition-colors">
              <Mail className="w-4 h-4 text-gray-4" />
            </button>
            <button className="p-2 hover:bg-white/5 rounded transition-colors">
              <Link2 className="w-4 h-4 text-gray-4" />
            </button>
            <button className="p-2 hover:bg-white/5 rounded transition-colors">
              <MoreHorizontal className="w-4 h-4 text-gray-4" />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="search-box bg-black-3!">
            <span className="text-[11px] text-gray-3">Pipeline:</span>
            <span className="text-[11px] font-display font-bold text-yellow">
              {conversation.pipelineValue || "—"}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 px-6 py-2 border-b border-[#1A1A1A] bg-[#0D0D0D]">
        <button
          onClick={() =>
            setActiveChannel(
              activeChannel === "whatsapp" ? "email" : "whatsapp",
            )
          }
          className="flex items-center gap-1.5 text-[11px] text-gray-4 hover:text-yellow transition-colors cursor-pointer"
        >
          <ArrowRightLeft className="w-3 h-3" />
          Reply via {activeChannel === "whatsapp" ? "WhatsApp" : "Email"}
          <span className="text-[9px] text-gray-5">
            · Switch to {activeChannel === "whatsapp" ? "Email" : "WhatsApp"}
          </span>
        </button>
      </div>

      <div className="pm-chat-stream flex-1 overflow-y-auto px-6 py-4 bg-[#0D0D0D]">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="pm-chat-compose px-6 py-3 border-t border-[#1A1A1A] bg-black">
        <div className="flex items-end gap-2">
          <button className="p-2 hover:bg-white/5 rounded transition-colors flex-shrink-0">
            <FileText className="w-4 h-4 text-gray-4" />
          </button>
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
              placeholder={`Reply via ${activeChannel === "whatsapp" ? "WhatsApp" : "Email"}...`}
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
  );
}

export default ConversationPanel;
