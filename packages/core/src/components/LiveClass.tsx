"use client";
import type { ReactNode } from "react";
import BodyClass from "./BodyClass";
import TopBar from "./TopBar";
import ClassPeople from "./ClassPeople";
import LessonCanvas from "./LessonCanvas";
import CoachPlaybook from "./CoachPlaybook";
import { buildSteps, stepPhase } from "../lib/lesson";
import type { AnswerPayload, Driver, Question, Step, Story, StoryKey } from "../lib/types";

type Emit = { questionType: Question["type"]; choice: AnswerPayload["choice"]; correct: boolean };

function planKeyFor(step: Step): string {
  if (step.kind === "cover") return "warmup";
  if (step.kind === "complete" || step.kind === "ending") return "wrap";
  return stepPhase(step) || "warmup";
}

/** The dark live-class shell — shared by /student (no playbook) and /coach. */
export default function LiveClass({
  story,
  storyKey,
  stepIndex,
  isDriver,
  driver,
  coachName,
  kidName,
  zoomLink,
  onNext,
  onPrev,
  onAnswer,
  onLeave,
  showPlaybook = false,
  headerActions,
  reveal,
}: {
  story: Story;
  storyKey: StoryKey;
  stepIndex: number;
  isDriver: boolean;
  driver: Driver;
  coachName: string;
  kidName: string;
  zoomLink?: string | null;
  onNext: () => void;
  onPrev: () => void;
  onAnswer?: (e: Emit) => void;
  onLeave?: () => void;
  showPlaybook?: boolean;
  headerActions?: ReactNode;
  reveal?: AnswerPayload["choice"] | null;
}) {
  const steps = buildSteps(story);
  const idx = Math.min(Math.max(stepIndex, 0), steps.length - 1);
  const step = steps[idx];

  return (
    <>
      <BodyClass name="class-body" />
      <div className="class-shell">
        <TopBar
          coachName={coachName}
          storyTitle={`${story.cover} ${story.title}`}
          zoomLink={zoomLink}
          onLeave={onLeave}
          actions={headerActions}
        />
        <div className={`class-main ${showPlaybook ? "cw-coach" : "cw-2col"}`}>
          {showPlaybook ? (
            <aside className="class-playbook">
              <div className="pb-head">
                🎯 Coach playbook{" "}
                <span className="pb-only">coach only — the student can&apos;t see this</span>
              </div>
              <CoachPlaybook
                key={idx}
                story={story}
                storyKey={storyKey}
                step={step}
                kidName={kidName}
                driver={driver}
              />
            </aside>
          ) : (
            <>
              <ClassPeople activePlanKey={planKeyFor(step)} />
              <LessonCanvas
                story={story}
                storyKey={storyKey}
                stepIndex={idx}
                isDriver={isDriver}
                driver={driver}
                onNext={onNext}
                onPrev={onPrev}
                onAnswer={onAnswer}
                kidName={kidName}
                coachName={coachName}
                reveal={reveal}
              />
            </>
          )}
        </div>
      </div>
    </>
  );
}
