"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Lock, Check, AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/browser";
import PasswordInput from "@/components/ui/password-input";

export default function ChangePasswordPage() {
  const router = useRouter();
  const supabase = createClient();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/portal/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword: password }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Failed to update password");
        return;
      }
      router.push("/portal");
    } catch {
      setError("Failed to update password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <span className="text-2xl font-bold tracking-tight text-white">
            MARKET<span className="text-[#C9A04A]"> LINK</span>
          </span>
          <p className="text-[12px] text-gray-5 mt-2">Client Portal</p>
        </div>

        <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-[#C9A04A]/15 text-[#C9A04A]">
              <Lock size={16} />
            </span>
            <div>
              <h1 className="text-[16px] font-semibold text-white">Set your password</h1>
              <p className="text-[11px] text-gray-5">
                You&apos;re using a temporary password. Create your own before continuing.
              </p>
            </div>
          </div>

          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2.5 text-[12px] text-red">
              <AlertTriangle size={13} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] text-gray-5 uppercase font-mono tracking-wider mb-1.5">
                New password
              </label>
              <PasswordInput
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                placeholder="At least 8 characters"
                className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2.5 text-[13px] text-white placeholder:text-gray-5 focus:outline-none focus:border-[#C9A04A]"
              />
            </div>
            <div>
              <label className="block text-[10px] text-gray-5 uppercase font-mono tracking-wider mb-1.5">
                Confirm password
              </label>
              <PasswordInput
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                minLength={8}
                placeholder="Repeat your new password"
                className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2.5 text-[13px] text-white placeholder:text-gray-5 focus:outline-none focus:border-[#C9A04A]"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-[#C9A04A] text-[#0D0D0D] text-[13px] font-semibold py-2.5 mt-2 hover:opacity-90 transition-opacity disabled:opacity-60"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              {loading ? "Saving…" : "Set Password"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={handleSignOut}
              className="text-[11px] text-gray-5 hover:text-white transition-colors"
            >
              Sign out instead
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
