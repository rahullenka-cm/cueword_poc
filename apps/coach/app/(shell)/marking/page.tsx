"use client";
/* Screen 6 — Marking queue. Wired to the real backend: submissions awaiting
   coach action (status submitted | ai_scored) across the coach's roster. */
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar, AITag } from "@/components/Icon";
import { useSupabaseUser } from "@cueword/core/lib/auth-supabase";
import { getRoster, getMarkingQueue, type MarkingItem } from "@/data/live";

const PALETTE = ["#2D7FF9", "#EC5A8D", "#11A974", "#EE9612", "#7C5CFC", "#06AFC4"];
const colorFor = (id: string) =>
  PALETTE[[...id].reduce((a, c) => a + c.charCodeAt(0), 0) % PALETTE.length];

export default function MarkingPage() {
  const router = useRouter();
  const { user, ready } = useSupabaseUser();
  const [items, setItems] = useState<MarkingItem[] | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const roster = await getRoster(user.id);
      const q = await getMarkingQueue(roster.map((r) => r.studentId));
      setItems(q);
    })().catch(() => setItems([]));
  }, [user?.id]);

  const loading = !ready || items === null;
  const rows = items ?? [];

  return (
    <div className="content-inner fade-up">
      <h1 className="page-title">Marking</h1>
      <p className="page-sub">
        {loading ? "Loading…" : `${rows.length} items awaiting your review · AI has pre-scored the ready ones`}
      </p>
      <div className="card" style={{ marginTop: "var(--pad)", overflow: "hidden" }}>
        <table className="tbl">
          <thead>
            <tr>
              <th>Student</th>
              <th>Artifact</th>
              <th>Story</th>
              <th>Submitted</th>
              <th></th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="muted" style={{ textAlign: "center", padding: 28 }}>Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={6} className="muted" style={{ textAlign: "center", padding: 28 }}>Nothing to mark right now.</td></tr>
            ) : (
              rows.map((m) => (
                <tr key={m.id} className="clickable" onClick={() => router.push(`/marking/${m.id}`)}>
                  <td>
                    <div className="cell-student">
                      <Avatar name={m.studentName} color={colorFor(m.studentId)} size={32} />
                      <b>{m.studentName}</b>
                    </div>
                  </td>
                  <td>
                    <div className="row" style={{ gap: 8 }}>
                      <span className="chip" style={{ background: "var(--surface-3)", color: "var(--ink-2)" }}>
                        {m.skill ?? m.type}
                      </span>
                      <span style={{ fontSize: 12.5 }}>{m.type === "spoken" ? "Spoken" : "Written"} piece</span>
                    </div>
                  </td>
                  <td className="muted" style={{ fontSize: 12.5 }}>{m.storyTitle ?? "—"}</td>
                  <td className="muted tnum" style={{ fontSize: 12.5 }}>{new Date(m.createdAt).toLocaleDateString()}</td>
                  <td>
                    {m.status === "ai_scored" ? <AITag>AI ready</AITag> : <span className="muted" style={{ fontSize: 12 }}>Needs scoring</span>}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <button className="link">Review</button>
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
