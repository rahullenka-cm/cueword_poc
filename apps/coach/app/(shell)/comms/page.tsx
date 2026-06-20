"use client";
/* Screen 7 — Parent comms. Wired to the real backend: the coach's logged
   parent_comms touches (RLS-scoped). WhatsApp/Email are external stubs. */
import { useEffect, useState } from "react";
import { Icon, Avatar } from "@/components/Icon";
import { useSupabaseUser } from "@cueword/core/lib/auth-supabase";
import { getParentComms, type ParentComm } from "@/data/live";

const PALETTE = ["#2D7FF9", "#EC5A8D", "#11A974", "#EE9612", "#7C5CFC", "#06AFC4"];
const colorFor = (id: string) =>
  PALETTE[[...id].reduce((a, c) => a + c.charCodeAt(0), 0) % PALETTE.length];

const TEMPLATES = ["Progress update", "Homework reminder", "Session reschedule", "Level completed"];

export default function CommsPage() {
  const { user, ready } = useSupabaseUser();
  const [log, setLog] = useState<ParentComm[] | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    getParentComms(user.id)
      .then(setLog)
      .catch(() => setLog([]));
  }, [user?.id]);

  const loading = !ready || log === null;
  const rows = log ?? [];

  return (
    <div className="content-inner fade-up">
      <div style={{ marginBottom: 14 }}>
        <h1 className="page-title">Parent comms</h1>
        <p className="page-sub">Messages are sent externally via WhatsApp or email — every touch is logged here for your records.</p>
      </div>

      <div className="card card-pad" style={{ marginBottom: "var(--gap)" }}>
        <div className="row" style={{ marginBottom: 11 }}>
          <span className="muted" style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: ".05em", textTransform: "uppercase" }}>
            Quick templates
          </span>
        </div>
        <div className="row" style={{ flexWrap: "wrap", gap: 9 }}>
          {TEMPLATES.map((t) => (
            <button key={t} className="btn" style={{ borderRadius: "var(--r-pill)" }}>
              <span style={{ width: 7, height: 7, borderRadius: 99, background: "var(--brand)" }} />
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="card" style={{ overflow: "hidden" }}>
        <table className="tbl">
          <thead>
            <tr>
              <th>Student</th>
              <th>Note</th>
              <th>Last contact</th>
              <th>Template</th>
              <th style={{ textAlign: "right" }}>Reach out</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="muted" style={{ textAlign: "center", padding: 28 }}>Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={5} className="muted" style={{ textAlign: "center", padding: 28 }}>No parent messages logged yet.</td></tr>
            ) : (
              rows.map((m) => (
                <tr key={m.id}>
                  <td>
                    <div className="cell-student">
                      <Avatar name={m.studentName} color={colorFor(m.studentId)} size={32} />
                      <b>{m.studentName}</b>
                    </div>
                  </td>
                  <td className="muted" style={{ fontSize: 12 }}>{m.note ?? "—"}</td>
                  <td>
                    <div className="row" style={{ gap: 6 }}>
                      <span className={"status-tag " + (m.channel === "whatsapp" ? "st-mastered" : "st-progress")} style={{ fontSize: 10.5 }}>
                        <Icon n={m.channel === "whatsapp" ? "whatsapp" : "mail"} size={12} /> {m.channel}
                      </span>
                      <span className="muted tnum" style={{ fontSize: 12 }}>
                        {m.sentAt ? new Date(m.sentAt).toLocaleDateString() : "—"}
                      </span>
                    </div>
                  </td>
                  <td className="muted" style={{ fontSize: 12.5 }}>{m.template ?? "—"}</td>
                  <td>
                    <div className="row" style={{ gap: 7, justifyContent: "flex-end" }}>
                      <button className="btn sm" style={{ color: "#1FA855", borderColor: "rgba(31,168,85,.3)" }} title="Open WhatsApp">
                        <Icon n="whatsapp" size={15} /> WhatsApp
                      </button>
                      <button className="btn sm" title="Open email">
                        <Icon n="mail" size={15} /> Email
                      </button>
                    </div>
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
