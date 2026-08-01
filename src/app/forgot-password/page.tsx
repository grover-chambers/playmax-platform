"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { createClient } = await import("@/lib/supabase/browser");
    const supabase = createClient();

    const { error: resetErr } = await supabase.auth.resetPasswordForEmail(
      email,
      {
        redirectTo: `${location.origin}/auth/callback?next=/login?reset=true`,
      },
    );

    setLoading(false);

    if (resetErr) {
      setError(resetErr.message);
      return;
    }

    setSent(true);
  };

  return (
    <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center px-4">
      <div className="card bg-black-2! p-8 w-full max-w-100 mx-auto">
        <div className="text-center mb-8">
          <h1 className="site-logo">
            PLAY<span className="site-logo-accent">MAX</span>
          </h1>
          <p className="body-copy-sm mt-2">Reset your password</p>
        </div>

        {sent ? (
          <div className="text-center">
            <div className="w-12 h-12 rounded-full bg-green/10 flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-6 h-6 text-green"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <p className="text-[14px] text-gray-3 mb-2">Reset link sent</p>
            <p className="text-[12px] text-gray-5 mb-6 leading-relaxed">
              If an account with that email exists, we&apos;ve sent a password
              reset link. Check your inbox (and spam folder).
            </p>
            <Link
              href="/login"
              className="text-yellow text-[13px] hover:underline font-body"
            >
              Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-[13px] text-gray-4 mb-4 leading-relaxed">
              Enter your email address and we&apos;ll send you a link to reset
              your password.
            </p>

            {error && (
              <div className="bg-red/10 border border-red/20 text-red text-[12px] px-4 py-2.5 rounded">
                {error}
              </div>
            )}

            <div>
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="form-input"
                required
                autoFocus
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="form-submit disabled:opacity-60"
            >
              {loading ? "Sending..." : "Send Reset Link"}
            </button>
            <div className="text-center mt-4">
              <Link
                href="/login"
                className="text-yellow text-[12px] hover:underline font-body"
              >
                Back to sign in
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
