"use client";

import React, { useEffect, useState, startTransition } from "react";
import { Download, Eye, EyeOff, Trash2, FileText, FileSpreadsheet, FileImage } from "lucide-react";
import { formatTimeAgo } from "@/lib/utils";

interface Document {
  id: string;
  name: string;
  type: string;
  url: string;
  size: number;
  visible_to_client: boolean;
  created_at: string;
  uploaded_by?: string;
}

interface DocumentListProps {
  projectId?: string;
  clientId?: string;
  canManage?: boolean;
}

const typeIcons: Record<string, React.ElementType> = {
  pdf: FileText,
  docx: FileText,
  xlsx: FileSpreadsheet,
  image: FileImage,
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DocumentList({ projectId, clientId, canManage = false }: DocumentListProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams();
    if (projectId) params.set("project_id", projectId);
    if (clientId) params.set("client_id", clientId);
    fetch(`/api/documents?${params}`)
      .then(r => r.json())
      .then(({ data }) => startTransition(() => setDocuments(data || [])))
      .catch(() => startTransition(() => {}))
      .finally(() => startTransition(() => setLoading(false)));
  }, [projectId, clientId]);

  async function toggleVisibility(doc: Document) {
    await fetch(`/api/documents/${doc.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visible_to_client: !doc.visible_to_client }),
    });
    refetch();
  }

  async function deleteDoc(doc: Document) {
    if (!confirm(`Delete "${doc.name}"?`)) return;
    await fetch(`/api/documents/${doc.id}`, { method: "DELETE" });
    refetch();
  }

  function refetch() {
    const params = new URLSearchParams();
    if (projectId) params.set("project_id", projectId);
    if (clientId) params.set("client_id", clientId);
    fetch(`/api/documents?${params}`)
      .then(r => r.json())
      .then(({ data }) => startTransition(() => setDocuments(data || [])));
  }

  if (loading) return <div className="text-[12px] text-gray-5 py-4">Loading documents…</div>;

  if (documents.length === 0) {
    return <div className="text-[12px] text-gray-5 py-4">No documents yet.</div>;
  }

  return (
    <div className="space-y-1">
      {documents.map((doc) => {
        const Icon = typeIcons[doc.type] || FileText;
        return (
          <div
            key={doc.id}
            className="flex items-center gap-3 bg-[#0D0D0D] border border-[#1E1E1E] rounded-md px-3 py-2.5 hover:border-[#333] transition-colors group"
          >
            <Icon size={16} className="text-yellow shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-[12px] font-semibold text-white truncate">{doc.name}</div>
              <div className="text-[10px] text-gray-5">
                {formatSize(doc.size)} · {formatTimeAgo(doc.created_at)}
              </div>
            </div>
            <a
              href={doc.url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 text-gray-5 hover:text-white transition-colors"
              title="Download"
            >
              <Download size={14} />
            </a>
            {canManage && (
              <>
                <button
                  onClick={() => toggleVisibility(doc)}
                  className={`p-1.5 transition-colors ${doc.visible_to_client ? "text-green hover:text-white" : "text-gray-5 hover:text-white"}`}
                  title={doc.visible_to_client ? "Visible to client" : "Hidden from client"}
                >
                  {doc.visible_to_client ? <Eye size={14} /> : <EyeOff size={14} />}
                </button>
                <button
                  onClick={() => deleteDoc(doc)}
                  className="p-1.5 text-gray-5 hover:text-red transition-colors"
                  title="Delete"
                >
                  <Trash2 size={14} />
                </button>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
