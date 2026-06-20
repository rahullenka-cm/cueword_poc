"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import SetupNotice from "@cueword/core/components/SetupNotice";
import { isSupabaseConfigured } from "@cueword/core/lib/supabase/client";
import { signIn, useSupabaseUser } from "@cueword/core/lib/auth-supabase";

export default function CoachLoginPage() {
  const router = useRouter();
  const { user, ready } = useSupabaseUser();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Already signed in as a coach → go home.
  useEffect(() => {
    if (ready && user && user.role === "coach") router.replace("/");
  }, [ready, user, router]);

  if (!isSupabaseConfigured) return <SetupNotice />;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signIn(email, password, "coach");
      router.replace("/");
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="cw-login">
      <div className="cw-login-card">
        <div className="cw-launch-logo">
          <span className="dot" />
          <b>cueword</b>
          <span>coach</span>
        </div>
        <h1>Log in</h1>
        <p className="cw-login-sub">Sign in to your coaching console.</p>

        <form onSubmit={onSubmit} className="cw-login-form">
          <div className="cw-field">
            <label>Email</label>
            <input
              className="cw-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
              autoComplete="username"
            />
          </div>
          <div className="cw-field">
            <label>Password</label>
            <input
              className="cw-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          {error && <div className="cw-error">{error}</div>}
          <button className="cw-btn" type="submit" disabled={busy}>
            {busy ? "Signing in…" : "Log in →"}
          </button>
        </form>
      </div>
    </div>
  );
}
