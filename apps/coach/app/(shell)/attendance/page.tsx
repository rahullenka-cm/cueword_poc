"use client";
/* Screen — Attendance. Wired to the real backend: per-student rates from
   v_attendance_rate over the coach's active roster (RLS-scoped). The per-session
   history strip is omitted (the rate view doesn't carry the raw log). */
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon, Avatar } from "@/components/Icon";
import { useSupabaseUser } from "@cueword/core/lib/auth-supabase";
import { getRoster, getAttendanceRates, type RosterEntry, type AttendanceRate } from "@/data/live";

const PALETTE = ["#2D7FF9", "#EC5A8D", "#11A974", "#EE9612", "#7C5CFC", "#06AFC4"];
const colorFor = (id: string) =>
  PALETTE[[...id].reduce((a, c) => a + c.charCodeAt(0), 0) % PALETTE.length];

interface Row extends RosterEntry {
  att: AttendanceRate | null;
}

export default function AttendancePage() {
  const router = useRouter();
  const { user, ready } = useSupabaseUser();
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const roster = await getRoster(user.id);
      const rates = await getAttendanceRates(roster.map((r) => r.studentId));
      const byId = new Map(rates.map((a) => [a.studentId, a]));
      setRows(roster.map((r) => ({ ...r, att: byId.get(r.studentId) ?? null })));
    })().catch(() => setRows([]));
  }, [user?.id]);

  const loading = !ready || rows === null;
  const data = rows ?? [];

  const totals = data.reduce(
    (acc, { att }) => {
      acc.present += att?.presentCount ?? 0;
      acc.late += att?.lateCount ?? 0;
      acc.absent += att?.absentCount ?? 0;
      acc.total += att?.totalMarked ?? 0;
      return acc;
    },
    { present: 0, late: 0, absent: 0, total: 0 },
  );
  const overall = totals.total > 0 ? Math.round(((totals.present + totals.late) / totals.total) * 100) : 0;
  const pct = (a: AttendanceRate | null) =>
    a && a.attendanceRate != null ? Math.round(a.attendanceRate * 100) : null;

  const kpis = [
    { num: overall + "%", lbl: "Attendance · this term", tint: "var(--brand)", bg: "var(--brand-soft)", icon: "userCheck" },
    { num: totals.present, lbl: "Present", tint: "var(--brand)", bg: "var(--brand-soft)", icon: "check" },
    { num: totals.late, lbl: "Late arrivals", tint: "var(--warn)", bg: "var(--warn-soft)", icon: "clock" },
    { num: totals.absent, lbl: "Absences", tint: "var(--live)", bg: "var(--live-soft)", icon: "warn" },
  ];

  return (
    <div className="content-inner fade-up">
      <div className="row" style={{ marginBottom: 14, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 className="page-title">Attendance</h1>
          <p className="page-sub">{loading ? "Loading…" : "Every student's session attendance"}</p>
        </div>
      </div>

      <div className="kgrid" style={{ gridTemplateColumns: "repeat(4,1fr)", marginBottom: "var(--gap)" }}>
        {kpis.map((k, i) => (
          <div key={i} className="card kpi">
            <div className="kpi-ico" style={{ background: k.bg, color: k.tint }}>
              <Icon n={k.icon} size={18} />
            </div>
            <div>
              <div className="kpi-num">{k.num}</div>
              <div className="kpi-lbl">{k.lbl}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-head">
          <h3>Student records</h3>
        </div>
        <table className="tbl">
          <thead>
            <tr>
              <th>Student</th>
              <th>Grade</th>
              <th style={{ width: "40%" }}>Rate</th>
              <th style={{ textAlign: "right" }}>P / L / A</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="muted" style={{ textAlign: "center", padding: 28 }}>
                  Loading attendance…
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={4} className="muted" style={{ textAlign: "center", padding: 28 }}>
                  No students yet.
                </td>
              </tr>
            ) : (
              data.map(({ studentId, name, grade, att }) => {
                const rate = pct(att);
                const color = rate == null ? "var(--ink-4)" : rate >= 95 ? "var(--brand)" : rate >= 85 ? "var(--warn)" : "var(--live)";
                return (
                  <tr key={studentId} className="clickable" onClick={() => router.push(`/roster/${studentId}`)}>
                    <td>
                      <div className="cell-student">
                        <Avatar name={name} color={colorFor(studentId)} size={32} />
                        <b>{name}</b>
                      </div>
                    </td>
                    <td>
                      <span className="chip" style={{ background: "var(--surface-3)", color: "var(--ink-2)" }}>
                        {grade != null ? `G${grade}` : "—"}
                      </span>
                    </td>
                    <td>
                      <div className="row" style={{ gap: 9 }}>
                        <b className="tnum" style={{ width: 40, color }}>{rate == null ? "—" : `${rate}%`}</b>
                        <span className="grow" style={{ maxWidth: 180 }}>
                          <div className="bar">
                            <i style={{ width: (rate ?? 0) + "%", background: color }} />
                          </div>
                        </span>
                      </div>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <span className="tnum" style={{ fontSize: 12.5 }}>
                        <b style={{ color: "var(--brand-ink)" }}>{att?.presentCount ?? 0}</b> <span className="muted">/</span>{" "}
                        <b style={{ color: "var(--warn)" }}>{att?.lateCount ?? 0}</b> <span className="muted">/</span>{" "}
                        <b style={{ color: "var(--live)" }}>{att?.absentCount ?? 0}</b>
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
