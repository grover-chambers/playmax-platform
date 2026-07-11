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
interface TaskItem {
  id: string;
  name: string;
  assignee: string;
  assigneeInitials: string;
  done: boolean;
  due_date: string;
}

interface ChatMessage {
  id: string;
  author: string;
  text: string;
  time: string;
}

interface ProjectData {
  id: string;
  name: string;
  client: string;
  status: string;
}

interface StickyNote {
  id: string;
  x: number;
  y: number;
  content: string;
  color: string;
  author: string;
}

interface TeamMember {
  name: string;
  initials: string;
  role: string;
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
const MOCK_TEAM: TeamMember[] = [
  { name: "Brian Mwangi", initials: "BM", role: "Project Lead" },
  { name: "Alice Wanjiku", initials: "AW", role: "Designer" },
  { name: "James Kamau", initials: "JK", role: "Researcher" },
];

const MOCK_MESSAGES: ChatMessage[] = [
  { id: "1", author: "Brian Mwangi", text: "Client approved the creative direction.", time: "09:42" },
  { id: "2", author: "Alice Wanjiku", text: "Updating the moodboard with new references.", time: "10:15" },
  { id: "3", author: "James Kamau", text: "Competitor analysis doc is ready in Docs.", time: "11:00" },
];

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
  const [team, setTeam] = useState<TeamMember[]>(MOCK_TEAM);
  const [messages, setMessages] = useState<ChatMessage[]>(MOCK_MESSAGES);
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
  const [notes, setNotes] = useState<StickyNote[]>([
    { id: "n1", x: 200, y: 200, content: "Campaign concept: Taste the Difference", color: NOTE_COLORS[0], author: "Brian" },
    { id: "n2", x: 500, y: 150, content: "Budget cap: KES 1.2M", color: NOTE_COLORS[1], author: "Alice" },
    { id: "n3", x: 350, y: 450, content: "Review site selection report by Friday", color: NOTE_COLORS[2], author: "James" },
  ]);
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [draggingNote, setDraggingNote] = useState<string | null>(null);
  const dragOffset = useRef({ x: 0, y: 0 });

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

        const { data: proj } = await supabase
          .from("projects").select("*").eq("id", projectId).single();
        if (proj) {
          setProject({ id: proj.id, name: proj.name, client: proj.client || "—", status: proj.status || "draft" });
          let { data: dbTasks } = await supabase
            .from("tasks").select("*")
            .or(`project_id.eq.${projectId},project.eq.${proj.name?.replace(/'/g, "") || ""}`)
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
          if (userId && userRole === "crm_staff") {
            setTeam([{ name: userName || "You", initials: initials(userName || "You"), role: "CRM Staff" }]);
          }
        } else {
          setProject({ id: projectId, name: "New Project", client: "—", status: "draft" });
        }
      } catch {
        setProject({ id: projectId, name: "New Project", client: "—", status: "draft" });
      } finally {
        setLoading(false);
      }
    })();
  }, [projectId]);

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
    setDraggingNote(null);
  }, []);

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

  function startEdit(note: StickyNote) {
    setEditingNote(note.id);
    setEditText(note.content);
  }

  function saveEdit() {
    if (editingNote) {
      setNotes((prev) =>
        prev.map((n) => (n.id === editingNote ? { ...n, content: editText } : n))
      );
      setEditingNote(null);
      setEditText("");
    }
  }

  function addNote() {
    const hue = Math.floor(Math.random() * NOTE_COLORS.length);
    setNotes((prev) => [
      ...prev,
      {
        id: `n${Date.now()}`,
        x: 150 + Math.random() * 300,
        y: 150 + Math.random() * 300,
        content: "New note",
        color: NOTE_COLORS[hue],
        author: "You",
      },
    ]);
  }

  function deleteNote(id: string) {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    if (editingNote === id) {
      setEditingNote(null);
      setEditText("");
    }
  }

  function changeColor(noteId: string) {
    const current = notes.find((n) => n.id === noteId);
    if (!current) return;
    const idx = NOTE_COLORS.indexOf(current.color);
    const next = (idx + 1) % NOTE_COLORS.length;
    setNotes((prev) => prev.map((n) => (n.id === noteId ? { ...n, color: NOTE_COLORS[next] } : n)));
  }

  function sendMessage() {
    if (!chatInput.trim()) return;
    setMessages((prev) => [...prev, { id: String(Date.now()), author: "You", text: chatInput.trim(), time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }]);
    setChatInput("");
  }

  const tasksByAssignee = tasks.reduce<Record<string, TaskItem[]>>((acc, t) => {
    const key = t.assignee || "Unassigned";
    if (!acc[key]) acc[key] = [];
    acc[key].push(t);
    return acc;
  }, {});

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen bg-[#0A0A0A] text-gray-5 text-[12px]">Loading…</div>;
  }

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#0A0A0A] flex">
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
            backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px)`,
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
                <span className="w-3.5 h-3.5 rounded-full bg-black/10 flex items-center justify-center text-[7px] font-bold">{initials(note.author)}</span>
                {note.author}
              </div>
            </div>
          ))}
        </div>

        {/* ── Top bar overlay ── */}
        <div className="fixed top-0 left-0 right-0 z-40 flex items-center px-4 py-3 pointer-events-none">
          <div className="flex items-center gap-3 pointer-events-auto">
            <button onClick={() => router.push("/app/projects")} className="w-8 h-8 flex items-center justify-center rounded-lg bg-black/60 backdrop-blur-sm border border-white/10 text-gray-4 hover:text-white hover:border-yellow/40 transition-all">
              <ArrowLeft size={16} />
            </button>
            <div className="flex items-center gap-2 bg-black/60 backdrop-blur-sm border border-white/10 rounded-lg px-3.5 py-1.5">
              <span className="text-[13px] font-semibold text-white">{project?.name || "Workspace"}</span>
              {currentUser?.role === "crm_staff" && (
                <span className="text-[8px] font-mono px-1.5 py-0.5 rounded-full border border-yellow/30 text-yellow bg-yellow/10">My Workspace</span>
              )}
              <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded-full border capitalize ${project?.status === "active" ? "text-green border-green/30 bg-green/10" : "text-gray-5 border-gray-5/30"}`}>{project?.status || "draft"}</span>
            </div>
          </div>
        </div>

        {/* ── Bottom text buttons ── */}
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 bg-black/60 backdrop-blur-sm border border-white/10 rounded-xl px-3 py-2 pointer-events-auto">
          <button onClick={addNote} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-white/10 text-gray-3 hover:text-white transition-all text-[11px] font-medium">
            <StickyNote size={13} /> Add Note
          </button>
          <div className="w-px h-4 bg-white/10" />
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-white/10 text-gray-3 hover:text-white transition-all text-[11px] font-medium">
            <Type size={13} /> Text
          </button>
          <div className="w-px h-4 bg-white/10" />
          <span className="text-[10px] font-mono text-gray-6 px-2">{Math.round(zoom * 100)}%</span>
        </div>

        {/* ── Floating + button ── */}
        <button
          onClick={addNote}
          className="fixed bottom-24 right-6 z-40 w-12 h-12 rounded-full bg-yellow text-black flex items-center justify-center hover:bg-yellow/90 transition-all shadow-lg shadow-yellow/20 pointer-events-auto"
        >
          <Plus size={20} />
        </button>
      </div>

      {/* ════════ RIGHT PANEL ════════ */}
      <div
        data-panel
        className={`h-screen bg-[#0D0D0D] border-l border-[#1E1E1E] flex flex-col transition-all duration-200 z-30 ${panelOpen ? "w-[340px]" : "w-0 overflow-hidden"}`}
      >
        {/* Panel header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#1E1E1E]">
          <h3 className="text-[12px] font-semibold text-white">Workspace</h3>
          <button onClick={() => setPanelOpen(false)} className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/5 text-gray-5"><X size={14} /></button>
        </div>

        {/* Panel tabs */}
        <div className="flex border-b border-[#1E1E1E]">
          {[
            { key: "team" as RightTab, label: "Team", icon: Users },
            { key: "tasks" as RightTab, label: "Tasks", icon: CheckSquare },
            { key: "chat" as RightTab, label: "Chat", icon: MessageSquare },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setRightTab(tab.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 text-[11px] py-2.5 border-b-2 transition-colors ${
                rightTab === tab.key ? "text-yellow border-yellow" : "text-gray-5 border-transparent hover:text-white"
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
              <p className="text-[10px] font-mono text-gray-5 uppercase tracking-wider mb-3">Project Team</p>
              {team.map((m) => (
                <div key={m.initials} className="flex items-center gap-3 bg-[#0A0A0A] rounded-lg px-3.5 py-3 border border-[#1E1E1E]">
                  <div className="w-8 h-8 rounded-full bg-yellow/10 flex items-center justify-center text-[10px] font-bold text-yellow">
                    {m.initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-medium text-white truncate">{m.name}</div>
                    <div className="text-[10px] text-gray-5 font-mono">{m.role}</div>
                  </div>
                  <div className="w-2 h-2 rounded-full bg-green" />
                </div>
              ))}
              {team.length === 0 && <p className="text-[12px] text-gray-5">No team members yet.</p>}
            </div>
          )}

          {/* ══ TASKS ══ */}
          {rightTab === "tasks" && (
            <div className="p-4 space-y-4">
              {Object.keys(tasksByAssignee).length === 0 && (
                <p className="text-[12px] text-gray-5 text-center py-8">{currentUser?.role === "crm_staff" ? "You have no assigned tasks yet." : "No tasks yet. Drop a sticky note on the board!"}</p>
              )}
              {Object.entries(tasksByAssignee).map(([assignee, ts]) => (
                <div key={assignee}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-5 h-5 rounded-full bg-yellow/10 flex items-center justify-center text-[7px] font-bold text-yellow">{initials(assignee)}</div>
                    <span className="text-[11px] font-semibold text-white">{assignee}</span>
                    <span className="text-[9px] font-mono text-gray-6 ml-auto">{ts.length}</span>
                  </div>
                  <div className="space-y-1">
                    {ts.map((t) => (
                      <div key={t.id} className="flex items-center gap-2 px-3 py-2 bg-[#0A0A0A] rounded-lg border border-[#1E1E1E]">
                        <div className={`w-3 h-3 rounded border flex items-center justify-center flex-shrink-0 ${t.done ? "bg-yellow border-yellow" : "border-gray-5"}`}>
                          {t.done && <div className="w-1.5 h-1.5 rounded-full bg-black" />}
                        </div>
                        <span className={`text-[11px] flex-1 ${t.done ? "text-gray-6 line-through" : "text-gray-3"}`}>{t.name}</span>
                        {t.due_date && <span className="text-[8px] font-mono text-gray-6">{new Date(t.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>}
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
                    <div className="w-6 h-6 rounded-full bg-yellow/10 flex items-center justify-center text-[8px] font-bold text-yellow flex-shrink-0 mt-0.5">
                      {initials(msg.author)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-semibold text-white">{msg.author}</span>
                        <span className="text-[8px] font-mono text-gray-6">{msg.time}</span>
                      </div>
                      <p className="text-[11px] text-gray-4 leading-relaxed mt-0.5">{msg.text}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-3 border-t border-[#1E1E1E] flex items-center gap-2">
                <input
                  className="flex-1 bg-[#0A0A0A] border border-[#252525] rounded-lg px-3 py-2 text-[11px] text-white placeholder:text-gray-6 outline-none focus:border-yellow/40 transition-colors"
                  placeholder="Type a message…"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                />
                <button onClick={sendMessage} disabled={!chatInput.trim()} className="w-7 h-7 flex items-center justify-center rounded-lg bg-yellow text-black hover:bg-yellow/90 disabled:opacity-30 transition-all flex-shrink-0">
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
          className="fixed top-3 right-3 z-40 w-8 h-8 flex items-center justify-center rounded-lg bg-black/60 backdrop-blur-sm border border-white/10 text-gray-4 hover:text-white hover:border-yellow/40 transition-all"
        >
          <PanelRightOpen size={16} />
        </button>
      )}
    </div>
  );
}
