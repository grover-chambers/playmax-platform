"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/browser";

type AuthView = "login" | "client-login" | "connecting";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [view, setView] = useState<AuthView>("login");
  const [clientCode, setClientCode] = useState("");

  const supabase = createClient();

  /* ── Email/password sign-in ─────────────────────── */
  const handleLogin = async (e: React.FormEvent) => {
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

    // Role-based redirect
    await redirectUser();
  };

  /* ── Google OAuth ────────────────────────────────── */
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

  /* ── Determine where to send the user ────────────── */
  async function redirectUser() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    const role = user.user_metadata?.role;

    // Respect explicit next param
    if (nextPath && !nextPath.startsWith("/login")) {
      router.push(nextPath);
      return;
    }

    if (role === "client") {
      router.push("/portal");
    } else {
      // staff / admin / fallback
      router.push("/app/pipeline");
    }
  }

  /* ── Render ─────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center px-4">
      <div className="card !bg-black-2 p-8 w-full max-w-[400px] mx-auto">
        {/* Logo */}
        <div className="text-center mb-6">
          <h1 className="site-logo text-[20px]">
            PLAY<span className="site-logo-accent">MAX</span>
          </h1>
        </div>

        {/* Tab: Staff / Client */}
        <div className="flex bg-black-3 rounded p-0.5 mb-6">
          <button
            onClick={() => {
              setView("login");
              setError("");
            }}
            className={`flex-1 py-2 text-[12px] font-semibold rounded transition-all ${
              view === "login" || view === "connecting"
                ? "bg-yellow text-black"
                : "text-gray-4 hover:text-white"
            }`}
          >
            Staff Login
          </button>
          <button
            onClick={() => {
              setView("client-login");
              setError("");
            }}
            className={`flex-1 py-2 text-[12px] font-semibold rounded transition-all ${
              view === "client-login"
                ? "bg-yellow text-black"
                : "text-gray-4 hover:text-white"
            }`}
          >
            Client Portal
          </button>
        </div>

        {/* ── STAFF LOGIN ─────────────────────────────── */}
        {view === "login" && (
          <>
            {error && (
              <div className="bg-red/10 border border-red/20 text-red text-[12px] px-4 py-2.5 rounded mb-4">
                {error}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
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
                  className="text-yellow text-[12px] hover:underline font-body"
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

            <div className="flex items-center gap-3 my-6">
              <div className="divider flex-1" />
              <span className="text-gray-5 text-[12px] font-body">or</span>
              <div className="divider flex-1" />
            </div>

            <button
              type="button"
              disabled={loading}
              onClick={handleGoogleLogin}
              className="btn-secondary w-full justify-center text-[14px] !font-medium disabled:opacity-60"
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

            <p className="text-center mt-6 text-[13px] text-gray-4 font-body">
              Don&apos;t have an account?{" "}
              <Link href="/contact" className="text-yellow hover:underline">
                Contact us
              </Link>
            </p>
          </>
        )}

        {/* ── CLIENT PORTAL LOGIN ──────────────────────── */}
        {view === "client-login" && (
          <>
            <p className="text-[13px] text-gray-4 mb-6 leading-relaxed">
              Enter the email address your account manager registered for your
              portal access. We&apos;ll send you a magic link to sign in.
            </p>

            {error && (
              <div className="bg-red/10 border border-red/20 text-red text-[12px] px-4 py-2.5 rounded mb-4">
                {error}
              </div>
            )}

            <form onSubmit={handleClientLogin} className="space-y-4">
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
                {loading ? "Sending link..." : "Send Magic Link"}
              </button>
            </form>

            <p className="text-center mt-6 text-[13px] text-gray-4 font-body">
              <button
                onClick={() => setView("login")}
                className="text-yellow hover:underline bg-transparent border-none cursor-pointer text-[13px]"
              >
                Staff sign in →
              </button>
            </p>
          </>
        )}

        {/* ── LINK SENT STATE ──────────────────────────── */}
        {view === "connecting" && (
          <div className="text-center py-4">
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
            <p className="text-[14px] text-gray-3 mb-2 font-medium">
              Magic link sent!
            </p>
            <p className="text-[12px] text-gray-5 mb-6">
              Check your email for the sign-in link. It expires in 10 minutes.
            </p>
            <button
              onClick={() => setView("client-login")}
              className="text-yellow text-[12px] hover:underline bg-transparent border-none cursor-pointer"
            >
              Send again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
