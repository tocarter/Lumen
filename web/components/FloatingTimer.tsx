"use client";

import { useEffect, useRef, useState } from "react";
import { fmtElapsed } from "@/lib/format";
import { useStore } from "@/lib/store";
import { desktopApi } from "@/lib/desktop";
import type { FocusState } from "@/lib/focus";

export default function FloatingTimer() {
  const s = useStore();
  const [expanded, setExpanded] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [pos, setPos] = useState({ x: 24, y: 24 });
  const drag = useRef<{ dx: number; dy: number } | null>(null);

  const active = s.assignments.find((a) => a.id === s.activeTimer);
  if (!active) return null;

  function onPointerDown(e: React.PointerEvent) {
    if ((e.target as HTMLElement).closest("button, textarea")) return;
    drag.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!drag.current) return;
    setPos({
      x: Math.max(8, e.clientX - drag.current.dx),
      y: Math.max(8, e.clientY - drag.current.dy),
    });
  }

  return (
    <div
      className="mini-timer"
      data-expanded={expanded}
      style={{ left: pos.x, top: pos.y }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={() => {
        drag.current = null;
      }}
      onClick={() => setExpanded(true)}
      onMouseLeave={() => {
        if (!notesOpen) setExpanded(false);
      }}
    >
      <div className="mini-main">
        <strong>{active.title}</strong>
        <time>{fmtElapsed(s.trackedMs(active.id))}</time>
      </div>
      {expanded ? (
        <div className="mini-strip">
          <button type="button" onClick={() => setNotesOpen((v) => !v)}>
            Notes
          </button>
          {s.timerPaused ? (
            <button type="button" onClick={() => s.resumeTimer()}>
              Resume
            </button>
          ) : (
            <button type="button" onClick={() => s.pauseTimer()}>
              Pause
            </button>
          )}
          <button type="button" onClick={() => s.skipTimer()}>
            Skip
          </button>
          <button type="button" onClick={() => s.completeActive()}>
            Done
          </button>
          <button
            type="button"
            onClick={() => {
              desktopApi()?.closeMini();
              s.setFocusMode("panel");
            }}
          >
            Expand
          </button>
        </div>
      ) : null}
      {expanded && notesOpen ? (
        <textarea
          className="focus-notes"
          value={s.noteOf(active.id)}
          onChange={(e) => s.setNote(active.id, e.target.value)}
        />
      ) : null}
    </div>
  );
}

export function MiniTimerView({
  state,
  onPause,
  onResume,
  onSkip,
  onDone,
  onExpand,
}: {
  state: FocusState;
  onPause: () => void;
  onResume: () => void;
  onSkip: () => void;
  onDone: () => void;
  onExpand: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const api = desktopApi();

  useEffect(() => {
    void api?.resizeMini(340, expanded ? 132 : 68);
  }, [expanded, api]);

  return (
    <div
      className="mini-timer mini-window"
      data-expanded={expanded}
      onClick={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
    >
      <div className="mini-main">
        <strong>{state.title || "Focus"}</strong>
        <time>{fmtElapsed(state.elapsed)}</time>
      </div>
      {expanded ? (
        <div className="mini-strip">
          {state.paused ? (
            <button type="button" onClick={onResume}>
              Resume
            </button>
          ) : (
            <button type="button" onClick={onPause}>
              Pause
            </button>
          )}
          <button type="button" onClick={onSkip}>
            Skip
          </button>
          <button type="button" onClick={onDone}>
            Done
          </button>
          <button type="button" onClick={onExpand}>
            Expand
          </button>
        </div>
      ) : null}
    </div>
  );
}
