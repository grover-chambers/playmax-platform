"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0D0D0D]" />}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [view, setView] = useState<"client" | "staff" | "connecting">("client");

  const supabase = createClient();

  /* ── Staff email/password sign-in ────────────────── */
  const handleStaffLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error: authErr } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authErr) {
      setError(authErr.message);
      setLoading(false);
      return;
    }

    await redirectStaffUser();
  };

  /* ── Google OAuth (staff) ──────────────────────────── */
  const handleGoogleLogin = async () => {
    setError("");
    setLoading(true);

    const { error: authErr } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${location.origin}/auth/callback?next=${nextPath || "/app/pipeline"}`,
      },
    });

    if (authErr) {
      setError(authErr.message);
      setLoading(false);
    }
  };

  /* ── Client portal access via magic link ─────────── */
  const handleClientLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error: authErr } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false,
        emailRedirectTo: `${location.origin}/auth/callback?next=/portal`,
      },
    });

    setLoading(false);

    if (authErr) {
      setError(authErr.message);
      return;
    }

    setView("connecting");
  };

  /* ── Redirect staff user after auth ──────────────── */
  async function redirectStaffUser() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    const role = user.user_metadata?.role;

    if (nextPath && !nextPath.startsWith("/login")) {
      router.push(nextPath);
      return;
    }

    if (role === "client") {
      router.push("/portal");
    } else {
      router.push("/app/pipeline");
    }
  }

  /* ── Go back to client view from staff view ──────── */
  const switchToClient = () => {
    setView("client");
    setError("");
    setEmail("");
    setPassword("");
  };

  return (
    <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-[400px] mx-auto">
        {/* ── CLIENT PORTAL VIEW ──────────────────────── */}
        {view === "client" && (
          <>
            {/* Hero card */}
            <div className="text-center mb-10">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-yellow/10 border border-yellow/20 mb-6">
                <svg
                  className="w-8 h-8 text-yellow"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
                  />
                </svg>
              </div>
              <h1 className="site-logo text-[22px] mb-3">
                PLAY<span className="site-logo-accent">MAX</span>
              </h1>
              <p className="body-copy-sm text-center max-w-[320px] mx-auto">
                Sign in to your client portal to track projects, view
                deliverables, and message your account team.
              </p>
            </div>

            {/* Card */}
            <div className="card !bg-black-2 p-8">
              <h2 className="font-display text-[15px] font-bold text-center mb-6">
                Client Portal
              </h2>

              {error && (
                <div className="bg-red/10 border border-red/20 text-red text-[12px] px-4 py-2.5 rounded mb-4">
                  {error}
                </div>
              )}

              <form onSubmit={handleClientLogin} className="space-y-4">
                <div>
                  <input
                    type="email"
                    placeholder="Your email address"
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
                  {loading ? "Sending magic link..." : "Send Magic Link"}
                </button>
              </form>

              <p className="text-center text-[11px] text-gray-5 mt-4 leading-relaxed">
                No account? Your account manager creates this for you.
                <br />
                <Link
                  href="/contact"
                  className="text-yellow hover:underline font-medium"
                >
                  Contact us
                </Link>{" "}
                to get started.
              </p>
            </div>

            {/* Staff login trigger */}
            <div className="text-center mt-8">
              <button
                onClick={() => {
                  setView("staff");
                  setError("");
                }}
                className="inline-flex items-center gap-1.5 text-[12px] text-gray-5 hover:text-gray-3 transition-colors bg-transparent border-none cursor-pointer"
              >
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
                Staff sign in
              </button>
            </div>
          </>
        )}

        {/* ── STAFF LOGIN VIEW ──────────────────────────── */}
        {view === "staff" && (
          <div className="card !bg-black-2 p-8">
            {/* Mini logo */}
            <div className="text-center mb-6">
              <h2 className="site-logo text-[18px]">
                PLAY<span className="site-logo-accent">MAX</span>
              </h2>
              <p className="text-[11px] text-gray-5 mt-1">Staff Portal</p>
            </div>

            {/* Tab pills */}
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => {
                  setView("client");
                  setError("");
                }}
                className="flex-1 py-2 text-[11px] font-medium rounded border border-[#333] text-gray-5 hover:text-white hover:border-[#555] transition-all bg-transparent cursor-pointer"
              >
                ← Client Portal
              </button>
              <span className="flex-1 py-2 text-[11px] font-semibold rounded bg-yellow text-black text-center cursor-default">
                Staff Login
              </span>
            </div>

            {error && (
              <div className="bg-red/10 border border-red/20 text-red text-[12px] px-4 py-2.5 rounded mb-4">
                {error}
              </div>
            )}

            <form onSubmit={handleStaffLogin} className="space-y-4">
              <div>
                <input
                  type="email"
                  placeholder="Staff email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="form-input"
                  required
                  autoFocus
                />
              </div>
              <div>
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="form-input"
                  required
                  minLength={6}
                />
              </div>
              <div className="text-right">
                <Link
                  href="/forgot-password"
                  className="text-yellow text-[11px] hover:underline font-body"
                >
                  Forgot password?
                </Link>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="form-submit disabled:opacity-60"
              >
                {loading ? "Signing in..." : "Sign In"}
              </button>
            </form>

            <div className="flex items-center gap-3 my-5">
              <div className="divider flex-1" />
              <span className="text-gray-5 text-[11px] font-body">or</span>
              <div className="divider flex-1" />
            </div>

            <button
              type="button"
              disabled={loading}
              onClick={handleGoogleLogin}
              className="btn-secondary w-full justify-center text-[13px] !font-medium disabled:opacity-60"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.23c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Sign in with Google
            </button>

            <p className="text-center mt-5 text-[11px] text-gray-5">
              <button
                onClick={switchToClient}
                className="text-yellow hover:underline bg-transparent border-none cursor-pointer text-[11px] font-medium"
              >
                ← Back to client portal
              </button>
            </p>
          </div>
        )}

        {/* ── LINK SENT STATE ──────────────────────────── */}
        {view === "connecting" && (
          <div className="card !bg-black-2 p-8 text-center">
            <div className="w-14 h-14 rounded-full bg-green/10 flex items-center justify-center mx-auto mb-5">
              <svg
                className="w-7 h-7 text-green"
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
            <h3 className="font-display text-[16px] font-bold mb-2">
              Magic link sent!
            </h3>
            <p className="text-[12px] text-gray-5 mb-6 max-w-[280px] mx-auto leading-relaxed">
              Check your email for the sign-in link. It expires in 10 minutes.
            </p>
            <button
              onClick={() => setView("client")}
              className="text-yellow text-[12px] hover:underline bg-transparent border-none cursor-pointer font-medium"
            >
              Send again
            </button>
          </div>
        )}

        {/* Footer */}
        <p className="text-center text-[10px] text-gray-5 mt-10">
          © 2026 PlayMax Agency. All rights reserved.
        </p>
      </div>
    </div>
  );
}
