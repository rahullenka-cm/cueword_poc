"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import SetupNotice from "@cueword/core/components/SetupNotice";
import LiveClass from "@cueword/core/components/LiveClass";
import BodyClass from "@cueword/core/components/BodyClass";
import TopBar from "@cueword/core/components/TopBar";
import { useActiveSession } from "@cueword/core/components/useActiveSession";
import { isSupabaseConfigured } from "@cueword/core/lib/supabase/client";
import { signOut, useSupabaseUser } from "@cueword/core/lib/auth-supabase";
import { POC, getZoomLink } from "@cueword/core/lib/config";
import {
  endClass,
  setStep,
  startClass,
  subscribeSessionEvents,
  toRenderState,
} from "@cueword/core/lib/session";
import { getStory } from "@cueword/core/lib/stories";
import { buildSteps, stepPhase } from "@cueword/core/lib/lesson";
import type { AnswerPayload } from "@cueword/core/lib/types";

export default function CoachLivePage() {
  const router = useRouter();
  const { user, ready } = useSupabaseUser();
  const { session, setSession, loading } = useActiveSession();
  const [lastAnswer, setLastAnswer] = useState<{
    stepIndex: number;
    correct: boolean;
    choice: AnswerPayload["choice"];
  } | null>(null);

  useEffect(() => {
    if (ready && (!user || user.role !== "coach")) router.replace("/login");
  }, [ready, user, router]);

  // Reflect the student's picks live on the coach screen.
  useEffect(() => {
    if (!isSupabaseConfigured || !session?.id) return;
    return subscribeSessionEvents(session.id, (evt) => {
      if (evt.type === "answer") {
        const p = evt.payload as {
          stepIndex?: number;
          correct?: boolean;
          choice?: AnswerPayload["choice"];
        };
        setLastAnswer({
          stepIndex: Number(p.stepIndex ?? -1),
          correct: Boolean(p.correct),
          choice: p.choice as AnswerPayload["choice"],
        });
      }
    });
  }, [session?.id]);

  const studentName = POC.student.displayName;

  if (!isSupabaseConfigured) return <SetupNotice />;
  if (!ready || loading) return <div className="cw-today">Loading…</div>;
  if (!user || user.role !== "coach") return null; // redirecting to /login

  const coachName = user.full_name;
  const render = session ? toRenderState(session) : null;
  const storyKey = render?.storyKey ?? null;
  const isLiveWithStory = session?.status === "live" && !!storyKey;
  const zoomLink = getZoomLink(); // JSON config is the single source of truth for the link

  const logoutBtn = (
    <button
      className="cw-logout"
      onClick={() => {
        void signOut().finally(() => router.replace("/login"));
      }}
    >
      Log out
    </button>
  );

  // ---- Live console -------------------------------------------------------
  if (isLiveWithStory && session && storyKey) {
    const story = getStory(storyKey);
    if (story) {
      const steps = buildSteps(story);
      const idx = render!.stepIndex;
      const isDriver = session.driver === "coach";

      const go = (ni: number) => {
        const clamped = Math.min(Math.max(ni, 0), steps.length - 1);
        const phase = stepPhase(steps[clamped]) || null;
        setSession({ ...session, current_step: clamped, current_phase: phase });
        void setStep(session.id, clamped, phase, "coach");
      };
      const curStep = steps[idx];
      // Mirror the child's answer visual onto the coach screen: feed their
      // synced pick into the same QuestionView the child sees (green = correct,
      // red = wrong), instead of a text note.
      const reveal =
        lastAnswer && lastAnswer.stepIndex === idx && curStep.kind === "q"
          ? lastAnswer.choice
          : null;

      return (
        <LiveClass
          story={story}
          storyKey={storyKey}
          stepIndex={idx}
          isDriver={isDriver}
          driver={session.driver}
          coachName={coachName}
          kidName={studentName}
          zoomLink={zoomLink}
          showPlaybook
          reveal={reveal}
          onNext={() => go(idx + 1)}
          onPrev={() => go(idx - 1)}
          onLeave={() => {
            void endClass(session.id);
            router.push("/");
          }}
          headerActions={logoutBtn}
        />
      );
    }
  }

  // ---- Live, waiting for the student to open a story ----------------------
  if (session?.status === "live") {
    return (
      <>
        <BodyClass name="class-body" />
        <div className="class-shell">
          <TopBar
            coachName={coachName}
            storyTitle="Waiting to begin…"
            zoomLink={zoomLink}
            onLeave={() => {
              void endClass(session.id);
              router.push("/");
            }}
            actions={logoutBtn}
          />
          <div className="class-main cw-coach">
            <aside className="class-playbook">
              <div className="pb-head">
                🎯 Coach playbook <span className="pb-only">coach only</span>
              </div>
              <div className="pb-body">
                <div className="pb-card">
                  <div className="pb-card-h">Waiting for {studentName}</div>
                  <p>
                    The class is live. As soon as {studentName} opens a story, your nudges, answers,
                    and rubric appear right here — synced live as they move through it.
                  </p>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </>
    );
  }

  // ---- Pre-live: start the class ------------------------------------------
  return (
    <div className="cw-today">
      <div className="cw-today-head">
        <div>
          <div className="cw-today-hi">Live class</div>
          <div className="cw-today-sub">Start the session, then guide {studentName} through the story.</div>
        </div>
        <div className="cw-today-actions">
          <button className="cw-logout" onClick={() => router.push("/")}>
            ← Dashboard
          </button>
          {logoutBtn}
        </div>
      </div>

      {session ? (
        <div className="cw-class-card">
          <div>
            <div className="cc-when">Today&apos;s session</div>
            <div className="cc-title">1:1 with {studentName}</div>
            <div className="cc-meta">
              {session.status === "completed"
                ? `Last class wrapped — start a new one with ${studentName} whenever you're ready.`
                : `Start the class, then guide ${studentName} through the story.`}
            </div>
          </div>
          <div className="cw-class-actions">
            <span className={`cw-status cw-status-${session.status}`}>{session.status}</span>
            <a className="btn-secondary btn-small" href={zoomLink} target="_blank" rel="noreferrer">
              Join Zoom
            </a>
            <button
              className="btn-primary btn-small"
              onClick={() => {
                setSession({
                  ...session,
                  status: "live",
                  story_key: null,
                  current_step: 0,
                  current_phase: null,
                });
                void startClass(session.id);
              }}
            >
              {session.status === "completed" ? "Restart class →" : "Start class →"}
            </button>
          </div>
        </div>
      ) : (
        <div className="cw-slate-empty">
          No class session found — check that Supabase is seeded (config.SESSION_ID).
        </div>
      )}
    </div>
  );
}
