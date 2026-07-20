"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [sessionReady, setSessionReady] = useState<boolean | null>(null);

  useEffect(() => {
    const checkSession = async () => {
      const { createClient } = await import("@/utils/supabase/client");
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setSessionReady(!!session);
    };
    checkSession();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!password || !confirmPassword) {
      setError("Please fill in both fields.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const { createClient } = await import("@/utils/supabase/client");
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        setError(updateError.message);
        setLoading(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Still checking session
  if (sessionReady === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black px-4">
        <p className="text-muted">Checking session...</p>
      </div>
    );
  }

  // No session — the user likely navigated here without a valid reset link
  if (!sessionReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black px-4">
        <div className="card p-8 w-full max-w-md text-center">
          <div className="sidebar-logo text-center mb-6">
            PLAY<span className="text-yellow">MAX</span>
          </div>
          <p className="text-muted mb-6">
            This link is invalid or expired. Please request a new password reset
            link.
          </p>
          <a
            href="/login"
            className="btn-primary inline-flex items-center justify-center w-full"
          >
            Back to Login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black px-4">
      <div className="card p-8 w-full max-w-md">
        {/* Logo */}
        <div className="sidebar-logo text-center mb-6">
          PLAY<span className="text-yellow">MAX</span>
        </div>

        <h1 className="text-section text-center mb-2">Set new password</h1>
        <p className="text-muted text-center text-sm mb-6">
          Enter your new password below.
        </p>

        {success ? (
          <div className="text-center">
            <div className="text-green text-sm mb-4">
              Password updated successfully!
            </div>
            <p className="text-muted text-sm">Redirecting to login...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red/10 border border-red/30 rounded px-4 py-3 text-sm text-red">
                {error}
              </div>
            )}

            <div>
              <label className="form-label" htmlFor="password">
                New Password
              </label>
              <input
                id="password"
                type="password"
                className="form-input"
                placeholder="Enter new password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                disabled={loading}
              />
            </div>

            <div>
              <label className="form-label" htmlFor="confirm-password">
                Confirm Password
              </label>
              <input
                id="confirm-password"
                type="password"
                className="form-input"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                disabled={loading}
              />
            </div>

            <button type="submit" className="form-submit" disabled={loading}>
              {loading ? "Updating..." : "Update Password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}