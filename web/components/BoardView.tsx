"use client";

import { useMemo, useState } from "react";
import { emptyOwnWork } from "@/lib/own-work";
import { fmtMinutes } from "@/lib/format";
import { useStore } from "@/lib/store";
import type { Assignment, Bucket } from "@/lib/types";
import OwnWorkDialog from "./OwnWorkDialog";

const COLUMNS: { key: Bucket; label: string }[] = [
  { key: "overdue", label: "Overdue" },
  { key: "tonight", label: "Today" },
  { key: "soon", label: "Tomorrow" },
  { key: "week", label: "Later" },
  { key: "done", label: "Turned in" },
];

export default function BoardView() {
  const s = useStore();
  const [adding, setAdding] = useState(false);
  const [dragOver, setDragOver] = useState<Bucket | null>(null);

  const grouped = useMemo(() => {
    const map: Record<Bucket, Assignment[]> = {
      overdue: [],
      tonight: [],
      soon: [],
      week: [],
      done: [],
    };
    for (const a of s.assignments) map[s.bucketOf(a)].push(a);
    return map;
  }, [s]);

  const columns = COLUMNS.filter((col) => col.key !== "overdue" || grouped.overdue.length > 0);
  const last = s.lastSync
    ? `Synced ${new Date(s.lastSync).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`
    : "Not synced yet";

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Board</h1>
          <p>
            {s.assignments.length
              ? `${s.assignments.filter((a) => s.statusOf(a) !== "done").length} open · ${last}`
              : "Connect Schoology or Canvas in Settings, or add your own work."}
          </p>
        </div>
        <div className="head-actions">
          <button className="btn" type="button" onClick={() => setAdding(true)}>
            Add
          </button>
          <button className="btn" type="button" onClick={() => s.syncNow()} disabled={s.syncing}>
            {s.syncing ? "Syncing…" : "Sync"}
          </button>
          <button className="btn-gold" type="button" onClick={() => s.openFocus()}>
            Focus
          </button>
        </div>
      </div>
      {s.syncError ? <p className="error">{s.syncError}</p> : null}

      <div className="board" data-cols={columns.length}>
        {columns.map((col) => (
          <section
            key={col.key}
            className="board-col"
            data-over={dragOver === col.key}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(col.key);
            }}
            onDragLeave={() => setDragOver((cur) => (cur === col.key ? null : cur))}
            onDrop={(e) => {
              e.preventDefault();
              const id = e.dataTransfer.getData("text/plain");
              if (id) s.moveTo(id, col.key);
              setDragOver(null);
            }}
          >
            <header>
              <span>{col.label}</span>
              <em>{grouped[col.key].length}</em>
            </header>
            <div className="board-col-body">
              {grouped[col.key].length === 0 ? (
                <div className="col-empty">{col.key === "done" ? "Nothing turned in" : "Drop work here"}</div>
              ) : (
                grouped[col.key].map((a) => <BoardCard key={a.id} a={a} />)
              )}
            </div>
          </section>
        ))}
      </div>

      {adding ? <OwnWorkDialog initial={emptyOwnWork()} onClose={() => setAdding(false)} /> : null}
    </>
  );
}

function BoardCard({ a }: { a: Assignment }) {
  const s = useStore();
  const live = s.activeTimer === a.id;

  return (
    <button
      type="button"
      className="board-card"
      data-live={live}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", a.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      onClick={() => s.select(a.id)}
    >
      <span className="course-chip">
        <i style={{ background: s.courseColor(a.courseId) }} />
        {s.courseName(a.courseId)}
      </span>
      <strong>{a.title}</strong>
      <span className="card-meta">
        <span>{a.due}</span>
        <span>{fmtMinutes(s.minutesOf(a))}</span>
      </span>
    </button>
  );
}
