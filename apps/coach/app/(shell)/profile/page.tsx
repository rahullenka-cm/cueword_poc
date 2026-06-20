"use client";
/* Screen — Coach profile & settings. Wired to the real backend: coaches + profiles
   + v_tutor_stats. Preferences are local cosmetic toggles (no prefs table yet);
   "Sign out" uses real Supabase Auth. */
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Icon, Avatar } from "@/components/Icon";
import { signOut, useSupabaseUser } from "@cueword/core/lib/auth-supabase";
import { getCoachProfile, type CoachProfile } from "@/data/live";

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={on}
      style={{ width: 42, height: 24, borderRadius: 99, border: 0, padding: 3, cursor: "pointer", background: on ? "var(--brand)" : "var(--line)", transition: ".15s", flex: "none" }}
    >
      <span style={{ display: "block", width: 18, height: 18, borderRadius: 99, background: "#fff", transform: on ? "translateX(18px)" : "none", transition: ".15s", boxShadow: "0 1px 3px rgba(0,0,0,.2)" }} />
    </button>
  );
}

function Row({ icon, label, value, mono }: { icon: string; label: string; value: string; mono?: boolean }) {
  return (
    <div className="row" style={{ padding: "11px 0", borderBottom: "1px solid var(--line-2)", gap: 12 }}>
      <span style={{ width: 30, height: 30, borderRadius: 8, background: "var(--surface-3)", color: "var(--ink-3)", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
        <Icon n={icon} size={15} />
      </span>
      <span className="muted" style={{ fontSize: 12.5, fontWeight: 600, width: 130 }}>{label}</span>
      <span className="grow" style={{ fontSize: 13.5, fontWeight: 650, letterSpacing: mono ? ".01em" : 0 }}>{value}</span>
    </div>
  );
}

type PrefKey = "showStudentTz" | "autoFeedback" | "reminders" | "weeklyDigest" | "soundAlerts";

export default function ProfilePage() {
  const router = useRouter();
  const search = useSearchParams();
  const section = search.get("section") || "profile";
  const { user } = useSupabaseUser();
  const [k, setK] = useState<CoachProfile | null>(null);
  const [prefs, setPrefs] = useState<Record<PrefKey, boolean>>({
    showStudentTz: true, autoFeedback: true, reminders: true, weeklyDigest: true, soundAlerts: false,
  });
  const toggle = (key: PrefKey) => setPrefs((p) => ({ ...p, [key]: !p[key] }));

  useEffect(() => {
    if (!user?.id) return;
    getCoachProfile(user.id).then(setK).catch(() => setK(null));
  }, [user?.id]);

  const tabs = [["profile", "Profile"], ["preferences", "Preferences"], ["account", "Account"]];
  const name = k?.fullName ?? user?.full_name ?? "Coach";

  return (
    <div className="content-inner fade-up">
      <div className="card" style={{ overflow: "hidden", marginBottom: "var(--gap)", position: "relative" }}>
        <div style={{ height: 76, background: "linear-gradient(110deg, var(--brand) 0%, var(--brand-ink) 100%)" }} />
        <div style={{ position: "absolute", left: "var(--pad)", top: 38, border: "4px solid var(--surface)", borderRadius: "50%" }}>
          <Avatar name={name} color="#EE9612" size={80} />
        </div>
        <div className="row" style={{ padding: "14px var(--pad) 16px", paddingLeft: "calc(var(--pad) + 100px)", alignItems: "center", gap: 16, minHeight: 56 }}>
          <div className="grow">
            <h1 className="page-title" style={{ fontSize: 23 }}>{name}</h1>
            <div className="row" style={{ gap: 8, marginTop: 4, flexWrap: "wrap" }}>
              <span className="chip" style={{ background: "var(--brand-soft)", color: "var(--brand-ink)" }}>{k?.type ?? "Coach"}</span>
              <span className="muted" style={{ fontSize: 13 }}>{k?.tzCity ?? k?.timezone ?? "—"}</span>
            </div>
          </div>
        </div>
        <div className="row" style={{ borderTop: "1px solid var(--line-2)" }}>
          {([
            ["Sessions held", k?.sessionsHeld ?? 0],
            ["Hours taught", k?.hoursTaught ?? 0],
            ["Attendance", k?.attendanceRate != null ? `${Math.round(k.attendanceRate * 100)}%` : "—"],
          ] as [string, string | number][]).map(([l, v], i) => (
            <div key={i} className="grow" style={{ padding: "13px var(--pad)", borderLeft: i ? "1px solid var(--line-2)" : "none" }}>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700, color: "var(--ink)" }}>{v}</div>
              <div className="muted" style={{ fontSize: 12 }}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="role-toggle" style={{ marginBottom: "var(--gap)", width: "fit-content" }}>
        {tabs.map(([key, label]) => (
          <button key={key} className={section === key ? "on" : ""} onClick={() => router.push(`/profile?section=${key}`)} style={{ padding: "6px 16px" }}>
            {label}
          </button>
        ))}
      </div>

      {section === "profile" && (
        <div className="kgrid" style={{ gridTemplateColumns: "1fr 1fr", alignItems: "start" }}>
          <div className="card card-pad">
            <h3 style={{ margin: "0 0 6px", fontFamily: "var(--font-display)", fontSize: 15 }}>Personal details</h3>
            <Row icon="roster" label="Full name" value={name} />
            <Row icon="mail" label="Email" value={k?.email ?? "—"} mono />
            <Row icon="globe2" label="Timezone" value={k?.timezone ?? "—"} />
          </div>
          <div className="card card-pad">
            <h3 style={{ margin: "0 0 6px", fontFamily: "var(--font-display)", fontSize: 15 }}>Teaching</h3>
            <Row icon="roster" label="Type" value={k?.type ?? "—"} />
            <Row icon="users2" label="Capacity" value={k?.capacity != null ? String(k.capacity) : "—"} />
            <Row icon="zoom" label="Zoom link" value={k?.zoomLink ?? "—"} mono />
          </div>
        </div>
      )}

      {section === "preferences" && (
        <div className="card">
          <div className="card-head"><h3>Session preferences</h3><span className="ch-sub muted">local only</span></div>
          <div className="card-pad" style={{ paddingTop: 4 }}>
            {([
              ["showStudentTz", "Always show student timezone", "Display each student's local time beside Manila time."],
              ["autoFeedback", "AI-drafted feedback", "Pre-fill feedback with an AI draft you can edit before sending."],
              ["reminders", "Session reminders", "Nudge me 10 minutes before each session starts."],
              ["weeklyDigest", "Weekly digest email", "Summary of attendance, marks & progress."],
              ["soundAlerts", "Sound alerts", "Play a chime when a student submits work."],
            ] as [PrefKey, string, string][]).map(([key, t, d]) => (
              <div key={key} className="row" style={{ padding: "11px 0", borderBottom: "1px solid var(--line-2)", gap: 14, alignItems: "flex-start" }}>
                <div className="grow">
                  <b style={{ fontSize: 13.5 }}>{t}</b>
                  <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>{d}</div>
                </div>
                <Toggle on={prefs[key]} onClick={() => toggle(key)} />
              </div>
            ))}
          </div>
        </div>
      )}

      {section === "account" && (
        <div className="card card-pad" style={{ maxWidth: 520 }}>
          <h3 style={{ margin: "0 0 12px", fontFamily: "var(--font-display)", fontSize: 15 }}>Account</h3>
          <Row icon="mail" label="Login email" value={k?.email ?? "—"} mono />
          <div className="row" style={{ gap: 10, marginTop: 16 }}>
            <button
              className="btn"
              style={{ color: "var(--live)", borderColor: "rgba(240,71,107,.3)" }}
              onClick={() => void signOut().finally(() => router.replace("/login"))}
            >
              <Icon n="logout" size={15} /> Sign out
            </button>
            <span className="muted" style={{ fontSize: 11.5 }}>You&apos;ll need to sign in again to coach.</span>
          </div>
        </div>
      )}
    </div>
  );
}
