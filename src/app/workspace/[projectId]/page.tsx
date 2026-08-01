"use client";

import { useState, useEffect, use, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import {
  ArrowLeft,
  Plus,
  Users,
  CheckSquare,
  MessageSquare,
  PanelRightOpen,
  StickyNote,
  Type,
  Trash2,
  Palette,
  GripHorizontal,
  Send,
  X,
} from "lucide-react";

/* ── Types ─────────────────────────────────────────── */
interface NoteItem {
  id: string;
  x: number;
  y: number;
  content: string;
  color: string;
  author_name: string;
}

interface TeamMember {
  id: string;
  name: string;
  initials: string;
  role: string;
}

interface ChatMessage {
  id: string;
  author_name: string;
  text: string;
  time: string;
}

interface ProjectData {
  id: string;
  name: string;
  client: string;
  status: string;
}

interface TaskItem {
  id: string;
  name: string;
  assignee: string;
  assigneeInitials: string;
  done: boolean;
  due_date: string;
}

type RightTab = "team" | "tasks" | "chat";

/* ── Helpers ───────────────────────────────────────── */
function initials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

const NOTE_COLORS = ["#FCD34D", "#60A5FA", "#34D399", "#F472B6", "#A78BFA"];

export default function WorkspacePage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = use(params);
  const router = useRouter();

  /* ── Data state ── */
  const [project, setProject] = useState<ProjectData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [currentUser, setCurrentUser] = useState<{ id: string; role: string; name: string } | null>(null);

  /* ── Right panel ── */
  const [panelOpen, setPanelOpen] = useState(true);
  const [rightTab, setRightTab] = useState<RightTab>("team");

  /* ── Board canvas ── */
  const canvasRef = useRef<HTMLDivElement>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0 });
  const panOrigin = useRef({ x: 0, y: 0 });

  /* ── Sticky notes ── */
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [draggingNote, setDraggingNote] = useState<string | null>(null);
  const dragOffset = useRef({ x: 0, y: 0 });

  /* ── Chat auto-scroll ref ── */
  const chatEndRef = useRef<HTMLDivElement>(null);

  /* ── Data fetch ── */
  useEffect(() => {
    (async () => {
      try {
        const supabase = createClient();
        const { data: authData } = await supabase.auth.getUser();
        const userId = authData?.user?.id ?? null;
        const userRole = authData?.user?.user_metadata?.role as string | undefined;
        const userName = authData?.user?.user_metadata?.name as string | undefined;
        if (userId) setCurrentUser({ id: userId, role: userRole || "", name: userName || "You" });

        const res = await fetch(`/api/projects/${projectId}`);
        const data = await res.json();
        const p = data.project;

        setProject({
          id: p.id,
          name: p.name,
          client: p.clients?.company || "—",
          status: p.status || "draft",
        });

        /* Map notes from API */
        if (Array.isArray(data.notes)) {
          setNotes(
            data.notes.map((n: Record<string, unknown>) => ({
              id: n.id as string,
              x: (n.x as number) || 200,
              y: (n.y as number) || 200,
              content: (n.content as string) || "",
              color: (n.color as string) || NOTE_COLORS[0],
              author_name: (n.author_name as string) || "Unknown",
            }))
          );
        }

        /* Map team members from API */
        if (Array.isArray(data.members)) {
          setTeam(
            data.members.map((m: Record<string, unknown>) => {
              const name = (m.name as string) || "Unknown";
              return {
                id: m.id as string,
                name,
                initials: initials(name),
                role: (m.role as string) || "Member",
              };
            })
          );
        } else if (userId && userRole === "crm_staff") {
          setTeam([{ id: userId, name: userName || "You", initials: initials(userName || "You"), role: "CRM Staff" }]);
        }

        /* Map chat messages from API */
        if (Array.isArray(data.messages)) {
          setMessages(
            data.messages.map((m: Record<string, unknown>) => ({
              id: m.id as string,
              author_name: (m.author_name as string) || "Unknown",
              text: (m.text as string) || "",
              time: m.time
                ? new Date(m.time as string).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                : "",
            }))
          );
        }

        /* Fetch tasks */
        let { data: dbTasks } = await supabase
          .from("tasks").select("*")
          .eq("project_id", projectId)
          .order("created_at", { ascending: false });
        if (userRole === "crm_staff" && userId && dbTasks) {
          dbTasks = dbTasks.filter((t) => t.assigned_to === userId);
        }
        if (dbTasks && dbTasks.length > 0) {
          setTasks(dbTasks.map((t) => ({
            id: t.id, name: t.title, assignee: t.assigned_to || "Unassigned",
            assigneeInitials: initials(t.assigned_to || ""), done: t.status === "done", due_date: t.due_date || "",
          })));
        }
      } catch {
        setProject({ id: projectId, name: "New Project", client: "—", status: "draft" });
      } finally {
        setLoading(false);
      }
    })();
  }, [projectId]);

  /* ── Chat auto-scroll ── */
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* ── Canvas pan handlers ── */
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("[data-note]")) return;
    if ((e.target as HTMLElement).closest("[data-panel]")) return;
    setIsPanning(true);
    panStart.current = { x: e.clientX, y: e.clientY };
    panOrigin.current = { x: pan.x, y: pan.y };
  }, [pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning) {
      setPan({
        x: panOrigin.current.x + (e.clientX - panStart.current.x),
        y: panOrigin.current.y + (e.clientY - panStart.current.y),
      });
    }
    if (draggingNote) {
      setNotes((prev) =>
        prev.map((n) =>
          n.id === draggingNote
            ? { ...n, x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y }
            : n
        )
      );
    }
  }, [isPanning, draggingNote]);

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
    if (draggingNote) {
      const note = notes.find((n) => n.id === draggingNote);
      if (note && !note.id.startsWith("temp_")) {
        fetch(`/api/projects/${projectId}/notes/${note.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ x: note.x, y: note.y }),
        });
      }
      setDraggingNote(null);
    } else {
      setDraggingNote(null);
    }
  }, [draggingNote, notes, projectId]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom((z) => Math.max(0.25, Math.min(3, z * delta)));
  }, []);

  /* ── Note handlers ── */
  function noteMouseDown(noteId: string, e: React.MouseEvent) {
    e.stopPropagation();
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    dragOffset.current = { x: e.clientX - rect.left - (e.target as HTMLElement).offsetLeft, y: e.clientY - rect.top - (e.target as HTMLElement).offsetTop };
    setDraggingNote(noteId);
  }

  function startEdit(note: NoteItem) {
    setEditingNote(note.id);
    setEditText(note.content);
  }

  function saveEdit() {
    if (editingNote) {
      const newContent = editText;
      setNotes((prev) =>
        prev.map((n) => (n.id === editingNote ? { ...n, content: newContent } : n))
      );
      if (!editingNote.startsWith("temp_")) {
        fetch(`/api/projects/${projectId}/notes/${editingNote}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: newContent }),
        });
      }
      setEditingNote(null);
      setEditText("");
    }
  }

  async function addNote() {
    const hue = Math.floor(Math.random() * NOTE_COLORS.length);
    const tempId = `temp_${Date.now()}`;
    const newNote: NoteItem = {
      id: tempId,
      x: 150 + Math.random() * 300,
      y: 150 + Math.random() * 300,
      content: "New note",
      color: NOTE_COLORS[hue],
      author_name: currentUser?.name || "You",
    };
    setNotes((prev) => [...prev, newNote]);

    try {
      const res = await fetch(`/api/projects/${projectId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newNote.content, x: newNote.x, y: newNote.y, color: newNote.color }),
      });
      const data = await res.json();
      if (data.note) {
        setNotes((prev) =>
          prev.map((n) => (n.id === tempId ? { ...n, id: data.note.id } : n))
        );
      }
    } catch {
      /* keep temp note visible even if API fails */
    }
  }

  function deleteNote(id: string) {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    if (editingNote === id) {
      setEditingNote(null);
      setEditText("");
    }
    if (!id.startsWith("temp_")) {
      fetch(`/api/projects/${projectId}/notes/${id}`, { method: "DELETE" });
    }
  }

  function changeColor(noteId: string) {
    const current = notes.find((n) => n.id === noteId);
    if (!current) return;
    const idx = NOTE_COLORS.indexOf(current.color);
    const next = (idx + 1) % NOTE_COLORS.length;
    const newColor = NOTE_COLORS[next];
    setNotes((prev) => prev.map((n) => (n.id === noteId ? { ...n, color: newColor } : n)));
    if (!noteId.startsWith("temp_")) {
      fetch(`/api/projects/${projectId}/notes/${noteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ color: newColor }),
      });
    }
  }

  async function sendMessage() {
    if (!chatInput.trim()) return;
    const text = chatInput.trim();
    setChatInput("");
    const tempId = `temp_msg_${Date.now()}`;
    const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setMessages((prev) => [...prev, { id: tempId, author_name: currentUser?.name || "You", text, time: now }]);

    try {
      const res = await fetch(`/api/projects/${projectId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (data.message) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempId
              ? {
                  id: data.message.id,
                  author_name: data.message.author_name || currentUser?.name || "You",
                  text: data.message.text || text,
                  time: data.message.time
                    ? new Date(data.message.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                    : now,
                }
              : m
          )
        );
      }
    } catch {
      /* keep temp message visible */
    }
  }

  const tasksByAssignee = tasks.reduce<Record<string, TaskItem[]>>((acc, t) => {
    const key = t.assignee || "Unassigned";
    if (!acc[key]) acc[key] = [];
    acc[key].push(t);
    return acc;
  }, {});

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen bg-[var(--ws-bg)] text-gray-4 text-[12px]">Loading…</div>;
  }

  return (
    <div className="h-screen w-screen overflow-hidden bg-[var(--ws-bg)] flex">
      {/* ════════ CANVAS (full background) ════════ */}
      <div
        ref={canvasRef}
        className={`flex-1 relative overflow-hidden select-none ${isPanning ? "cursor-grabbing" : "cursor-grab"}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        {/* Grid background */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle, rgba(15,118,110,0.14) 1px, transparent 1px)`,
            backgroundSize: `${20 * zoom}px ${20 * zoom}px`,
            transform: `translate(${pan.x}px, ${pan.y}px)`,
          }}
        />

        {/* Canvas transform layer */}
        <div
          className="absolute inset-0"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: "0 0",
          }}
        >
          {/* Sticky notes */}
          {notes.map((note) => (
            <div
              key={note.id}
              data-note
              className="absolute rounded-xl shadow-2xl flex flex-col"
              style={{
                left: note.x,
                top: note.y,
                width: 220,
                backgroundColor: note.color,
                color: "#1a1a1a",
                zIndex: draggingNote === note.id ? 100 : 10,
                cursor: draggingNote === note.id ? "grabbing" : "default",
              }}
              onMouseDown={(e) => noteMouseDown(note.id, e)}
            >
              {/* Header bar */}
              <div className="flex items-center justify-between px-3 py-1.5 opacity-60 hover:opacity-100 transition-opacity">
                <GripHorizontal size={12} className="cursor-grab active:cursor-grabbing" />
                <div className="flex items-center gap-1">
                  <button onClick={(e) => { e.stopPropagation(); changeColor(note.id); }} className="w-4 h-4 flex items-center justify-center rounded hover:bg-black/10"><Palette size={10} /></button>
                  <button onClick={(e) => { e.stopPropagation(); deleteNote(note.id); }} className="w-4 h-4 flex items-center justify-center rounded hover:bg-black/10"><Trash2 size={10} /></button>
                </div>
              </div>

              {/* Content */}
              {editingNote === note.id ? (
                <textarea
                  className="flex-1 bg-transparent border-none outline-none resize-none text-[12px] leading-relaxed px-3 pb-3 font-sans"
                  style={{ color: "#1a1a1a", minHeight: 80 }}
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  onBlur={saveEdit}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); saveEdit(); } }}
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <div
                  className="flex-1 text-[12px] leading-relaxed px-3 pb-3 whitespace-pre-wrap cursor-text"
                  style={{ color: "#1a1a1a", minHeight: 60 }}
                  onDoubleClick={() => startEdit(note)}
                >
                  {note.content}
                </div>
              )}

              {/* Author */}
              <div className="px-3 pb-2 text-[9px] font-mono opacity-50 flex items-center gap-1.5" style={{ color: "#1a1a1a" }}>
                <span className="w-3.5 h-3.5 rounded-full bg-black/10 flex items-center justify-center text-[7px] font-bold">{initials(note.author_name)}</span>
                {note.author_name}
              </div>
            </div>
          ))}
        </div>

        {/* ── Top bar overlay ── */}
        <div className="fixed top-0 left-0 right-0 z-40 flex items-center px-4 py-3 pointer-events-none">
          <div className="flex items-center gap-3 pointer-events-auto">
            <button onClick={() => router.push(`/app/projects/${projectId}`)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-[var(--ws-surface)]/90 backdrop-blur-sm border border-[var(--ws-border)] text-gray-4 hover:text-[var(--ws-accent)] hover:border-[var(--ws-accent)]/40 transition-all">
              <ArrowLeft size={16} />
            </button>
            <div className="flex items-center gap-2 bg-[var(--ws-surface)]/90 backdrop-blur-sm border border-[var(--ws-border)] rounded-lg px-3.5 py-1.5">
              <span className="text-[13px] font-semibold text-[var(--ws-text)]">{project?.name || "Workspace"}</span>
              {currentUser?.role === "crm_staff" && (
                <span className="text-[8px] font-mono px-1.5 py-0.5 rounded-full border border-[var(--ws-accent)]/30 text-[var(--ws-accent)] bg-[var(--ws-accent)]/10">My Workspace</span>
              )}
              <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded-full border capitalize ${project?.status === "active" ? "text-green border-green/30 bg-green/10" : "text-gray-4 border-[var(--ws-border)]"}`}>{project?.status || "draft"}</span>
            </div>
          </div>
        </div>

        {/* ── Bottom text buttons ── */}
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 bg-[var(--ws-surface)]/90 backdrop-blur-sm border border-[var(--ws-border)] rounded-xl px-3 py-2 pointer-events-auto shadow-[0_4px_16px_rgba(10,20,40,0.08)]">
          <button onClick={addNote} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-[var(--ws-bg)] text-gray-4 hover:text-[var(--ws-accent)] transition-all text-[11px] font-medium">
            <StickyNote size={13} /> Add Note
          </button>
          <div className="w-px h-4 bg-[var(--ws-border)]" />
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-[var(--ws-bg)] text-gray-4 hover:text-[var(--ws-accent)] transition-all text-[11px] font-medium">
            <Type size={13} /> Text
          </button>
          <div className="w-px h-4 bg-[var(--ws-border)]" />
          <span className="text-[10px] font-mono text-gray-4 px-2">{Math.round(zoom * 100)}%</span>
        </div>

        {/* ── Floating + button ── */}
        <button
          onClick={addNote}
          className="fixed bottom-24 right-6 z-40 w-12 h-12 rounded-full bg-[var(--ws-accent)] text-white flex items-center justify-center hover:bg-[var(--ws-accent-hover)] transition-all shadow-lg shadow-[var(--ws-accent)]/25 pointer-events-auto"
        >
          <Plus size={20} />
        </button>
      </div>

      {/* ════════ RIGHT PANEL ════════ */}
      <div
        data-panel
        className={`h-screen bg-[var(--ws-surface)] border-l border-[var(--ws-border)] flex flex-col transition-all duration-200 z-30 ${panelOpen ? "w-[340px]" : "w-0 overflow-hidden"}`}
      >
        {/* Panel header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--ws-border)]">
          <h3 className="text-[12px] font-semibold text-[var(--ws-text)]">Workspace</h3>
          <button onClick={() => setPanelOpen(false)} className="w-6 h-6 flex items-center justify-center rounded hover:bg-[var(--ws-bg)] text-gray-5"><X size={14} /></button>
        </div>

        {/* Panel tabs */}
        <div className="flex border-b border-[var(--ws-border)]">
          {[
            { key: "team" as RightTab, label: "Team", icon: Users },
            { key: "tasks" as RightTab, label: "Tasks", icon: CheckSquare },
            { key: "chat" as RightTab, label: "Chat", icon: MessageSquare },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setRightTab(tab.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 text-[11px] py-2.5 border-b-2 transition-colors ${
                rightTab === tab.key ? "text-[var(--ws-accent)] border-[var(--ws-accent)]" : "text-gray-5 border-transparent hover:text-[var(--ws-text)]"
              }`}
            >
              <tab.icon size={12} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Panel content */}
        <div className="flex-1 overflow-y-auto">
          {/* ══ TEAM ══ */}
          {rightTab === "team" && (
            <div className="p-4 space-y-3">
              <p className="text-[10px] font-mono text-gray-4 uppercase tracking-wider mb-3">Project Team</p>
              {team.map((m) => (
                <div key={m.id} className="flex items-center gap-3 bg-[var(--ws-bg)] rounded-lg px-3.5 py-3 border border-[var(--ws-border)]">
                  <div className="w-8 h-8 rounded-full bg-[var(--ws-accent)]/10 flex items-center justify-center text-[10px] font-bold text-[var(--ws-accent)]">
                    {m.initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-medium text-[var(--ws-text)] truncate">{m.name}</div>
                    <div className="text-[10px] text-gray-4 font-mono">{m.role}</div>
                  </div>
                  <div className="w-2 h-2 rounded-full bg-green" />
                </div>
              ))}
              {team.length === 0 && <p className="text-[12px] text-gray-4">No team members yet.</p>}
            </div>
          )}

          {/* ══ TASKS ══ */}
          {rightTab === "tasks" && (
            <div className="p-4 space-y-4">
              {Object.keys(tasksByAssignee).length === 0 && (
                <p className="text-[12px] text-gray-4 text-center py-8">{currentUser?.role === "crm_staff" ? "You have no assigned tasks yet." : "No tasks yet. Drop a sticky note on the board!"}</p>
              )}
              {Object.entries(tasksByAssignee).map(([assignee, ts]) => (
                <div key={assignee}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-5 h-5 rounded-full bg-[var(--ws-accent)]/10 flex items-center justify-center text-[7px] font-bold text-[var(--ws-accent)]">{initials(assignee)}</div>
                    <span className="text-[11px] font-semibold text-[var(--ws-text)]">{assignee}</span>
                    <span className="text-[9px] font-mono text-gray-4 ml-auto">{ts.length}</span>
                  </div>
                  <div className="space-y-1">
                    {ts.map((t) => (
                      <div key={t.id} className="flex items-center gap-2 px-3 py-2 bg-[var(--ws-bg)] rounded-lg border border-[var(--ws-border)]">
                        <div className={`w-3 h-3 rounded border flex items-center justify-center flex-shrink-0 ${t.done ? "bg-[var(--ws-accent)] border-[var(--ws-accent)]" : "border-gray-5"}`}>
                          {t.done && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                        <span className={`text-[11px] flex-1 ${t.done ? "text-gray-4 line-through" : "text-[var(--ws-text)]"}`}>{t.name}</span>
                        {t.due_date && <span className="text-[8px] font-mono text-gray-4">{new Date(t.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ══ CHAT ══ */}
          {rightTab === "chat" && (
            <div className="flex flex-col h-full">
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((msg) => (
                  <div key={msg.id} className="flex items-start gap-2.5">
                    <div className="w-6 h-6 rounded-full bg-[var(--ws-accent)]/10 flex items-center justify-center text-[8px] font-bold text-[var(--ws-accent)] flex-shrink-0 mt-0.5">
                      {initials(msg.author_name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-semibold text-[var(--ws-text)]">{msg.author_name}</span>
                        <span className="text-[8px] font-mono text-gray-4">{msg.time}</span>
                      </div>
                      <p className="text-[11px] text-gray-4 leading-relaxed mt-0.5">{msg.text}</p>
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
              <div className="p-3 border-t border-[var(--ws-border)] flex items-center gap-2">
                <input
                  className="flex-1 bg-[var(--ws-surface)] border border-[var(--ws-border)] rounded-lg px-3 py-2 text-[11px] text-[var(--ws-text)] placeholder:text-gray-4 outline-none focus:border-[var(--ws-accent)] transition-colors"
                  placeholder="Type a message…"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                />
                <button onClick={sendMessage} disabled={!chatInput.trim()} className="w-7 h-7 flex items-center justify-center rounded-lg bg-[var(--ws-accent)] text-white hover:bg-[var(--ws-accent-hover)] disabled:opacity-30 transition-all flex-shrink-0">
                  <Send size={12} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Panel toggle button (when closed) */}
      {!panelOpen && (
        <button
          onClick={() => setPanelOpen(true)}
          className="fixed top-3 right-3 z-40 w-8 h-8 flex items-center justify-center rounded-lg bg-[var(--ws-surface)]/90 backdrop-blur-sm border border-[var(--ws-border)] text-gray-4 hover:text-[var(--ws-accent)] hover:border-[var(--ws-accent)]/40 transition-all"
        >
          <PanelRightOpen size={16} />
        </button>
      )}
    </div>
  );
}
