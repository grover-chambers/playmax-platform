"use client";

import React, { useState } from "react";

interface KanbanColumnProps {
  title: string;
  count: number;
  children: React.ReactNode;
  className?: string;
  onDrop?: (projectId: string, newStage: string) => void;
}

function KanbanColumn({
  title,
  count,
  children,
  className = "",
  onDrop,
}: KanbanColumnProps) {
  const [dragOver, setDragOver] = useState(false);

  return (
    <div
      className={`kanban-col ${className} ${dragOver ? "kanban-col-dragover" : ""}`}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const projectId = e.dataTransfer.getData("text/plain");
        if (projectId && onDrop) onDrop(projectId, title);
      }}
    >
      <div className="kanban-head">
        <div className="flex items-center gap-2">
          <span className="kanban-stage">{title}</span>
          <span className="kanban-count">{count}</span>
        </div>
      </div>
      <div className="kanban-body max-h-[calc(100vh-220px)] overflow-y-auto">
        {children}
      </div>
    </div>
  );
}

export default KanbanColumn;
