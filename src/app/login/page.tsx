"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/utils/supabase/client";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0D0D0D]" />}>
      <LoginForm />
    </Suspense>
  );
}

const CLIENT_FEATURES = [
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25" />
      </svg>
    ),
    title: "Track Projects",
    desc: "Monitor project milestones, timelines, and status updates in real time.",
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    ),
    title: "View Deliverables",
    desc: "Access completed work, drafts, and campaign assets all in one place.",
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
      </svg>
    ),
    title: "Message Your Team",
    desc: "Chat directly with your account manager and campaign specialists.",
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5m.75-9l3-3 2.148 2.148A12.061 12.061 0 0116.5 7.605" />
      </svg>
    ),
    title: "Access Reports",
    desc: "Download research findings, campaign performance data, and analytics.",
  },
];

const STAFF_FEATURES = [
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
      </svg>
    ),
    title: "Pipeline Management",
    desc: "Track leads, manage deals, and oversee the entire sales pipeline.",
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.25 2.25 0 012.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
      </svg>
    ),
    title: "Task Management",
    desc: "Manage your daily tasks, deadlines, and collaborate with your team.",
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z" />
      </svg>
    ),
    title: "Reporting & Analytics",
    desc: "Generate reports, track KPIs, and measure campaign performance.",
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
      </svg>
    ),
    title: "Team Collaboration",
    desc: "Work together on client projects, share files, and stay aligned.",
  },
];

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [view, setView] = useState<"client" | "staff">("client");

  const supabase = createClient();

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

    const {
      data: { user },
    } = await supabase.auth.getUser();
    const role = user?.user_metadata?.role;

    if (!role) {
      setError(
        "Your account is missing a staff role configuration. Contact your administrator.",
      );
      setLoading(false);
      await supabase.auth.signOut();
      return;
    }

    if (nextPath && !nextPath.startsWith("/login")) {
      router.push(nextPath);
      return;
    }

    const redirects: Record<string, string> = {
      super_admin: "/app",
      crm_admin: "/app/pipeline",
      crm_staff: "/app/my-day",
      cms_admin: "/app/content",
      finance: "/app/invoices",
      client: "/portal",
    };
    router.push(redirects[role] || "/app/pipeline");
  };

  const handleClientLogin = async (e: React.FormEvent) => {
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

    router.push("/portal");
  };

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

  const switchToClient = () => {
    setView("client");
    setError("");
    setEmail("");
    setPassword("");
  };

  return (
    <div className="min-h-screen bg-[#0D0D0D] flex">
      {/* ── BRAND PANEL ─────────────────────────────── */}
      <div
        className="hidden lg:flex lg:w-1/2 relative overflow-hidden"
        style={{
          background:
            "linear-gradient(160deg, #0D0D0D 0%, #1A1500 40%, #2A2000 70%, #0D0D0D 100%)",
        }}
      >
        {/* Decorative gradient orbs */}
        <div
          className="absolute -top-40 -left-40 w-96 h-96 rounded-full opacity-20"
          style={{
            background:
              "radial-gradient(circle, rgba(244,195,0,0.3) 0%, transparent 70%)",
          }}
        />
        <div
          className="absolute -bottom-32 -right-16 w-80 h-80 rounded-full opacity-10"
          style={{
            background:
              "radial-gradient(circle, rgba(244,195,0,0.2) 0%, transparent 70%)",
          }}
        />

        <div className="relative z-10 flex flex-col justify-between w-full px-16 py-16">
          {/* Logo */}
          <div>
            <Image
              src="/marketlink-logo.png"
              alt="Market Link"
              width={140}
              height={32}
              style={{ height: "32px", width: "auto" }}
            />
          </div>

          {view === "client" ? (
            <div className="space-y-10">
              <div>
                <h2 className="font-display text-[32px] font-bold leading-tight text-white mb-4">
                  Your brand&#8217;s growth
                  <br />
                  <span className="text-yellow">starts here.</span>
                </h2>
                <p className="text-[14px] leading-relaxed text-gray-5 max-w-[420px]">
                  Sign in to your client portal to track projects, review
                  deliverables, and stay connected with your Market Link team.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-x-8 gap-y-6">
                {CLIENT_FEATURES.map((f) => (
                  <div key={f.title} className="flex gap-3">
                    <div className="mt-0.5 shrink-0 text-yellow/70">
                      {f.icon}
                    </div>
                    <div>
                      <h3 className="text-[13px] font-semibold text-white mb-1">
                        {f.title}
                      </h3>
                      <p className="text-[11px] leading-relaxed text-gray-5">
                        {f.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-10">
              <div>
                <h2 className="font-display text-[32px] font-bold leading-tight text-white mb-4">
                  Internal tools,
                  <br />
                  <span className="text-yellow">one gateway.</span>
                </h2>
                <p className="text-[14px] leading-relaxed text-gray-5 max-w-[420px]">
                  Access the Market Link staff portal to manage pipelines, tasks,
                  reporting, and client work from a single dashboard.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-x-8 gap-y-6">
                {STAFF_FEATURES.map((f) => (
                  <div key={f.title} className="flex gap-3">
                    <div className="mt-0.5 shrink-0 text-yellow/70">
                      {f.icon}
                    </div>
                    <div>
                      <h3 className="text-[13px] font-semibold text-white mb-1">
                        {f.title}
                      </h3>
                      <p className="text-[11px] leading-relaxed text-gray-5">
                        {f.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer quote */}
          <div className="border-t border-white/5 pt-6">
            <p className="text-[11px] text-gray-5 italic leading-relaxed max-w-[400px]">
              &ldquo;Market Link transformed how we understand the Kenyan market.
              Their insights changed our approach completely.&rdquo;
              <span className="block text-[10px] not-italic text-gray-6 mt-1">
                &mdash; Client, Nairobi
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* ── LOGIN PANEL ─────────────────────────────── */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-[420px] mx-auto">
          {/* Mobile logo only */}
          <div className="lg:hidden text-center mb-10">
            <Image
              src="/marketlink-logo.png"
              alt="Market Link"
              width={120}
              height={28}
              style={{ height: "28px", width: "auto" }}
              className="mx-auto mb-3"
            />
          </div>

          {/* ── CLIENT PORTAL VIEW ──────────────────── */}
          {view === "client" && (
            <>
              <div className="text-center mb-8">
                <div
                  className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-5"
                  style={{
                    background:
                      "linear-gradient(135deg, rgba(244,195,0,0.15) 0%, rgba(244,195,0,0.05) 100%)",
                    border: "1px solid rgba(244,195,0,0.15)",
                  }}
                >
                  <svg
                    className="w-7 h-7 text-yellow"
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
                <h2 className="font-display text-[20px] font-bold text-white mb-2">
                  Client Portal
                </h2>
                <p className="text-[13px] text-gray-5">
                  Sign in to access your account dashboard.
                </p>
              </div>

              <div
                className="rounded-2xl p-8"
                style={{
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                {error && (
                  <div className="bg-red/10 border border-red/20 text-red text-[12px] px-4 py-2.5 rounded-lg mb-5">
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
                  <button
                    type="submit"
                    disabled={loading}
                    className="form-submit disabled:opacity-60"
                  >
                    {loading ? "Signing in..." : "Sign In"}
                  </button>
                </form>

                <p className="text-center text-[11px] text-gray-5 mt-5 leading-relaxed">
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

              <div className="text-center mt-5">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => {
                    setEmail("demo.client@marketlink.co.ke");
                    setPassword("Demo123!");
                    setError("");
                  }}
                  className="text-[11px] font-mono font-medium px-4 py-2 rounded-full border border-[#2A2A2A] bg-transparent text-gray-5 hover:text-yellow hover:border-yellow/40 transition-all cursor-pointer disabled:opacity-50"
                >
                  Demo: Client Portal
                </button>
              </div>

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

          {/* ── STAFF LOGIN VIEW ────────────────────── */}
          {view === "staff" && (
            <div
              className="rounded-2xl p-8"
              style={{
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <div className="text-center mb-6">
                <h2 className="font-display text-[18px] font-bold text-white">
                  Staff Portal
                </h2>
                <p className="text-[11px] text-gray-5 mt-1">
                  Sign in with your Market Link account
                </p>
              </div>

              <div className="flex gap-2 mb-6">
                <button
                  onClick={() => {
                    setView("client");
                    setError("");
                  }}
                  className="flex-1 py-2 text-[11px] font-medium rounded-lg border border-[#333] text-gray-5 hover:text-white hover:border-[#555] transition-all bg-transparent cursor-pointer"
                >
                  &larr; Client Portal
                </button>
                <span className="flex-1 py-2 text-[11px] font-semibold rounded-lg bg-yellow text-black text-center cursor-default">
                  Staff Login
                </span>
              </div>

              {error && (
                <div className="bg-red/10 border border-red/20 text-red text-[12px] px-4 py-2.5 rounded-lg mb-5">
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

              <div className="mt-5 pt-4 border-t border-[#1A1A1A]">
                <p className="text-[9px] font-mono text-gray-5 tracking-widest uppercase text-center mb-3">
                  Demo accounts
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {[
                    { role: "super_admin", label: "Super Admin" },
                    { role: "crm_admin", label: "CRM Admin" },
                    { role: "crm_staff", label: "CRM Staff" },
                    { role: "cms_admin", label: "CMS Admin" },
                    { role: "finance", label: "Finance" },
                  ].map((d) => (
                    <button
                      key={d.role}
                      type="button"
                      disabled={loading}
                      onClick={async () => {
                        setLoading(true);
                        setError("");
                        try {
                          const res = await fetch("/api/auth/demo-login", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ role: d.role }),
                          });
                          const data = await res.json();
                          if (data.session) {
                            const { createClient } =
                              await import("@/utils/supabase/client");
                            const supabase = createClient();
                            await supabase.auth.setSession({
                              access_token: data.session.access_token,
                              refresh_token: data.session.refresh_token,
                            });
                            const {
                              data: { user },
                            } = await supabase.auth.getUser();
                            if (user?.user_metadata?.role !== d.role) {
                              await supabase.auth.updateUser({
                                data: {
                                  role: d.role,
                                  name: d.label,
                                },
                              });
                            }
                            window.location.href = data.redirect;
                          } else if (data.requiresConfirmation) {
                            setError(
                              "Account created! Check your email to confirm, then sign in.",
                            );
                            setLoading(false);
                          } else {
                            setError(data.error || "Login failed");
                            setLoading(false);
                          }
                        } catch {
                          setError("Connection error");
                          setLoading(false);
                        }
                      }}
                      className="text-[10px] font-mono font-medium px-3 py-1.5 rounded-full border border-[#2A2A2A] bg-transparent text-gray-5 hover:text-yellow hover:border-yellow/40 transition-all cursor-pointer disabled:opacity-50"
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

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
                  &larr; Back to client portal
                </button>
              </p>
            </div>
          )}

          <p className="text-center text-[10px] text-gray-5 mt-10">
            &copy; 2026 Market Link. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
