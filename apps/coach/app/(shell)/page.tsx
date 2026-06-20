"use client";
/* Screen 1 — Dashboard (ported from app/screen_dashboard.jsx).
   Dynamic seam: the live indicator is driven by the REAL session
   (useActiveSession), the live hero pushes to /live, and every Join Zoom CTA
   opens the real getZoomLink(). */
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon, Avatar, SkillChip, AITag, StatusTag } from "@/components/Icon";
import { CW } from "@/data/coachData";
import { useLiveSession } from "@/components/Shell";
import { getZoomLink } from "@cueword/core/lib/config";
import { useSupabaseUser } from "@cueword/core/lib/auth-supabase";
import { getCoachLoad, type CoachLoad } from "@/data/live";

export default function Dashboard() {
  const C = CW;
  const router = useRouter();
  // The single useActiveSession() subscription lives in the Shell and is shared
  // via context (avoids a duplicate Realtime channel on the same session topic).
  const { liveActive } = useLiveSession();
  const zoomLink = getZoomLink();

  // Real coach KPIs (v_coach_load), scoped to the signed-in coach by RLS.
  // Falls back to mock numbers until the coach has live data.
  const { user } = useSupabaseUser();
  const [load, setLoad] = useState<CoachLoad | null>(null);
  useEffect(() => {
    if (!user?.id) return;
    getCoachLoad(user.id)
      .then(setLoad)
      .catch(() => setLoad(null));
  }, [user?.id]);

  const dataLive = C.sessions.find((s) => s.status === "live");
  // Real session drives the live state (not the mockup's hardcoded liveActive=true).
  const liveSession = liveActive ? dataLive : undefined;
  const liveStudent = liveSession ? C.byId(liveSession.studentId) : null;
  const nextSession = C.sessions.find((s) => s.status === "scheduled");
  const nextStudent = nextSession ? C.byId(nextSession.studentId) : null;

  // tick every 30s so the join window opens/closes on its own
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 30000);
    return () => clearInterval(t);
  }, []);

  // Join Zoom is only active from 15 min before start to 15 min after end (Manila time)
  const nowManilaMin = (() => {
    const s = new Date().toLocaleTimeString("en-US", { timeZone: "Asia/Manila", hour12: false, hour: "2-digit", minute: "2-digit" });
    const [h, m] = s.split(":").map(Number);
    return h * 60 + m;
  })();
  function parseTimeMin(t: string) {
    const m = (t || "").match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!m) return null;
    let h = +m[1] % 12;
    if (/PM/i.test(m[3])) h += 12;
    return h * 60 + +m[2];
  }
  function joinActive(s: (typeof C.sessions)[number]) {
    if (s.status === "done") return false;
    if (s.status === "live") return true;
    const start = parseTimeMin(s.time);
    if (start == null) return false;
    return nowManilaMin >= start - 15 && nowManilaMin <= start + (s.dur || 60) + 15;
  }

  // unified task inbox — marking + homework, priority-ordered
  const PRIO: Record<string, number> = { overdue: 0, tomark: 1, toassign: 2, assigned: 3, completed: 4 };
  type MarkTask = { kind: "mark"; prio: number; tag: string; m: (typeof C.submissions)[number]; sid: string };
  type HwTask = { kind: "hw"; prio: number; tag: string; h: (typeof C.homework)[string][number]; sid: string };
  const tasks: (MarkTask | HwTask)[] = [];
  C.submissions.forEach((m) => tasks.push({ kind: "mark", prio: PRIO.tomark, tag: "tomark", m, sid: m.studentId }));
  Object.entries(C.homework).forEach(([sid, list]) => {
    list.forEach((h) => tasks.push({ kind: "hw", prio: PRIO[h.status] ?? 5, tag: h.status, h, sid }));
  });
  tasks.sort((a, b) => a.prio - b.prio);
  const openTaskCount = tasks.filter((t) => t.tag === "overdue" || t.tag === "tomark" || t.tag === "toassign").length;

  const kpis = [
    { num: load?.active_students ?? C.students.length, lbl: "Total students", icon: "users2", tint: "var(--sk-read)", bg: "var(--sk-read-soft)" },
    { num: load?.sessions_today ?? C.sessions.length, lbl: "Sessions today", icon: "schedule", tint: "var(--sk-vocab)", bg: "var(--sk-vocab-soft)" },
    { num: load?.items_to_mark ?? C.submissions.length, lbl: "Items to mark", icon: "marking", hot: true },
    { num: "96%", lbl: "Attendance this week", icon: "trend", tint: "var(--brand)", bg: "var(--brand-soft)" },
  ];

  return (
    <div className="content-inner fade-up">
      {/* greeting */}
      <div style={{ marginBottom: "var(--pad)" }}>
        <h1 className="page-title">Good evening, Coach {C.coach.name.split(" ")[0]} 👋</h1>
        <p className="page-sub">
          Wednesday, June 10 · <b style={{ color: "var(--ink-2)" }}>{C.sessions.length} sessions today</b> ·{" "}
          <b style={{ color: "var(--warn)" }}>{C.submissions.length} items to mark</b>
        </p>
      </div>

      {/* hero — the single most important action: the live / next session */}
      {liveStudent && liveSession ? (
        <div
          onClick={() => router.push("/live")}
          role="button"
          tabIndex={0}
          className="row hero-live"
          style={{
            width: "100%",
            textAlign: "left",
            border: 0,
            borderRadius: "var(--r-lg)",
            padding: "18px 22px",
            marginBottom: "var(--pad)",
            gap: 18,
            cursor: "pointer",
            background: "linear-gradient(110deg, var(--ink) 0%, #1E3A30 100%)",
            color: "#fff",
            boxShadow: "var(--sh-2)",
          }}
        >
          <div style={{ position: "relative", flex: "none" }}>
            <Avatar name={liveStudent.name} color={liveStudent.color} size={52} />
            <span
              style={{ position: "absolute", bottom: -2, right: -2, width: 15, height: 15, borderRadius: 99, background: "var(--live)", border: "2px solid var(--ink)" }}
              className="live-dot"
            />
          </div>
          <div className="grow" style={{ minWidth: 0 }}>
            <div className="row" style={{ gap: 9 }}>
              <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase", color: "#FF8DA4" }}>
                ● Live session in progress
              </span>
            </div>
            <div className="row" style={{ gap: 10, marginTop: 5 }}>
              <b style={{ fontSize: 19, fontFamily: "var(--font-display)" }}>{liveStudent.name}</b>
              <SkillChip skill={liveSession.skill} level={liveSession.level} solid />
            </div>
            <div style={{ fontSize: 12.5, color: "rgba(255,255,255,.65)", marginTop: 3 }}>
              {liveSession.lesson} · {liveSession.time} Manila
            </div>
          </div>
          <a
            className="btn-zoom live"
            href={zoomLink}
            target="_blank"
            rel="noopener"
            onClick={(e) => e.stopPropagation()}
            style={{ textDecoration: "none", flex: "none" }}
          >
            <Icon n="zoom" size={16} /> Join Zoom
          </a>
        </div>
      ) : nextStudent && nextSession ? (
        <div className="card row" style={{ padding: "16px 20px", marginBottom: "var(--pad)", gap: 16 }}>
          <Avatar name={nextStudent.name} color={nextStudent.color} size={46} />
          <div className="grow">
            <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--ink-4)" }}>Up next</span>
            <div className="row" style={{ gap: 9, marginTop: 3 }}>
              <b style={{ fontSize: 16 }}>{nextStudent.name}</b>
              <SkillChip skill={nextSession.skill} level={nextSession.level} />
              <span className="muted" style={{ fontSize: 12.5 }}>
                {nextSession.time}
              </span>
            </div>
          </div>
        </div>
      ) : null}

      {/* KPIs */}
      <div className="kgrid" style={{ gridTemplateColumns: "repeat(4,1fr)", marginBottom: "var(--pad)" }}>
        {kpis.map((k, i) => (
          <div key={i} className={"card kpi" + (k.hot ? " hot" : "")}>
            <div className="kpi-ico" style={k.hot ? { background: "rgba(232,130,14,.18)", color: "#C26A09" } : { background: k.bg, color: k.tint }}>
              <Icon n={k.icon} size={18} />
            </div>
            <div>
              <div className="kpi-num">{k.num}</div>
              <div className="kpi-lbl">{k.lbl}</div>
            </div>
          </div>
        ))}
      </div>

      {/* two panels */}
      <div className="kgrid" style={{ gridTemplateColumns: "1.25fr 1fr", alignItems: "start" }}>
        {/* Today's sessions */}
        <div className="card">
          <div className="card-head">
            <h3>Today&apos;s sessions</h3>
            <span className="ch-sub">Manila time</span>
            <span className="spacer" />
            <button className="link" onClick={() => router.push("/schedule")}>
              Full schedule
            </button>
          </div>
          <div>
            {C.sessions.map((s) => {
              const st = C.byId(s.studentId)!;
              const live = s.status === "live";
              const done = s.status === "done";
              return (
                <div key={s.id} className="row" style={{ padding: "13px var(--pad)", borderBottom: "1px solid var(--line-2)", opacity: done ? 0.62 : 1 }}>
                  <div style={{ position: "relative" }}>
                    <Avatar name={st.name} color={st.color} size={42} />
                    {live && (
                      <span style={{ position: "absolute", bottom: -2, right: -2, width: 14, height: 14, borderRadius: 99, background: "var(--live)", border: "2px solid var(--surface)" }} />
                    )}
                  </div>
                  <div className="grow">
                    <div className="row" style={{ gap: 8 }}>
                      <b style={{ fontSize: 14.5 }}>{st.name}</b>
                      <SkillChip skill={s.skill} level={s.level} />
                    </div>
                    <div className="muted" style={{ fontSize: 12.5, marginTop: 2 }}>
                      {s.lesson}
                    </div>
                  </div>
                  <div style={{ textAlign: "right", marginRight: 4 }}>
                    <div className="tnum" style={{ fontWeight: 800, fontSize: 14 }}>
                      {s.time}
                    </div>
                    <div className="muted" style={{ fontSize: 11.5 }}>
                      {s.dur} min
                    </div>
                  </div>
                  {live ? (
                    <span className="status-tag" style={{ background: "var(--live-soft)", color: "var(--live)" }}>
                      <span className="live-dot" style={{ background: "var(--live)" }} /> Live now
                    </span>
                  ) : done ? (
                    <span className="status-tag st-mastered">
                      <Icon n="check" size={13} /> Done
                    </span>
                  ) : (
                    <span className="status-tag st-progress">Upcoming</span>
                  )}
                  {joinActive(s) && (
                    <a className={"btn-zoom sm" + (live ? " live" : "")} href={zoomLink} target="_blank" rel="noopener" style={{ textDecoration: "none", marginLeft: 4 }}>
                      <Icon n="zoom" size={14} /> Join
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Your tasks — marking + homework, priority-ordered */}
        <div className="col" style={{ gap: "var(--gap)" }}>
          <div className="card">
            <div className="card-head">
              <h3>Your tasks</h3>
              <span className="spacer" />
              <span className="chip" style={{ background: openTaskCount ? "var(--warn-soft)" : "var(--surface-3)", color: openTaskCount ? "#9A5806" : "var(--ink-3)" }}>
                {openTaskCount} open
              </span>
            </div>
            <div style={{ maxHeight: 560, overflowY: "auto" }}>
              {tasks.map((t, i) => {
                const st = C.byId(t.sid)!;
                if (t.kind === "mark") {
                  return (
                    <button
                      key={"mk" + i}
                      className="row task-row"
                      onClick={() => router.push(`/marking/${t.m.id}`)}
                      style={{ width: "100%", textAlign: "left", border: 0, background: "transparent", padding: "11px var(--pad)", borderBottom: "1px solid var(--line-2)", gap: 11, cursor: "pointer" }}
                    >
                      <Avatar name={st.name} color={st.color} size={34} />
                      <div className="grow" style={{ minWidth: 0 }}>
                        <div className="row" style={{ gap: 7 }}>
                          <b style={{ fontSize: 13.5 }}>{st.name}</b>
                          {t.m.aiReady && <AITag>AI ready</AITag>}
                        </div>
                        <div className="muted" style={{ fontSize: 12, marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {t.m.type} · “{t.m.title}”
                        </div>
                      </div>
                      <span className="status-tag" style={{ background: "var(--warn-soft)", color: "#9A5806" }}>
                        To mark
                      </span>
                    </button>
                  );
                }
                return (
                  <button
                    key={"hw" + i}
                    className="row task-row"
                    onClick={() => router.push(`/roster/${t.sid}`)}
                    style={{ width: "100%", textAlign: "left", border: 0, background: "transparent", padding: "11px var(--pad)", borderBottom: "1px solid var(--line-2)", gap: 11, cursor: "pointer", opacity: t.tag === "completed" ? 0.6 : 1 }}
                  >
                    <span className="task-skill" style={{ background: `var(--sk-${t.h.skill}-soft)`, color: `var(--sk-${t.h.skill})` }}>
                      <Icon n="doc" size={15} />
                    </span>
                    <div className="grow" style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.h.task}</div>
                      <div className="muted" style={{ fontSize: 11.5, marginTop: 1 }}>
                        {st.first} · {C.skillLabel(t.h.skill)} · due {t.h.due}
                      </div>
                    </div>
                    <StatusTag status={t.tag} />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
