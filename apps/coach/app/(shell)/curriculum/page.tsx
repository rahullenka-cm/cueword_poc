"use client";
/* Curriculum — read-only view of the authored hierarchy from the real backend:
   stage → term → level (with its learning outcome + story count). Coaches teach
   from it / sequence levels; they don't edit content. */
import { Fragment, useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import { getCurriculumLevels, type CurriculumLevel } from "@/data/live";

export default function CurriculumPage() {
  const [levels, setLevels] = useState<CurriculumLevel[] | null>(null);

  useEffect(() => {
    getCurriculumLevels()
      .then(setLevels)
      .catch(() => setLevels([]));
  }, []);

  const loading = levels === null;
  const rows = levels ?? [];

  // group by stage → term
  const byStage = new Map<number, Map<number, CurriculumLevel[]>>();
  for (const l of rows) {
    if (!byStage.has(l.stageNumber)) byStage.set(l.stageNumber, new Map());
    const terms = byStage.get(l.stageNumber)!;
    if (!terms.has(l.termNumber)) terms.set(l.termNumber, []);
    terms.get(l.termNumber)!.push(l);
  }
  const stages = [...byStage.keys()].sort((a, b) => a - b);

  return (
    <div className="content-inner fade-up">
      <div style={{ marginBottom: 14 }}>
        <h1 className="page-title">Curriculum</h1>
        <p className="page-sub">
          {loading ? "Loading…" : "Authored stories by stage → term → level. Read-only — content is authored by admin."}
        </p>
      </div>

      <div className="banner info" style={{ marginBottom: "var(--gap)" }}>
        <Icon n="book" />
        <div>
          <b>Read-only.</b> Each level holds 10 parallel stories at one difficulty; you teach from them and
          sequence levels per student — you don&apos;t edit the content.
        </div>
      </div>

      {loading ? (
        <div className="card card-pad muted" style={{ textAlign: "center", padding: 28 }}>Loading curriculum…</div>
      ) : rows.length === 0 ? (
        <div className="card card-pad muted" style={{ textAlign: "center", padding: 28 }}>No curriculum authored yet.</div>
      ) : (
        stages.map((stage) => (
          <div key={stage} className="card" style={{ marginBottom: "var(--gap)", overflow: "hidden" }}>
            <div className="card-head">
              <h3>Stage {stage}</h3>
              <span className="ch-sub muted">
                {[...byStage.get(stage)!.values()].reduce((n, ls) => n + ls.length, 0)} levels
              </span>
            </div>
            <table className="tbl">
              <thead>
                <tr>
                  <th>Term</th>
                  <th>Level</th>
                  <th>Learning outcome</th>
                  <th style={{ textAlign: "right" }}>Stories</th>
                </tr>
              </thead>
              <tbody>
                {[...byStage.get(stage)!.keys()].sort((a, b) => a - b).map((term) => (
                  <Fragment key={term}>
                    {byStage.get(stage)!.get(term)!.sort((a, b) => a.numberInStage - b.numberInStage).map((l) => (
                      <tr key={l.levelId}>
                        <td><span className="tnum">T{term}</span></td>
                        <td><span className="tnum">L{l.numberInStage}</span></td>
                        <td style={{ fontSize: 12.5 }}>{l.lo ?? <span className="muted">—</span>}</td>
                        <td style={{ textAlign: "right" }}>
                          <span className="chip" style={{ background: "var(--surface-3)", color: "var(--ink-2)" }}>{l.storyCount}</span>
                        </td>
                      </tr>
                    ))}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        ))
      )}
    </div>
  );
}
