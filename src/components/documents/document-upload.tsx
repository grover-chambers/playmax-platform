"use client";

import React, { useRef, useState } from "react";
import { Upload } from "lucide-react";
import Button from "@/components/ui/button";
import { uploadToCloudinary } from "@/lib/cloudinary";

interface DocumentUploadProps {
  projectId: string;
  clientId?: string;
  onUploaded: () => void;
}

export default function DocumentUpload({ projectId, clientId, onUploaded }: DocumentUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [visible, setVisible] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);

    const result = await uploadToCloudinary(file);
    if (!result) {
      setUploading(false);
      return;
    }

    const ext = file.name.split(".").pop()?.toLowerCase() || "other";
    const docType = ["pdf", "docx", "xlsx", "jpg", "jpeg", "png", "gif"].includes(ext) ? ext : "other";

    await fetch("/api/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        project_id: projectId,
        client_id: clientId || null,
        name: file.name,
        type: docType,
        url: result.url,
        cloudinary_public_id: result.public_id,
        size: file.size,
        visible_to_client: visible,
      }),
    });

    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
    onUploaded();
  }

  return (
    <div className="flex items-center gap-2">
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx,.xlsx,.jpg,.png,.gif"
        className="hidden"
        onChange={handleFile}
      />
      <label className="flex items-center gap-1.5 text-[11px] text-gray-4 cursor-pointer">
        <input
          type="checkbox"
          checked={visible}
          onChange={(e) => setVisible(e.target.checked)}
          className="accent-yellow"
        />
        Visible to client
      </label>
      <Button
        variant="secondary"
        size="sm"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? (
          <span className="animate-pulse">Uploading…</span>
        ) : (
          <>
            <Upload size={12} className="mr-1" /> Upload
          </>
        )}
      </Button>
    </div>
  );
}
