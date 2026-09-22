"use client";

import { useState } from "react";
import { emptyOwnWork, type OwnWork } from "@/lib/own-work";
import { useStore } from "@/lib/store";

export default function OwnWorkDialog({
  initial,
  onClose,
}: {
  initial?: OwnWork;
  onClose: () => void;
}) {
  const s = useStore();
  const [work, setWork] = useState<OwnWork>(initial ?? emptyOwnWork());

  return (
    <div className="sheet-back" onClick={onClose}>
      <form
        className="sheet"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          if (!work.title.trim()) return;
          s.saveOwnWork(work);
          onClose();
        }}
      >
        <h2>Add your own work</h2>
        <label className="field">
          Title
          <input value={work.title} onChange={(e) => setWork({ ...work, title: e.target.value })} required />
        </label>
        <label className="field">
          Course
          <select value={work.courseId} onChange={(e) => setWork({ ...work, courseId: e.target.value })}>
            <option value="">None</option>
            {s.snapshot.courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Due date
          <input
            type="date"
            value={work.dueDate ?? ""}
            onChange={(e) => setWork({ ...work, dueDate: e.target.value || null })}
          />
        </label>
        <label className="field">
          Due time
          <input
            type="time"
            value={work.dueTime ?? ""}
            onChange={(e) => setWork({ ...work, dueTime: e.target.value || undefined })}
          />
        </label>
        <label className="field">
          Estimated minutes
          <input
            type="number"
            min={10}
            max={180}
            value={work.minutes}
            onChange={(e) => setWork({ ...work, minutes: Number(e.target.value) })}
          />
        </label>
        <label className="field">
          Notes
          <textarea value={work.notes ?? ""} onChange={(e) => setWork({ ...work, notes: e.target.value })} />
        </label>
        <p>
          <button className="btn-gold" type="submit">
            Save
          </button>{" "}
          <button className="btn" type="button" onClick={onClose}>
            Cancel
          </button>
        </p>
      </form>
    </div>
  );
}
