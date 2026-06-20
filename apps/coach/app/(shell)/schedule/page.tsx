"use client";
/* Screen 4 — Schedule. Wired to the real backend: the coach's class_sessions for
   the current week (RLS-scoped), grouped by day. All times shown in Manila time;
   Join Zoom opens the real link, the live row pushes to /live. */
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon, Avatar } from "@/components/Icon";
import { useSupabaseUser } from "@cueword/core/lib/auth-supabase";
import { getSessions, type SessionRow } from "@/data/live";
import { getZoomLink } from "@cueword/core/lib/config";

const PALETTE = ["#2D7FF9", "#EC5A8D", "#11A974", "#EE9612", "#7C5CFC", "#06AFC4"];
const colorFor = (id: string) =>
  PALETTE[[...id].reduce((a, c) => a + c.charCodeAt(0), 0) % PALETTE.length];

const MANILA = "Asia/Manila";
const dayKey = (iso: string) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: MANILA, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
const dayLabel = (iso: string) =>
  new Intl.DateTimeFormat("en-US", { timeZone: MANILA, weekday: "long", month: "short", day: "numeric" }).format(new Date(iso));
const timeLabel = (iso: string) =>
  new Intl.DateTimeFormat("en-US", { timeZone: MANILA, hour: "numeric", minute: "2-digit" }).format(new Date(iso));

export default function SchedulePage() {
  const router = useRouter();
  const { user, ready } = useSupabaseUser();
  const zoomLink = getZoomLink();
  const [sessions, setSessions] = useState<SessionRow[] | null>(null);

  // current week window: today 00:00 → +7 days (instant math is fine for a range)
  const { fromISO, toISO, weekLabel } = useMemo(() => {
    const now = new Date();
    const from = new Date(now);
    from.setHours(0, 0, 0, 0);
    const to = new Date(from);
    to.setDate(to.getDate() + 7);
    const fmt = (d: Date) => new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(d);
    return { fromISO: from.toISOString(), toISO: to.toISOString(), weekLabel: `${fmt(from)} – ${fmt(to)}` };
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    getSessions(user.id, fromISO, toISO)
      .then(setSessions)
      .catch(() => setSessions([]));
  }, [user?.id, fromISO, toISO]);

  const loading = !ready || sessions === null;
  const rows = sessions ?? [];
  const live = rows.find((s) => s.status === "live" || s.status === "in_progress") ?? null;

  // group by Manila day, preserving the time-ordered sequence from the query
  const groups: { key: string; label: string; items: SessionRow[] }[] = [];
  for (const s of rows) {
    const k = dayKey(s.scheduledAt);
    let g = groups.find((x) => x.key === k);
    if (!g) { g = { key: k, label: dayLabel(s.scheduledAt), items: [] }; groups.push(g); }
    g.items.push(s);
  }

  return (
    <div className="content-inner fade-up">
      <div className="row" style={{ marginBottom: 14 }}>
        <div>
          <h1 className="page-title">Schedule</h1>
          <p className="page-sub">
            {loading ? "Loading…" : `${rows.length} sessions this week · you teach all 7 days, evening Manila time`}
          </p>
        </div>
        <span className="grow" />
        <b className="tnum" style={{ fontSize: 13.5, minWidth: 150, textAlign: "center" }}>{weekLabel}</b>
      </div>

      {/* ongoing-session callout */}
      {live && (
        <div
          onClick={() => router.push("/live")}
          role="button"
          tabIndex={0}
          className="row"
          style={{
            width: "100%", textAlign: "left",
            border: "1px solid color-mix(in srgb, var(--live) 35%, transparent)",
            background: "var(--live-soft)", borderRadius: "var(--r-md)",
            padding: "11px 16px", marginBottom: 14, gap: 12, cursor: "pointer",
          }}
        >
          <span className="live-dot" style={{ background: "var(--live)", width: 9, height: 9 }} />
          <b style={{ fontSize: 12, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--live)" }}>Live now</b>
          <Avatar name={live.studentName} color={colorFor(live.studentId)} size={28} />
          <b style={{ fontSize: 14 }}>{live.studentName}</b>
          <span className="muted" style={{ fontSize: 12.5 }}>· {timeLabel(live.scheduledAt)} · {live.storyTitle ?? "—"}</span>
          <span className="grow" />
          <a className="btn-zoom live" href={zoomLink} target="_blank" rel="noopener" onClick={(e) => e.stopPropagation()} style={{ textDecoration: "none" }}>
            <Icon n="zoom" size={15} /> Join Zoom
          </a>
          <span className="btn-zoom" style={{ pointerEvents: "none", background: "var(--ink)" }}>
            <Icon n="live" size={15} /> Open live class
          </span>
        </div>
      )}

      {/* persistent timezone banner */}
      <div className="banner warn" style={{ marginBottom: 14 }}>
        <Icon n="warn" />
        <div>
          <b>All times shown in Manila time (PH · UTC+08:00).</b> Students see these converted to their own local time on their end.
        </div>
      </div>

      {loading ? (
        <div className="card card-pad muted" style={{ textAlign: "center", padding: 28 }}>Loading sessions…</div>
      ) : rows.length === 0 ? (
        <div className="card card-pad muted" style={{ textAlign: "center", padding: 28 }}>No sessions scheduled this week.</div>
      ) : (
        groups.map((g) => (
          <div key={g.key} className="card" style={{ marginBottom: "var(--gap)", overflow: "hidden" }}>
            <div className="card-head"><h3>{g.label}</h3><span className="ch-sub muted">{g.items.length} session{g.items.length === 1 ? "" : "s"}</span></div>
            <div className="card-pad" style={{ paddingTop: 4 }}>
              {g.items.map((s) => {
                const isLive = s.status === "live" || s.status === "in_progress";
                const done = s.status === "completed" || s.status === "done";
                return (
                  <button
                    key={s.id}
                    onClick={() => (isLive ? router.push("/live") : router.push(`/roster/${s.studentId}`))}
                    className="row"
                    style={{
                      width: "100%", textAlign: "left", gap: 12, padding: "10px 0",
                      borderBottom: "1px solid var(--line-2)", border: 0, background: "transparent",
                      cursor: "pointer", opacity: done ? 0.55 : 1,
                    }}
                  >
                    <b className="tnum" style={{ fontSize: 13, width: 78, color: "var(--ink-2)" }}>{timeLabel(s.scheduledAt)}</b>
                    <span style={{ width: 3, alignSelf: "stretch", borderRadius: 2, background: colorFor(s.studentId) }} />
                    <Avatar name={s.studentName} color={colorFor(s.studentId)} size={30} />
                    <div className="grow">
                      <b style={{ fontSize: 13.5 }}>{s.studentName}</b>
                      <div className="muted" style={{ fontSize: 12 }}>{s.storyTitle ?? "—"}</div>
                    </div>
                    {isLive ? (
                      <span className="status-tag st-progress" style={{ fontSize: 10.5 }}><span className="live-dot" style={{ background: "var(--live)" }} /> Live</span>
                    ) : done ? (
                      <span className="status-tag st-mastered" style={{ fontSize: 10.5 }}>Done</span>
                    ) : (
                      <span className="muted" style={{ fontSize: 11.5 }}>{s.status}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
