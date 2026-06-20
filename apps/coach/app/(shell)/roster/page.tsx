"use client";
/* Screen 2 — Roster. Wired to the real backend: the coach's active roster
   (enrollments → students → profiles), RLS-scoped to the signed-in coach. */
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon, Avatar } from "@/components/Icon";
import { useSupabaseUser } from "@cueword/core/lib/auth-supabase";
import { getRoster, type RosterEntry } from "@/data/live";

const PALETTE = ["#2D7FF9", "#EC5A8D", "#11A974", "#EE9612", "#7C5CFC", "#06AFC4"];
const colorFor = (id: string) =>
  PALETTE[[...id].reduce((a, c) => a + c.charCodeAt(0), 0) % PALETTE.length];

export default function RosterPage() {
  const router = useRouter();
  const { user, ready } = useSupabaseUser();
  const [roster, setRoster] = useState<RosterEntry[] | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    getRoster(user.id)
      .then(setRoster)
      .catch(() => setRoster([]));
  }, [user?.id]);

  const loading = !ready || roster === null;
  const rows = roster ?? [];

  return (
    <div className="content-inner fade-up">
      <div className="row" style={{ marginBottom: "var(--pad)" }}>
        <div>
          <h1 className="page-title">Roster</h1>
          <p className="page-sub">{loading ? "Loading…" : `${rows.length} active students`}</p>
        </div>
        <span className="grow" />
        <button className="btn">
          <Icon n="filter" size={15} /> Grade
        </button>
        <button className="btn">
          <Icon n="search" size={15} /> Find student
        </button>
      </div>

      <div className="card" style={{ overflow: "hidden" }}>
        <table className="tbl">
          <thead>
            <tr>
              <th>Student</th>
              <th>Grade</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={3} className="muted" style={{ textAlign: "center", padding: 28 }}>
                  Loading roster…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={3} className="muted" style={{ textAlign: "center", padding: 28 }}>
                  No students assigned yet.
                </td>
              </tr>
            ) : (
              rows.map((s) => (
                <tr
                  key={s.studentId}
                  className="clickable"
                  onClick={() => router.push(`/roster/${s.studentId}`)}
                >
                  <td>
                    <div className="cell-student">
                      <Avatar name={s.name} color={colorFor(s.studentId)} size={34} />
                      <div>
                        <b>{s.name}</b>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="chip" style={{ background: "var(--surface-3)", color: "var(--ink-2)" }}>
                      {s.grade != null ? `G${s.grade}` : "—"}
                    </span>
                  </td>
                  <td>
                    <span className="status-tag st-progress">{s.status}</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
