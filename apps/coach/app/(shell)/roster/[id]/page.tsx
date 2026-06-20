"use client";
/* Screen 3 — Student detail. Wired to the real backend: students + skill_trackers
   + attendance (v_attendance_rate), RLS-scoped to this coach's students. */
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Icon, Avatar } from "@/components/Icon";
import { getStudentDetail, type StudentDetail } from "@/data/live";

const PALETTE = ["#2D7FF9", "#EC5A8D", "#11A974", "#EE9612", "#7C5CFC", "#06AFC4"];
const colorFor = (id: string) =>
  PALETTE[[...id].reduce((a, c) => a + c.charCodeAt(0), 0) % PALETTE.length];

const SKILL_LABEL: Record<string, string> = {
  listen: "Listening", read: "Reading", vocab: "Vocabulary", speak: "Speaking", write: "Writing",
};

export default function StudentDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [d, setD] = useState<StudentDetail | null | undefined>(undefined);

  useEffect(() => {
    if (!id) return;
    getStudentDetail(id)
      .then((r) => setD(r))
      .catch(() => setD(null));
  }, [id]);

  if (d === undefined) {
    return (
      <div className="content-inner fade-up">
        <div className="card card-pad muted" style={{ textAlign: "center", padding: 28 }}>Loading student…</div>
      </div>
    );
  }

  if (d === null) {
    return (
      <div className="content-inner fade-up">
        <button className="btn ghost sm" onClick={() => router.push("/roster")}>
          <Icon n="back" size={16} /> Roster
        </button>
        <p className="page-sub" style={{ marginTop: 16 }}>Student not found.</p>
      </div>
    );
  }

  const att = d.attendance;

  return (
    <div className="content-inner fade-up">
      {/* header */}
      <div className="row" style={{ marginBottom: "var(--pad)", alignItems: "flex-start" }}>
        <button className="btn ghost sm" onClick={() => router.push("/roster")} style={{ marginTop: 4 }}>
          <Icon n="back" size={16} />
        </button>
        <Avatar name={d.name} color={colorFor(d.studentId)} size={56} />
        <div className="grow">
          <h1 className="page-title" style={{ fontSize: 24 }}>{d.name}</h1>
          <p className="page-sub">
            {d.grade != null ? `Grade ${d.grade}` : "Grade —"} · {d.status}
          </p>
        </div>
        <button className="btn" onClick={() => router.push("/comms")}>
          <Icon n="comms" size={16} /> Message parent
        </button>
      </div>

      <div className="kgrid" style={{ gridTemplateColumns: "1fr 1fr", alignItems: "start" }}>
        {/* skill trackers */}
        <div className="card">
          <div className="card-head">
            <h3>Skill trackers</h3>
            <span className="spacer" />
            <span className="ch-sub muted">{d.skills.length} tracked</span>
          </div>
          <table className="tbl">
            <thead>
              <tr><th>Skill</th><th>Rating</th><th>Status</th></tr>
            </thead>
            <tbody>
              {d.skills.length === 0 ? (
                <tr><td colSpan={3} className="muted" style={{ textAlign: "center", padding: 22 }}>No skill data yet.</td></tr>
              ) : (
                d.skills.map((sk) => (
                  <tr key={sk.skill}>
                    <td><b style={{ fontSize: 13 }}>{SKILL_LABEL[sk.skill] ?? sk.skill}</b></td>
                    <td>
                      {sk.rating == null ? <span className="muted">—</span> : (
                        <div className="row" style={{ gap: 7 }}>
                          <b className="tnum" style={{ width: 30 }}>{sk.rating}</b>
                          <span style={{ width: 64 }}>
                            <div className="bar"><i style={{ width: `${Math.min(100, sk.rating)}%`, background: "var(--brand)" }} /></div>
                          </span>
                        </div>
                      )}
                    </td>
                    <td><span className="chip" style={{ background: "var(--surface-3)", color: "var(--ink-2)" }}>{sk.status}</span></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* attendance */}
        <div className="card">
          <div className="card-head"><h3>Attendance</h3></div>
          <div className="card-pad">
            {!att || att.totalMarked === 0 ? (
              <p className="muted" style={{ textAlign: "center", padding: 18 }}>No attendance marked yet.</p>
            ) : (
              <>
                <div className="row" style={{ alignItems: "baseline", gap: 8, marginBottom: 14 }}>
                  <span style={{ fontFamily: "var(--font-display)", fontSize: 34, fontWeight: 700, color: "var(--brand-ink)" }}>
                    {Math.round((att.attendanceRate ?? 0) * 100)}%
                  </span>
                  <span className="muted" style={{ fontSize: 12.5 }}>across {att.totalMarked} marked sessions</span>
                </div>
                <div className="row" style={{ gap: 10 }}>
                  {([
                    ["Present", att.presentCount, "var(--brand-ink)"],
                    ["Late", att.lateCount, "var(--warn)"],
                    ["Absent", att.absentCount, "var(--live)"],
                  ] as [string, number, string][]).map(([l, v, c]) => (
                    <div key={l} className="grow card-pad" style={{ border: "1px solid var(--line-2)", borderRadius: "var(--r-md)", padding: 12 }}>
                      <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700, color: c }}>{v}</div>
                      <div className="muted" style={{ fontSize: 12 }}>{l}</div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
