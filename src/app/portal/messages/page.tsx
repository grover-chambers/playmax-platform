"use client";

import React, { useState, useEffect, useRef, startTransition } from "react";
import { Send, Loader2 } from "lucide-react";
import Avatar from "@/components/ui/avatar";
import Button from "@/components/ui/button";
import PageHeader from "@/components/layout/page-header";
import { createClient } from "@/lib/supabase/browser";


interface Conversation {
  id: string;
  contact_name: string;
  channel: string;
  status: string;
  last_message_at: string | null;
}

interface Message {
  id: string;
  conversation_id: string;
  direction: string;
  text: string;
  channel: string;
  sender_name: string | null;
  is_automation: boolean;
  created_at: string;
}

export default function PortalMessagesPage() {

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/portal/conversations")
      .then((r) => r.json())
      .then(({ conversations: data }) => {
        startTransition(() => {
          setConversations(data || []);
          setLoadingConvs(false);
          if (data && data.length > 0) setActiveConvId(data[0].id);
        });
      })
      .catch(() => startTransition(() => setLoadingConvs(false)));
  }, []);

  useEffect(() => {
    if (!activeConvId) return;
    fetch(`/api/portal/messages?conversationId=${activeConvId}`)
      .then((r) => r.json())
      .then(({ messages: data }) => {
        startTransition(() => {
          setMessages(data || []);
          setLoadingMsgs(false);
        });
      })
      .catch(() => startTransition(() => setLoadingMsgs(false)));

    // Realtime subscription for live messages in this conversation
    const supabase = createClient();
    const channel = supabase
      .channel(`messages:${activeConvId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${activeConvId}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => [...prev, newMsg]);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeConvId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !activeConvId || sending) return;
    setSending(true);
    try {
      const res = await fetch("/api/portal/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversation_id: activeConvId,
          text: input.trim(),
          channel: "email",
        }),
      });
      if (res.ok) {
        const { message } = await res.json();
        setMessages((prev) => [...prev, message]);
        setInput("");
      }
    } finally {
      setSending(false);
    }
  };

  const activeConv = conversations.find((c) => c.id === activeConvId);

  return (
    <div className="page-content">
      <PageHeader title="Messages" subtitle="Communication with your account manager" />

      <div
        className="pm-dash-card pm-dash-card-b-0 overflow-hidden"
        style={{ height: "calc(100vh - 260px)" }}
      >
        <div className="flex h-full">
          {/* Sidebar */}
          <div className="w-[220px] border-r border-[var(--ws-border)] flex flex-col flex-shrink-0">
            <div className="px-4 py-3 border-b border-[var(--ws-border)]">
              <span className="eyebrow text-[9px]! text-gray-5!">Conversations</span>
            </div>
            <div className="px-3 py-3 flex-1 overflow-y-auto">
              {loadingConvs ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="w-4 h-4 animate-spin text-teal" />
                </div>
              ) : conversations.length === 0 ? (
                <div className="text-[11px] text-gray-5 py-4 text-center">No conversations yet</div>
              ) : (
                conversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => { setLoadingMsgs(true); setActiveConvId(conv.id); }}
                    className={`w-full text-left pm-dash-card bg-teal/5! border-teal/20! px-3 py-2.5 cursor-pointer flex items-center gap-2.5 mb-2 ${
                      activeConvId === conv.id ? "ring-1 ring-teal" : ""
                    }`}
                  >
                    <Avatar
                      initials={
                        conv.contact_name
                          ?.split(" ")
                          .map((w) => w[0])
                          .join("")
                          .slice(0, 2) || "?"
                      }
                      variant="yellow"
                      size="md"
                    />
                    <div className="min-w-0">
                      <div className="text-[12px] font-semibold truncate">{conv.contact_name}</div>
                      <div className="text-[10px] text-gray-5 truncate">{conv.channel}</div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Chat area — dark-themed, resists light-theme overrides */}
          <div className="flex-1 flex flex-col min-w-0 messages-chat">
            {activeConv ? (
              <>
                <div className="pm-dash-card pm-dash-card-b px-5 py-3 flex items-center gap-3">
                  <Avatar
                    initials={
                      activeConv.contact_name
                        ?.split(" ")
                        .map((w) => w[0])
                        .join("")
                        .slice(0, 2) || "?"
                    }
                    variant="yellow"
                    size="md"
                  />
                  <div>
                    <div className="text-[13px] font-semibold text-white">{activeConv.contact_name}</div>
                    <div className="text-[10px] text-gray-5 font-mono">
                      {activeConv.channel} · {activeConv.status}
                    </div>
                  </div>
                </div>

                <div className="pm-dash-card pm-dash-card-b flex-1 overflow-y-auto px-5 py-4">
                  {loadingMsgs ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="w-5 h-5 animate-spin text-teal" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="text-[12px] text-gray-5 text-center py-8">No messages yet</div>
                  ) : (
                    messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`mb-3 flex ${
                          msg.direction === "inbound" ? "justify-start" : "justify-end"
                        }`}
                      >
                        <div
                          className={`max-w-[70%] rounded-lg px-4 py-2.5 ${
                            msg.direction === "inbound"
                              ? "pm-dash-card pm-dash-card-b"
                              : "bg-teal/20 border border-teal/30"
                          }`}
                        >
                          <p className="text-[13px] text-gray-1 leading-relaxed">{msg.text}</p>
                          <div className="flex items-center justify-end gap-1.5 mt-1">
                            <span className="text-[10px] text-gray-5 font-mono">
                              {new Date(msg.created_at).toLocaleTimeString("en-US", {
                                hour: "numeric",
                                minute: "2-digit",
                                hour12: true,
                              })}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <div className="pm-dash-card pm-dash-card-b px-5 py-3">
                  <div className="flex items-end gap-2">
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
                      className="flex-1 bg-transparent border-none outline-none text-[13px] text-white resize-none placeholder:text-gray-5"
                    />
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleSend}
                      disabled={!input.trim() || sending}
                    >
                      <Send className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-[13px] text-gray-5">
                Select a conversation
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
