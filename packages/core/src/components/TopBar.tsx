"use client";

/** Live top bar — ported from class-experience.html .class-top. */
export default function TopBar({
  coachName,
  storyTitle,
  timer,
  zoomLink,
  onLeave,
  actions,
}: {
  coachName: string;
  storyTitle: string;
  timer?: string;
  zoomLink?: string | null;
  onLeave?: () => void;
  actions?: React.ReactNode;
}) {
  return (
    <header className="class-top">
      <div className="ct-left">
        <span className="live-dot" /> LIVE · Class with {coachName}
        {timer ? (
          <>
            <span className="ct-sep">·</span> <span>{timer}</span>
          </>
        ) : null}
      </div>
      <div className="ct-center">
        <span className="ct-story">{storyTitle}</span>
      </div>
      <div className="ct-right">
        {actions}
        {zoomLink ? (
          <a className="ct-zoom" href={zoomLink} target="_blank" rel="noreferrer" title="Join Zoom">
            <span className="ct-zoom-ico" aria-hidden="true">🎥</span> Join Zoom
          </a>
        ) : null}
        <button className="ct-end" onClick={onLeave}>
          Leave
        </button>
      </div>
    </header>
  );
}
