"use client";

import { fmtMinutes, fmtRange, providerLabel } from "@/lib/format";
import { slotsOnDay, unscheduledIds } from "@/lib/schedule";
import { useStore } from "@/lib/store";
import type { Assignment } from "@/lib/types";

function TodoRow({ a }: { a: Assignment }) {
  const s = useStore();
  const done = s.statusOf(a) === "done";
  return (
    <button className="check" data-done={done} type="button" onClick={() => s.select(a.id)}>
      <span className="dot" style={{ background: s.courseColor(a.courseId) }} />
      <span>
        <b>{a.title}</b>
        <span className="meta">
          {s.courseName(a.courseId)} · {a.due} · {fmtMinutes(s.minutesOf(a))}
        </span>
      </span>
      <span className={`badge ${a.bucket === "overdue" ? "overdue" : ""}`}>
        {a.bucket === "overdue" ? "Overdue" : providerLabel(a.provider)}
      </span>
    </button>
  );
}

export default function TodayView() {
  const s = useStore();
  const today = new Date();
  const todays = slotsOnDay(s.slots, today);
  const open = s.assignments.filter((a) => s.statusOf(a) !== "done");
  const overdue = open.filter((a) => a.bucket === "overdue");
  const rest = open.filter((a) => a.bucket !== "overdue");
  const missing = new Set(unscheduledIds(s.assignments, s.slots));

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Today</h1>
          <p>
            {todays.length
              ? `${todays.length} study block${todays.length === 1 ? "" : "s"} on the clock.`
              : "Nothing scheduled yet — connect a class site or add your own work."}
          </p>
        </div>
        <div>
          <button className="btn" type="button" onClick={() => s.syncNow()} disabled={s.syncing}>
            {s.syncing ? "Syncing…" : "Sync now"}
          </button>
        </div>
      </div>
      {s.syncError ? <p className="error">{s.syncError}</p> : null}

      <div className="grid-today">
        <section className="card">
          <h2>Study blocks</h2>
          {todays.length === 0 ? (
            <div className="empty">No blocks for today. Open work still appears in the list.</div>
          ) : (
            todays.map((slot) => {
              const a = s.assignments.find((item) => item.id === slot.assignmentId);
              if (!a) return null;
              return (
                <button className="slot" key={slot.id} type="button" onClick={() => s.select(a.id)}>
                  <time>{fmtRange(slot.start, slot.end)}</time>
                  <span>
                    <b>{a.title}</b>
                    <span className="meta">{s.courseName(a.courseId)}</span>
                  </span>
                  <span className="badge">{fmtMinutes(slot.minutes)}</span>
                </button>
              );
            })
          )}
        </section>

        <section className="card">
          <h2>To-do</h2>
          {open.length === 0 ? (
            <div className="empty">All caught up.</div>
          ) : (
            <>
              {overdue.map((a) => (
                <TodoRow key={a.id} a={a} />
              ))}
              {rest.map((a) => (
                <TodoRow key={a.id} a={a} />
              ))}
            </>
          )}
          {missing.size ? (
            <div className="empty">
              {missing.size} item{missing.size === 1 ? "" : "s"} could not fit in your study hours.
            </div>
          ) : null}
        </section>
      </div>
    </>
  );
}
