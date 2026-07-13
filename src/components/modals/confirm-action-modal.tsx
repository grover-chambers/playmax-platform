"use client";

import { useState } from "react";
import Modal from "@/components/ui/modal";
import Button from "@/components/ui/button";

interface ConfirmActionModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm?: () => void;
}

export default function ConfirmActionModal({
  open,
  onClose,
  title,
  message,
  confirmLabel = "Confirm",
  onConfirm,
}: ConfirmActionModalProps) {
  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 600));
    setLoading(false);
    onConfirm?.();
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <p className="text-[13px] text-gray-4 leading-relaxed">{message}</p>

      <div className="flex gap-3 mt-6">
        <Button variant="primary" onClick={handleConfirm} disabled={loading}>
          {loading ? "Processing..." : confirmLabel}
        </Button>
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </Modal>
  );
}
