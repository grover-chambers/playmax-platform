"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import SearchBox from "@/components/ui/search-box";
import FilterPill from "@/components/ui/filter-pill";
import ConversationList from "@/components/inbox/conversation-list";
import ConversationPanel from "@/components/inbox/conversation-panel";
import { createClient } from "@/lib/supabase/browser";
import type { Conversation, Message } from "@/lib/types";

const tabs = ["All", "WA", "Email", "Open"];

/** Map a raw API message (snake_case) to the local Message type (camelCase). */
function mapApiMessage(raw: Record<string, unknown>): Message {
  const createdAt = raw.created_at as string;
  const date = createdAt ? new Date(createdAt) : new Date();
  const time = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return {
    id: String(raw.id),
    conversationId: String(raw.conversation_id),
    direction: (raw.direction as "inbound" | "outbound") || "inbound",
    text: String(raw.text || ""),
    time,
    channel: (raw.channel as "whatsapp" | "email") || "whatsapp",
    senderName: (raw.sender_name as string) || undefined,
    isAutomation: Boolean(raw.is_automation),
  };
}

export default function InboxPage() {
  const [activeTab, setActiveTab] = useState("All");
  const [search, setSearch] = useState("");

  /* ── Data state ─────────────────────────────────── */
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messagesMap, setMessagesMap] = useState<Record<string, Message[]>>({});
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [senderName, setSenderName] = useState("Staff");

  /* ── Loading / error state ──────────────────────── */
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = useRef(createClient());
  const messagesFetched = useRef<Set<string>>(new Set());

  /* ── Fetch the logged-in user's name on mount ──── */
  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.current.auth.getUser();
        const user = data?.user;
        if (user) {
          const name =
            (user.user_metadata?.name as string) ||
            user.email?.split("@")[0] ||
            "Staff";
          setSenderName(name);
        }
      } catch {
        /* fall back to default "Staff" */
      }
    })();
  }, []);

  /* ── Fetch conversations on mount ──────────────── */
  useEffect(() => {
    (async () => {
      try {
        setLoadingConvs(true);
        const res = await fetch("/api/conversations");
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Failed to load conversations");
        const convs: Conversation[] = json.conversations || [];
        setConversations(convs);
        if (convs.length > 0 && !activeConvId) {
          setActiveConvId(convs[0].id);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load conversations");
      } finally {
        setLoadingConvs(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Fetch messages when active conversation changes ── */
  useEffect(() => {
    if (!activeConvId) return;
    if (messagesFetched.current.has(activeConvId)) return;
    let cancelled = false;
    (async () => {
      try {
        setLoadingMsgs(true);
        const res = await fetch(`/api/messages?conversationId=${activeConvId}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Failed to load messages");
        const msgs: Message[] = (json.messages || []).map(mapApiMessage);
        if (!cancelled) {
          setMessagesMap((prev) => ({ ...prev, [activeConvId]: msgs }));
          messagesFetched.current.add(activeConvId);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load messages");
      } finally {
        if (!cancelled) setLoadingMsgs(false);
      }
    })();
    return () => { cancelled = true; };
  }, [activeConvId]);

  /* ── Derived state ──────────────────────────────── */
  const activeConv = conversations.find((c) => c.id === activeConvId) || null;
  const activeMessages = activeConvId ? messagesMap[activeConvId] || [] : [];

  /* ── Send message ───────────────────────────────── */
  const handleSendMessage = useCallback(
    async (text: string, channel: "whatsapp" | "email") => {
      if (!activeConvId) return;

      // Optimistic insert
      const optimisticMsg: Message = {
        id: `temp-${Date.now()}`,
        conversationId: activeConvId,
        direction: "outbound",
        text,
        time: new Date().toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        }),
        channel,
        senderName,
      };
      setMessagesMap((prev) => ({
        ...prev,
        [activeConvId]: [...(prev[activeConvId] || []), optimisticMsg],
      }));

      try {
        const res = await fetch("/api/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversation_id: activeConvId,
            text,
            channel,
            direction: "outbound",
            sender_name: senderName,
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Failed to send message");

        // Replace optimistic message with the real one
        const realMsg = mapApiMessage(json.message);
        setMessagesMap((prev) => {
          const msgs = prev[activeConvId] || [];
          return {
            ...prev,
            [activeConvId]: msgs.map((m) =>
              m.id === optimisticMsg.id ? realMsg : m,
            ),
          };
        });
      } catch (e) {
        // Remove the optimistic message on failure
        setMessagesMap((prev) => {
          const msgs = prev[activeConvId] || [];
          return {
            ...prev,
            [activeConvId]: msgs.filter((m) => m.id !== optimisticMsg.id),
          };
        });
        setError(e instanceof Error ? e.message : "Failed to send message");
      }
    },
    [activeConvId, senderName],
  );

  /* ── Render ──────────────────────────────────────── */
  return (
    <div className="page-content flex h-full">
      {/* ── Left panel: conversations ──────────────── */}
      <div className="pm-dash-card w-[300px] flex flex-col flex-shrink-0 overflow-hidden mr-4">
        <div className="px-4 py-4 border-b border-[var(--ws-border)]">

          <h1 className="font-display text-[15px] font-bold mb-3">Inbox</h1>
          <SearchBox
            placeholder="Search conversations..."
            value={search}
            onChange={setSearch}
          />
        </div>
        <div className="flex gap-1 px-4 py-2.5 border-b border-[var(--ws-border)]">
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
          {loadingConvs ? (
            <div className="py-12 text-center text-[12px] text-gray-5">
              Loading conversations…
            </div>
          ) : error && conversations.length === 0 ? (
            <div className="py-12 text-center text-[12px] text-red">
              {error}
            </div>
          ) : (
            <ConversationList
              conversations={conversations}
              activeId={activeConvId || undefined}
              onSelect={setActiveConvId}
              filter={activeTab}
              search={search}
            />
          )}
        </div>
      </div>

      {/* ── Right panel: conversation detail ────────── */}
      <div className="pm-dash-card flex-1 flex flex-col min-w-0 overflow-hidden">
        {loadingConvs && !activeConv ? (
          <div className="flex-1 flex items-center justify-center text-[13px] text-gray-5">
            Loading…
          </div>
        ) : activeConv ? (
          <>
            {loadingMsgs && activeMessages.length === 0 && (
              <div className="flex items-center justify-center py-20 text-[12px] text-gray-5">
                Loading messages…
              </div>
            )}

            <ConversationPanel
              conversation={activeConv}
              messages={activeMessages}
              onSendMessage={handleSendMessage}
            />
          </>

        ) : (
          <div className="flex-1 flex items-center justify-center text-[13px] text-gray-5">
            Select a conversation
          </div>
        )}
      </div>
    </div>
  );
}
