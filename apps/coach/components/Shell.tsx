"use client";
/* App shell: icon rail, contextual sidebar, top bar — ported from the
   prototype's app/shell.jsx + the routing/sidebar logic in app/app.jsx.
   Route state is derived from usePathname()/useParams() instead of React state;
   go(route, ctx) maps to router.push(). The live pulse, login gate, and logout
   are the real dynamic seams wired to @cueword/core. */
import { createContext, Fragment, Suspense, useContext, useEffect, useState, type ReactNode } from "react";
import { usePathname, useParams, useRouter, useSearchParams } from "next/navigation";
import { Icon, Avatar } from "@/components/Icon";
import { CW } from "@/data/coachData";
import SetupNotice from "@cueword/core/components/SetupNotice";
import { useActiveSession } from "@cueword/core/components/useActiveSession";
import { isSupabaseConfigured } from "@cueword/core/lib/supabase/client";
import { signOut, useSupabaseUser } from "@cueword/core/lib/auth-supabase";
import type { ClassSession } from "@cueword/core/lib/types";

/* The Shell owns the ONE useActiveSession() subscription and shares it via
   context, so screens (e.g. the Dashboard live hero) can read the real session
   without opening a second Realtime channel on the same topic (which Supabase
   rejects: "cannot add postgres_changes callbacks ... after subscribed"). */
const SessionCtx = createContext<{ session: ClassSession | null; liveActive: boolean }>({
  session: null,
  liveActive: false,
});
export function useLiveSession() {
  return useContext(SessionCtx);
}

/* ------------------------------------------------------------------ *
 * Route model — translate the App Router pathname into the prototype's
 * (route, ctx) pair so the ported shell/sidebar logic works unchanged.
 * ------------------------------------------------------------------ */
export type RouteKey =
  | "dashboard"
  | "roster"
  | "student"
  | "schedule"
  | "curriculum"
  | "attendance"
  | "profile"
  | "marking"
  | "marking-item"
  | "comms"
  | "live";

interface Ctx {
  id?: string;
  section?: string;
}

function useRoute(): { route: RouteKey; ctx: Ctx } {
  const pathname = usePathname();
  const params = useParams<{ id?: string }>();
  const search = useSearchParams();
  const id = params?.id;
  const section = search.get("section") || undefined;

  if (pathname === "/" || pathname === "") return { route: "dashboard", ctx: {} };
  if (pathname.startsWith("/roster/")) return { route: "student", ctx: { id } };
  if (pathname.startsWith("/roster")) return { route: "roster", ctx: {} };
  if (pathname.startsWith("/schedule")) return { route: "schedule", ctx: {} };
  if (pathname.startsWith("/curriculum")) return { route: "curriculum", ctx: {} };
  if (pathname.startsWith("/attendance")) return { route: "attendance", ctx: {} };
  if (pathname.startsWith("/profile")) return { route: "profile", ctx: { section } };
  if (pathname.startsWith("/marking/")) return { route: "marking-item", ctx: { id } };
  if (pathname.startsWith("/marking")) return { route: "marking", ctx: {} };
  if (pathname.startsWith("/comms")) return { route: "comms", ctx: {} };
  if (pathname.startsWith("/live")) return { route: "live", ctx: {} };
  return { route: "dashboard", ctx: {} };
}

/* go(route, ctx) → router.push() — the prototype's navigation primitive. */
function useGo() {
  const router = useRouter();
  return (r: RouteKey, c: Ctx = {}) => {
    switch (r) {
      case "dashboard":
        router.push("/");
        break;
      case "roster":
        router.push("/roster");
        break;
      case "student":
        router.push(`/roster/${c.id}`);
        break;
      case "schedule":
        router.push("/schedule");
        break;
      case "curriculum":
        router.push("/curriculum");
        break;
      case "attendance":
        router.push("/attendance");
        break;
      case "profile":
        router.push(c.section ? `/profile?section=${c.section}` : "/profile");
        break;
      case "marking":
        router.push("/marking");
        break;
      case "marking-item":
        router.push(`/marking/${c.id}`);
        break;
      case "comms":
        router.push("/comms");
        break;
      case "live":
        router.push("/live");
        break;
    }
  };
}

type Go = ReturnType<typeof useGo>;

/* ------------------------------------------------------------------ *
 * Icon rail
 * ------------------------------------------------------------------ */
const NAV: { key: RouteKey; label: string; icon: string; badge?: boolean }[] = [
  { key: "dashboard", label: "Dashboard", icon: "dashboard" },
  { key: "roster", label: "Roster", icon: "roster" },
  { key: "schedule", label: "Schedule", icon: "schedule" },
  { key: "attendance", label: "Attendance", icon: "userCheck" },
  { key: "curriculum", label: "Curriculum", icon: "curriculum" },
  { key: "marking", label: "Marking", icon: "marking", badge: true },
  { key: "comms", label: "Comms", icon: "comms" },
];

function IconRail({
  route,
  go,
  liveActive,
  pendingMarks,
}: {
  route: RouteKey;
  go: Go;
  liveActive: boolean;
  pendingMarks: number;
}) {
  const C = CW;
  const isRoute = (k: RouteKey) =>
    route === k ||
    (k === "roster" && route === "student") ||
    (k === "marking" && route === "marking-item");
  return (
    <nav className="rail">
      <button className="rail-logo" onClick={() => go("dashboard")} title="Cueword">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4.5 16.5c-1.5 1.5-2 5-2 5s3.5-.5 5-2c.9-.85 1.5-2 1.5-2L8 13.5s-1.1.6-2 1z" />
          <path d="M14.5 9.5 12 12M21.5 2.5c0 5-3 9.5-7 12l-4-4c2.5-4 7-7 11-8z" />
          <circle cx="15" cy="9" r="1.4" fill="#fff" stroke="none" />
        </svg>
        <span className="rail-wordmark">Cueword</span>
      </button>

      <div className="rail-items">
        {NAV.map((n) => (
          <button key={n.key} className={"rail-btn" + (isRoute(n.key) ? " active" : "")} onClick={() => go(n.key)} title={n.label}>
            <Icon n={n.icon} />
            <span className="rail-label">{n.label}</span>
            {n.badge && pendingMarks > 0 && <span className="rail-badge">{pendingMarks}</span>}
          </button>
        ))}
      </div>

      <div className="rail-spacer" />
      <div className="rail-divider" />

      <button
        className={"rail-live" + (liveActive ? " live" : "") + (route === "live" ? " active-route" : "")}
        onClick={() => go("live")}
        title={liveActive ? "Live session in progress" : "Live class"}
      >
        {liveActive ? <span className="live-dot" /> : <Icon n="live" />}
        <span className="rail-live-txt">{liveActive ? "Live now" : "Live class"}</span>
      </button>

      <button
        className={"rail-avatar" + (route === "profile" ? " active-route" : "")}
        title={C.coach.name + " · Profile & settings"}
        onClick={() => go("profile")}
      >
        {C.coach.initials}
        <span className="rail-av-meta">
          <b>{C.coach.name}</b>
          <span>{C.coach.role}</span>
        </span>
      </button>
    </nav>
  );
}

/* ------------------------------------------------------------------ *
 * Contextual sidebar
 * ------------------------------------------------------------------ */
function ContextSidebar({ route, ctx, go }: { route: RouteKey; ctx: Ctx; go: Go }) {
  const C = CW;

  if (route === "dashboard") {
    const today = C.sessions;
    return (
      <aside className="side">
        <div className="side-head">
          <div className="side-eyebrow">Today</div>
          <h2 className="side-title">Wed · Jun 10</h2>
        </div>
        <div className="side-body">
          <div className="side-group-label">Sessions ({today.length})</div>
          {today.map((s) => {
            const st = C.byId(s.studentId)!;
            return (
              <button
                key={s.id}
                className={"side-item" + (s.status === "live" ? " active" : "")}
                onClick={() => (s.status === "live" ? go("live") : go("student", { id: s.studentId }))}
              >
                <Avatar name={st.name} color={st.color} size={30} />
                <div className="si-main">
                  <div className="si-title">{st.name}</div>
                  <div className="si-sub">
                    {C.skillLabel(s.skill)} {s.level} · {s.time}
                  </div>
                </div>
                {s.status === "live" ? (
                  <span className="chip" style={{ background: "var(--live-soft)", color: "var(--live)", fontSize: 10 }}>
                    LIVE
                  </span>
                ) : (
                  <span className="si-trail">{s.status === "done" ? "✓" : ""}</span>
                )}
              </button>
            );
          })}
          <div className="side-group-label">To mark ({C.submissions.length})</div>
          {C.submissions.map((m) => {
            const st = C.byId(m.studentId)!;
            return (
              <button key={m.id} className="side-item" onClick={() => go("marking-item", { id: m.id })}>
                <Avatar name={st.name} color={st.color} size={30} />
                <div className="si-main">
                  <div className="si-title">{st.name}</div>
                  <div className="si-sub">{m.type}</div>
                </div>
                {m.aiReady && (
                  <span className="ai-tag" style={{ padding: "2px 6px 2px 4px", fontSize: 9.5 }}>
                    <span className="spark">
                      <Icon n="spark" size={8} />
                    </span>
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </aside>
    );
  }

  if (route === "roster" || route === "student") {
    const byGrade = [3, 4, 5].map((g) => ({ g, list: C.students.filter((s) => s.grade === g) }));
    return (
      <aside className="side">
        <div className="side-head">
          <div className="side-eyebrow">All students</div>
          <h2 className="side-title">Roster</h2>
        </div>
        <div className="side-body">
          {byGrade.map(({ g, list }) => (
            <Fragment key={g}>
              <div className="side-group-label">Grade {g}</div>
              {list.map((s) => (
                <button
                  key={s.id}
                  className={"side-item" + (ctx && ctx.id === s.id ? " active" : "")}
                  onClick={() => go("student", { id: s.id })}
                >
                  <Avatar name={s.name} color={s.color} size={30} />
                  <div className="si-main">
                    <div className="si-title">{s.name}</div>
                    <div className="si-sub">
                      Term {s.term} · {s.nextShort}
                    </div>
                  </div>
                </button>
              ))}
            </Fragment>
          ))}
        </div>
      </aside>
    );
  }

  if (route === "marking" || route === "marking-item") {
    return (
      <aside className="side">
        <div className="side-head">
          <div className="side-eyebrow">Queue</div>
          <h2 className="side-title">To mark</h2>
        </div>
        <div className="side-body">
          <div className="side-group-label">Pending ({C.submissions.length})</div>
          {C.submissions.map((m) => {
            const st = C.byId(m.studentId)!;
            return (
              <button
                key={m.id}
                className={"side-item" + (ctx && ctx.id === m.id ? " active" : "")}
                onClick={() => go("marking-item", { id: m.id })}
              >
                <Avatar name={st.name} color={st.color} size={30} />
                <div className="si-main">
                  <div className="si-title">{st.name}</div>
                  <div className="si-sub">
                    {m.type} · {m.date}
                  </div>
                </div>
                {m.aiReady && (
                  <span className="ai-tag" style={{ padding: "2px 6px 2px 4px", fontSize: 9.5 }}>
                    <span className="spark">
                      <Icon n="spark" size={8} />
                    </span>
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </aside>
    );
  }

  if (route === "schedule") {
    return (
      <aside className="side">
        <div className="side-head">
          <div className="side-eyebrow">This week</div>
          <h2 className="side-title">Schedule</h2>
        </div>
        <div className="side-body">
          <div className="side-group-label">Today · 4 sessions</div>
          {C.sessions.map((s) => {
            const st = C.byId(s.studentId)!;
            return (
              <button key={s.id} className="side-item" onClick={() => go("student", { id: s.studentId })}>
                <span className="chip-dot" style={{ width: 9, height: 9, background: `var(--sk-${s.skill})` }} />
                <div className="si-main">
                  <div className="si-title">{st.name}</div>
                  <div className="si-sub">
                    {C.skillLabel(s.skill)} · {s.time}
                  </div>
                </div>
              </button>
            );
          })}
          <div className="side-group-label">Week stats</div>
          <div style={{ padding: "4px 8px", display: "flex", flexDirection: "column", gap: 9 }}>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <span className="muted">Sessions</span>
              <b>22</b>
            </div>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <span className="muted">Students</span>
              <b>6</b>
            </div>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <span className="muted">Attendance</span>
              <b style={{ color: "var(--brand-ink)" }}>96%</b>
            </div>
          </div>
        </div>
      </aside>
    );
  }

  if (route === "comms") {
    return (
      <aside className="side">
        <div className="side-head">
          <div className="side-eyebrow">Parents</div>
          <h2 className="side-title">Comms</h2>
        </div>
        <div className="side-body">
          <div className="side-group-label">Recent touches</div>
          {C.comms.map((m) => {
            const st = C.byId(m.studentId)!;
            return (
              <div key={m.studentId} className="side-item" style={{ cursor: "default" }}>
                <Avatar name={st.name} color={st.color} size={30} />
                <div className="si-main">
                  <div className="si-title">{st.parent}</div>
                  <div className="si-sub">
                    {m.method} · {m.last}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </aside>
    );
  }

  if (route === "attendance") {
    const flagged = C.students
      .map((s) => ({ s, r: C.attendance[s.id].rate }))
      .filter((x) => x.r < 95)
      .sort((a, b) => a.r - b.r);
    return (
      <aside className="side">
        <div className="side-head">
          <div className="side-eyebrow">Term 1</div>
          <h2 className="side-title">Attendance</h2>
        </div>
        <div className="side-body">
          <div className="side-group-label">Below 95%</div>
          {flagged.length === 0 && (
            <div className="side-item" style={{ cursor: "default", color: "var(--ink-3)", fontSize: 12.5 }}>
              All students above 95% 🎉
            </div>
          )}
          {flagged.map(({ s, r }) => (
            <button key={s.id} className="side-item" onClick={() => go("student", { id: s.id })}>
              <Avatar name={s.name} color={s.color} size={30} />
              <div className="si-main">
                <div className="si-title">{s.name}</div>
                <div className="si-sub">Grade {s.grade}</div>
              </div>
              <span className="si-trail" style={{ color: r >= 90 ? "var(--warn)" : "var(--live)" }}>
                {r}%
              </span>
            </button>
          ))}
        </div>
      </aside>
    );
  }

  if (route === "profile") {
    const sec = (ctx && ctx.section) || "profile";
    const items: [string, string, string][] = [
      ["profile", "Profile", "roster"],
      ["preferences", "Preferences", "gear"],
      ["account", "Account", "shield"],
    ];
    return (
      <aside className="side">
        <div className="side-head">
          <div className="side-eyebrow">Account</div>
          <h2 className="side-title">Settings</h2>
        </div>
        <div className="side-body">
          <div className="side-group-label">Sections</div>
          {items.map(([key, label, ico]) => (
            <button key={key} className={"side-item" + (sec === key ? " active" : "")} onClick={() => go("profile", { section: key })}>
              <span className="chip-dot" style={{ width: 0, height: 0 }} />
              <Icon n={ico} size={16} style={{ color: sec === key ? "var(--brand-ink)" : "var(--ink-3)" }} />
              <div className="si-main">
                <div className="si-title">{label}</div>
              </div>
            </button>
          ))}
          <div className="side-group-label">Signed in as</div>
          <div className="side-item" style={{ cursor: "default" }}>
            <Avatar name={C.coach.name} color={C.coach.color} size={30} />
            <div className="si-main">
              <div className="si-title">{C.coach.name}</div>
              <div className="si-sub">{C.coach.email}</div>
            </div>
          </div>
        </div>
      </aside>
    );
  }

  return <aside className="side" />;
}

/* ------------------------------------------------------------------ *
 * Top bar + Manila clock
 * ------------------------------------------------------------------ */
function useManilaClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const date = now.toLocaleDateString("en-US", { timeZone: "Asia/Manila", weekday: "short", month: "short", day: "numeric" });
  const time = now.toLocaleTimeString("en-US", { timeZone: "Asia/Manila", hour: "numeric", minute: "2-digit", hour12: true });
  return { date, time };
}

interface Crumb {
  label: string;
  go?: () => void;
}

function TopBar({
  crumbs,
  canCollapse,
  collapsed,
  onToggleSide,
  onLogout,
}: {
  crumbs: Crumb[];
  canCollapse: boolean;
  collapsed: boolean;
  onToggleSide: () => void;
  onLogout: () => void;
}) {
  const { date, time } = useManilaClock();
  return (
    <header className="topbar">
      {canCollapse && (
        <button className="side-toggle" onClick={onToggleSide} title={collapsed ? "Show panel" : "Hide panel"}>
          <Icon n={collapsed ? "chevR" : "chevL"} size={17} />
        </button>
      )}
      <div className="crumb">
        {crumbs.map((c, i) => (
          <Fragment key={i}>
            {i > 0 && (
              <span className="sep">
                <Icon n="chevR" size={13} />
              </span>
            )}
            {c.go ? (
              <button className="crumb-link" onClick={c.go}>
                {c.label}
              </button>
            ) : (
              <b>{c.label}</b>
            )}
          </Fragment>
        ))}
      </div>

      <div className="topbar-center">
        <div className="clock">
          <Icon n="clock" size={15} /> Manila <b>{time}</b> · {date}
        </div>
        <div className="tz-pill" title="Students are in US timezones — always confirm local time before joining.">
          <Icon n="warn" size={14} /> Students in US time
        </div>
      </div>

      <div className="topbar-right">
        <div className="row" style={{ gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: 99, background: "var(--brand)" }} />
          <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--ink-2)" }}>Coach view</span>
        </div>
        <button className="btn ghost sm" onClick={onLogout} title="Log out">
          <Icon n="logout" size={16} /> Log out
        </button>
      </div>
    </header>
  );
}

/* ------------------------------------------------------------------ *
 * Breadcrumbs — ported crumbMap from app/app.jsx.
 * ------------------------------------------------------------------ */
function buildCrumbs(route: RouteKey, ctx: Ctx, go: Go): Crumb[] {
  const C = CW;
  switch (route) {
    case "dashboard":
      return [{ label: "Dashboard" }];
    case "roster":
      return [{ label: "Roster" }];
    case "student":
      return ctx.id
        ? [{ label: "Roster", go: () => go("roster") }, { label: (C.byId(ctx.id) || ({} as { name?: string })).name || "" }]
        : [{ label: "Student" }];
    case "schedule":
      return [{ label: "Schedule" }];
    case "curriculum":
      return [{ label: "Curriculum" }];
    case "attendance":
      return [{ label: "Attendance" }];
    case "profile":
      return [{ label: "Settings" }, { label: ctx.section ? ctx.section[0].toUpperCase() + ctx.section.slice(1) : "Profile" }];
    case "marking":
      return [{ label: "Marking" }];
    case "marking-item": {
      const m = ctx.id ? C.submissions.find((x) => x.id === ctx.id) : undefined;
      if (!m) return [{ label: "Marking", go: () => go("marking") }];
      const s = C.byId(m.studentId);
      return [
        { label: "Marking", go: () => go("marking") },
        { label: C.skillLabel(m.skill) },
        { label: s ? s.name : "" },
      ];
    }
    case "comms":
      return [{ label: "Parent comms" }];
    case "live":
      return [{ label: "Live class" }];
    default:
      return [{ label: "" }];
  }
}

// routes that get a contextual sidebar (the rest are full-width).
// CONTEXT.md §5 + the task constraint list roster/student/schedule/attendance/
// profile, so roster is included here (the prototype's ContextSidebar already
// ships a roster branch; app.jsx's literal array happened to omit it).
const SIDEBAR_ROUTES: RouteKey[] = ["roster", "student", "schedule", "attendance", "profile"];

/* ------------------------------------------------------------------ *
 * Shell — wraps every screen. Login-gated; drives the live pulse from
 * the real session. ShellInner reads useSearchParams()/useParams(), so the
 * default export wraps it in a Suspense boundary (required for static
 * prerendering in Next 16).
 * ------------------------------------------------------------------ */
export default function Shell({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<div className="cw-today">Loading…</div>}>
      <ShellInner>{children}</ShellInner>
    </Suspense>
  );
}

function ShellInner({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { route, ctx } = useRoute();
  const go = useGo();
  const { user, ready } = useSupabaseUser();
  const { session } = useActiveSession();
  const [sideCollapsed, setSideCollapsed] = useState(false);

  // Gate the app on a logged-in coach (done once, here in the Shell).
  useEffect(() => {
    if (ready && (!user || user.role !== "coach")) router.replace("/login");
  }, [ready, user, router]);

  const onLogout = () => {
    void signOut().finally(() => router.replace("/login"));
  };

  // Drive the live pulse from the REAL session (not the mockup's hardcoded true).
  const liveActive = session?.status === "live";
  const pendingMarks = CW.submissions.length;

  const routeHasSide = SIDEBAR_ROUTES.includes(route);
  const showSide = routeHasSide && !sideCollapsed;
  const crumbs = buildCrumbs(route, ctx, go);

  if (!isSupabaseConfigured) return <SetupNotice />;
  if (!ready) return <div className="cw-today">Loading…</div>;
  if (!user || user.role !== "coach") return null; // redirecting to /login

  return (
    <SessionCtx.Provider value={{ session, liveActive }}>
      <div className="app" data-rail="icons" data-density="regular" data-side={showSide ? "on" : "off"}>
        <IconRail route={route} go={go} liveActive={liveActive} pendingMarks={pendingMarks} />
        {showSide && <ContextSidebar route={route} ctx={ctx} go={go} />}
        <div className="main">
          <TopBar
            crumbs={crumbs}
            canCollapse={routeHasSide}
            collapsed={sideCollapsed}
            onToggleSide={() => setSideCollapsed((c) => !c)}
            onLogout={onLogout}
          />
          <div className="content">{children}</div>
        </div>
      </div>
    </SessionCtx.Provider>
  );
}
