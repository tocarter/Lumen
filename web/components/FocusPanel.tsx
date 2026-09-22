"use client";

import { useMemo, useState } from "react";
import { emptyOwnWork } from "@/lib/own-work";
import { fmtElapsed, fmtMinutes } from "@/lib/format";
import { useStore } from "@/lib/store";
import OwnWorkDialog from "./OwnWorkDialog";

export default function FocusPanel() {
  const s = useStore();
  const [adding, setAdding] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);

  const today = useMemo(
    () => s.assignments.filter((a) => s.bucketOf(a) === "tonight" || s.bucketOf(a) === "overdue"),
    [s]
  );
  const done = useMemo(
    () => s.assignments.filter((a) => s.statusOf(a) === "done"),
    [s]
  );
  const queue = today.filter((a) => a.id !== s.activeTimer);
  const active = s.assignments.find((a) => a.id === s.activeTimer) ?? today[0] ?? null;
  const total = today.length + done.filter((a) => !today.some((t) => t.id === a.id)).length;
  const doneCount = done.length;
  const pct = total ? Math.round((doneCount / Math.max(total, doneCount)) * 100) : 0;
  const planned = today.reduce((n, a) => n + s.minutesOf(a), 0);

  return (
    <div className="focus-layer" data-leaving={s.focusLeaving ?? ""}>
      <aside className="focus-panel">
        <header className="focus-head">
          <div className="list-pill">
            <ListIcon />
            Today
          </div>
          <div className="focus-tools">
            <button type="button" title="Settings" onClick={() => { s.closeFocus("shrink"); s.setView("settings"); }}>
              <GearIcon />
            </button>
            <button type="button" title="Back to board" onClick={() => s.closeFocus("shrink")}>
              <HomeIcon />
            </button>
            <button type="button" title="Mini timer" onClick={() => s.setFocusMode("mini")}>
              <ExpandIcon />
            </button>
          </div>
        </header>

        <div className="focus-progress">
          <div className="focus-bar">
            <i style={{ width: `${pct}%` }} />
          </div>
          <span>
            {doneCount}/{Math.max(total, doneCount)} Done
          </span>
        </div>
        <p className="focus-est">{planned ? `${fmtMinutes(planned)} planned` : "No estimate yet"}</p>

        {active ? (
          <article className="focus-active">
            <span className="focus-active-est">{fmtMinutes(s.minutesOf(active))}</span>
            <h2>{active.title}</h2>
            <p className="meta">{s.courseName(active.courseId)}</p>
            <time>{fmtElapsed(s.trackedMs(active.id))}</time>
            {notesOpen ? (
              <textarea
                className="focus-notes"
                placeholder="Notes for this task"
                value={s.noteOf(active.id)}
                onChange={(e) => s.setNote(active.id, e.target.value)}
              />
            ) : null}
            <div className="focus-active-controls">
              <button className="focus-notes-toggle" type="button" onClick={() => setNotesOpen((v) => !v)}>
                {notesOpen ? "Hide notes" : "Notes"}
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
            </div>
          </article>
        ) : (
          <div className="focus-empty">All caught up for Today.</div>
        )}

        <div className="focus-queue">
          {queue.map((a) => (
            <button
              key={a.id}
              type="button"
              className="focus-row"
              onClick={() => s.startTimer(a.id)}
            >
              <span>
                <b>{a.title}</b>
                <em>{s.courseName(a.courseId)} · {fmtMinutes(s.minutesOf(a))}</em>
              </span>
              <span className="rocket" title="Make this live">
                <RocketIcon />
              </span>
            </button>
          ))}
        </div>

        <button className="add-task" type="button" onClick={() => setAdding(true)}>
          + Add task
        </button>

        {done.length ? (
          <section className="done-pile">
            <h3>Completed</h3>
            {done.slice(0, 8).map((a) => (
              <div className="focus-row" key={a.id} data-done="true">
                <span>
                  <b>{a.title}</b>
                  <em>{fmtElapsed(s.trackedMs(a.id))}</em>
                </span>
              </div>
            ))}
          </section>
        ) : null}

        <div className="focus-bottom">
          <button className="focus-mode-btn" type="button" onClick={() => s.setFocusMode("mini")}>
            Focus mode
          </button>
          <div className="dock-row">
            <button type="button" onClick={() => s.closeFocus("slide-left")}>
              Hide left
            </button>
            <button type="button" onClick={() => s.closeFocus("slide-right")}>
              Hide right
            </button>
          </div>
        </div>
      </aside>
      {adding ? <OwnWorkDialog initial={emptyOwnWork()} onClose={() => setAdding(false)} /> : null}
    </div>
  );
}

function ListIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
      <path d="M2 3h10M2 7h10M2 11h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
function GearIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="8" cy="8" r="2.2" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M8 1.6v1.6M8 12.8v1.6M1.6 8h1.6M12.8 8h1.6M3.3 3.3l1.1 1.1M11.6 11.6l1.1 1.1M3.3 12.7l1.1-1.1M11.6 4.4l1.1-1.1"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
function HomeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M2.5 8 8 3l5.5 5V13a1 1 0 0 1-1 1H3.5a1 1 0 0 1-1-1V8Z" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
function ExpandIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M4 6.5 8 3l4 3.5M8 3v10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function RocketIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
      <path d="M7 1.5c2.4 1.2 4 3.8 4 6.4 0 .9-.2 1.8-.5 2.6L7 12.5 3.5 10.5C3.2 9.7 3 8.8 3 7.9 3 5.3 4.6 2.7 7 1.5Z" fill="none" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}
