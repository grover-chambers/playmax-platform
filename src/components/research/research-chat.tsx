"use client";

import React, { useState, useRef, useEffect, startTransition } from "react";
import { Send, Loader2, Bot, User, AlertCircle } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ResearchChatProps {
  projectId: string | null;
  reportId?: string | null;
  onUseAsSummary?: (text: string) => void;
}

export default function ResearchChat({ projectId, reportId, onUseAsSummary }: ResearchChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Ask me anything about the market data for this project. I can analyze competition, categories, branches, supply gaps, and consumer behaviour." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    startTransition(() => {
      setMessages([
        { role: "assistant", content: "Ask me anything about the market data for this project. I can analyze competition, categories, branches, supply gaps, and consumer behaviour." },
      ]);
      setError("");
    });
  }, [projectId]);

  async function handleSend() {
    if (!input.trim() || !projectId || loading) return;
    const userMsg = input.trim();
    setInput("");
    setError("");

    const updated = [...messages, { role: "user" as const, content: userMsg }];
    setMessages(updated);
    setLoading(true);

    try {
      const res = await fetch("/api/research/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id: projectId, messages: updated, report_id: reportId || undefined }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Chat unavailable" }));
        throw new Error(err.error || "Chat request failed");
      }

      const data = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to get response";
      setError(msg);
      setMessages((prev) => [...prev, { role: "assistant", content: `Error: ${msg}` }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="border-t border-[#1E1E1E] flex flex-col" style={{ height: 320 }}>
      <div className="px-5 py-2.5 border-b border-[#1E1E1E] flex items-center gap-2 bg-black-2">
        <Bot size={14} className="text-yellow" />
        <span className="text-[11px] font-semibold text-gray-3">AI Market Analyst</span>
        {loading && <Loader2 className="w-3 h-3 animate-spin text-yellow ml-auto" />}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-2.5 ${msg.role === "user" ? "justify-end" : ""}`}>
            {msg.role === "assistant" && (
              <div className="w-6 h-6 rounded-full bg-yellow/10 flex items-center justify-center shrink-0 mt-0.5">
                <Bot size={12} className="text-yellow" />
              </div>
            )}
            <div className={`max-w-[85%] ${msg.role === "user" ? "order-first" : ""}`}>
              <div className={`text-[11px] leading-relaxed px-3 py-2 rounded-xl ${
                msg.role === "user"
                  ? "bg-yellow/10 text-gray-2 rounded-tr-sm"
                  : msg.content.startsWith("Error:")
                    ? "bg-red/10 text-red border border-red/20"
                    : "bg-black-3 text-gray-3 rounded-tl-sm border border-[#252525]"
              }`}>
                {msg.content}
              </div>
              {msg.role === "assistant" && !msg.content.startsWith("Error:") && (
                <div className="flex items-center gap-2 mt-1">
                  <div className="text-[9px] text-gray-6 font-mono">AI Analyst</div>
                  {onUseAsSummary && i === messages.length - 1 && (
                    <button
                      onClick={() => onUseAsSummary(msg.content)}
                      className="text-[9px] font-mono text-yellow hover:text-yellow/80 transition-colors"
                    >
                      Use as summary
                    </button>
                  )}
                </div>
              )}
            </div>
            {msg.role === "user" && (
              <div className="w-6 h-6 rounded-full bg-teal/10 flex items-center justify-center shrink-0 mt-0.5">
                <User size={12} className="text-teal" />
              </div>
            )}
          </div>
        ))}
        {error && (
          <div className="flex items-center gap-2 text-[10px] text-red bg-red/5 border border-red/20 rounded-lg px-3 py-2">
            <AlertCircle size={12} />
            {error}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="px-4 py-3 border-t border-[#1E1E1E] bg-black-2">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder={projectId ? "Ask about this project's market data..." : "Select a research project first..."}
            disabled={!projectId || loading}
            className="flex-1 bg-black-3 border border-[#252525] rounded-lg px-3 py-2 text-[12px] text-gray-3 placeholder-gray-6 outline-none focus:border-yellow/40 transition-colors disabled:opacity-40"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || !projectId || loading}
            className="w-9 h-9 rounded-lg bg-yellow/10 border border-yellow/20 flex items-center justify-center text-yellow hover:bg-yellow/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send size={14} />}
          </button>
        </div>
      </div>
    </div>
  );
}
