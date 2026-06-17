// Floating Zoom placeholder for the coach live console.
// A horizontal (16:9) rectangle pinned bottom-right, below the playbook —
// drop the real Zoom window over it. Replaces the old left-column video tiles.
export default function ZoomDock() {
  return (
    <div className="cw-zoom-dock" aria-label="Zoom window placeholder">
      <div className="cw-zoom-dock-icon">🎥</div>
      <div className="cw-zoom-dock-text">
        <div className="cw-zoom-dock-title">Place your Zoom window here</div>
        <div className="cw-zoom-dock-sub">Your 1:1 video runs in Zoom, over this box.</div>
      </div>
    </div>
  );
}
