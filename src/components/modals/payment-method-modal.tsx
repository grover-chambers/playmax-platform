"use client";

import { useState } from "react";
import Modal from "@/components/ui/modal";
import Button from "@/components/ui/button";

interface PaymentMethodModalProps {
  open: boolean;
  onClose: () => void;
  mode: "update" | "change" | "add";
}

export default function PaymentMethodModal({ open, onClose, mode }: PaymentMethodModalProps) {
  const [cardNumber, setCardNumber] = useState(mode === "update" ? "4242" : "");
  const [expiry, setExpiry] = useState(mode === "update" ? "12/27" : "");
  const [cvc, setCvc] = useState("");
  const [saving, setSaving] = useState(false);

  const title =
    mode === "update" ? "Update Card" : mode === "change" ? "Change Payment Method" : "Add Payment Method";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await new Promise((r) => setTimeout(r, 800));
    setSaving(false);
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === "change" && (
          <div className="flex gap-2 mb-2">
            {["Visa", "Mastercard", "M-Pesa"].map((method) => (
              <button
                key={method}
                type="button"
                className="flex-1 px-3 py-3 rounded-lg border border-[#252525] bg-black text-[11px] text-white font-medium hover:border-yellow/30 transition-colors"
              >
                {method}
              </button>
            ))}
          </div>
        )}

        <div>
          <label className="block text-[11px] font-mono text-gray-5 uppercase tracking-wider mb-1.5">
            Card Number
          </label>
          <input
            className="w-full bg-black border border-[#252525] rounded-lg px-3 py-2 text-[13px] text-white placeholder:text-gray-5 outline-none focus:border-yellow/40"
            placeholder="0000 0000 0000 0000"
            value={cardNumber}
            onChange={(e) => setCardNumber(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-mono text-gray-5 uppercase tracking-wider mb-1.5">
              Expiry
            </label>
            <input
              className="w-full bg-black border border-[#252525] rounded-lg px-3 py-2 text-[13px] text-white placeholder:text-gray-5 outline-none focus:border-yellow/40"
              placeholder="MM/YY"
              value={expiry}
              onChange={(e) => setExpiry(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-[11px] font-mono text-gray-5 uppercase tracking-wider mb-1.5">
              CVC
            </label>
            <input
              className="w-full bg-black border border-[#252525] rounded-lg px-3 py-2 text-[13px] text-white placeholder:text-gray-5 outline-none focus:border-yellow/40"
              placeholder="123"
              value={cvc}
              onChange={(e) => setCvc(e.target.value)}
            />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button variant="primary" type="submit" disabled={saving}>
            {saving ? "Saving..." : mode === "add" ? "Add Card" : "Save"}
          </Button>
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  );
}
