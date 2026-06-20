"use client";
/* Marking detail. Wired to the real backend: one submission (body / audio) plus
   any ai_evaluations row, RLS-scoped to the coach's students. AI scoring is
   produced by the eval function (lands when we move to the company repo) — until
   then the score panel shows a pending state. Manual feedback is a local-only
   draft here; the write path ships with the marking flow. */
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Icon, Avatar, AITag } from "@/components/Icon";
import { getMarkingItem, type MarkingDetail } from "@/data/live";

const PALETTE = ["#2D7FF9", "#EC5A8D", "#11A974", "#EE9612", "#7C5CFC", "#06AFC4"];
const colorFor = (id: string) =>
  PALETTE[[...id].reduce((a, c) => a + c.charCodeAt(0), 0) % PALETTE.length];

const SKILL_LABEL: Record<string, string> = {
  listen: "Listening", read: "Reading", vocab: "Vocabulary", speak: "Speaking", write: "Writing",
};

export default function MarkingItemPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [m, setM] = useState<MarkingDetail | null | undefined>(undefined);
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    if (!id) return;
    getMarkingItem(id)
      .then((r) => { setM(r); setFeedback(r?.tutorFeedback ?? ""); })
      .catch(() => setM(null));
  }, [id]);

  if (m === undefined) {
    return (
      <div className="content-inner fade-up">
        <div className="card card-pad muted" style={{ textAlign: "center", padding: 28 }}>Loading submission…</div>
      </div>
    );
  }
  if (m === null) {
    return (
      <div className="content-inner fade-up">
        <button className="btn ghost sm" onClick={() => router.push("/marking")}>
          <Icon n="back" size={16} /> Marking
        </button>
        <p className="page-sub" style={{ marginTop: 16 }}>Submission not found.</p>
      </div>
    );
  }

  const isAudio = m.type === "spoken" && !!m.contentUrl;
  const looksLikeUrl = !!m.contentUrl && /^https?:\/\//.test(m.contentUrl);

  return (
    <div className="content-inner fade-up">
      {/* header */}
      <div className="row" style={{ marginBottom: 14, alignItems: "flex-start" }}>
        <button className="btn ghost sm" onClick={() => router.push("/marking")} style={{ marginTop: 2 }}>
          <Icon n="back" size={16} />
        </button>
        <div className="grow">
          <div className="row" style={{ gap: 10 }}>
            <h1 className="page-title" style={{ fontSize: 22 }}>{m.storyTitle ?? (m.type === "spoken" ? "Spoken piece" : "Written piece")}</h1>
            {m.status === "ai_scored" && <AITag>AI pre-scored</AITag>}
          </div>
          <div className="page-sub row" style={{ gap: 7 }}>
            <Avatar name={m.studentName} color={colorFor(m.studentId)} size={18} /> {m.studentName} · {m.type}
            {m.skill ? ` · ${SKILL_LABEL[m.skill] ?? m.skill}` : ""}
          </div>
        </div>
        <button className="btn" onClick={() => router.push(`/roster/${m.studentId}`)}>
          <Icon n="roster" size={15} /> Student
        </button>
      </div>

      <div className="kgrid" style={{ gridTemplateColumns: "1.4fr 1fr", alignItems: "start" }}>
        {/* LEFT — the work */}
        <div className="card">
          <div className="card-head">
            <span className="chip" style={{ background: "var(--surface-3)", color: "var(--ink-2)" }}>{m.skill ? (SKILL_LABEL[m.skill] ?? m.skill) : m.type}</span>
            {m.phase && <span className="ch-sub muted">{m.phase}</span>}
            <span className="spacer" />
            <span className="ch-sub muted tnum">Submitted {new Date(m.createdAt).toLocaleDateString()}</span>
          </div>
          <div className="card-pad">
            {isAudio ? (
              looksLikeUrl ? (
                <audio controls src={m.contentUrl!} style={{ width: "100%" }} />
              ) : (
                <div className="banner info"><Icon n="zoom" /><div>Audio stored at <code style={{ fontSize: 11.5 }}>{m.contentUrl}</code> — playback resolves a signed URL in the marking flow.</div></div>
              )
            ) : m.body ? (
              <div style={{ fontSize: 15, lineHeight: 1.85, color: "var(--ink)", whiteSpace: "pre-wrap", fontFamily: "Georgia, serif" }}>{m.body}</div>
            ) : (
              <p className="muted" style={{ textAlign: "center", padding: 18 }}>No content on this submission yet.</p>
            )}
          </div>
        </div>

        {/* RIGHT — score + feedback */}
        <div className="col" style={{ gap: "var(--gap)" }}>
          {/* AI score */}
          <div className="card">
            <div className="card-head">
              <h3>Score</h3>
              {m.ai && <AITag>AI</AITag>}
              <span className="spacer" />
              {m.score != null && (
                <div style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 700, color: "var(--brand-ink)" }}>
                  {Math.round(m.score)}<span style={{ fontSize: 13, color: "var(--ink-4)" }}>/100</span>
                </div>
              )}
            </div>
            <div className="card-pad">
              {m.ai?.result ? (
                <pre style={{ fontSize: 12, lineHeight: 1.5, whiteSpace: "pre-wrap", margin: 0, color: "var(--ink-2)" }}>
                  {JSON.stringify(m.ai.result, null, 2)}
                </pre>
              ) : (
                <div className="waiting">
                  <div className="pulse"><Icon n="bolt" size={16} /></div>
                  AI scoring runs via the eval function — lands when we move to the company repo. Grade manually until then.
                </div>
              )}
              {m.ai?.modelUsed && <div className="muted" style={{ fontSize: 11, marginTop: 8 }}>model: {m.ai.modelUsed}</div>}
            </div>
          </div>

          {/* Feedback (local draft for now) */}
          <div className="card card-pad">
            <div className="row" style={{ marginBottom: 9 }}>
              <h3 style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: 15 }}>Feedback</h3>
              <span className="spacer" />
              <span className="ch-sub muted">{m.tutorFeedback ? "from DB" : "draft"}</span>
            </div>
            <textarea
              className="textarea"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={6}
              placeholder="Write feedback for the student…"
            />
            <p className="muted" style={{ fontSize: 11.5, marginTop: 9 }}>
              Saving feedback &amp; scores writes back to the submission — that path ships with the marking flow.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
