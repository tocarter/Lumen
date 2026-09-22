"use client";

import { fmtMinutes, providerLabel } from "@/lib/format";
import { isOwnWork } from "@/lib/own-work";
import { useStore } from "@/lib/store";

export default function AssignmentSheet() {
  const s = useStore();
  const a = s.assignments.find((item) => item.id === s.selectedId);
  if (!a) return null;

  const done = s.statusOf(a) === "done";

  return (
    <div className="sheet-back" onClick={() => s.select(null)}>
      <aside className="sheet" onClick={(e) => e.stopPropagation()}>
        <p className="meta">
          {s.courseName(a.courseId)} · {providerLabel(a.provider)}
        </p>
        <h2 style={{ fontFamily: "var(--serif)", fontSize: 28, margin: "8px 0 12px" }}>{a.title}</h2>
        <p>{a.due}</p>
        {a.brief ? <p>{a.brief}</p> : null}

        <label className="field">
          Estimated time
          <input
            type="number"
            min={10}
            max={180}
            value={s.minutesOf(a)}
            onChange={(e) => s.setMinutes(a.id, Number(e.target.value))}
          />
          <span>{fmtMinutes(s.minutesOf(a))}</span>
        </label>

        <p>
          <button className="btn-gold" type="button" onClick={() => s.toggleDone(a.id)}>
            {done ? "Mark as not done" : "Mark done"}
          </button>
        </p>
        {a.url ? (
          <p>
            <a href={a.url} target="_blank" rel="noreferrer">
              Open in {providerLabel(a.provider)}
            </a>
          </p>
        ) : null}
        {isOwnWork(a.id) ? (
          <p>
            <button className="btn" type="button" onClick={() => s.removeOwnWork(a.id)}>
              Remove
            </button>
          </p>
        ) : (
          <p>
            <button className="btn" type="button" onClick={() => s.clearOverride(a.id)}>
              Reset schedule
            </button>
          </p>
        )}
        <button className="btn-ghost" type="button" onClick={() => s.select(null)}>
          Close
        </button>
      </aside>
    </div>
  );
}
