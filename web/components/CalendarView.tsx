"use client";

import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";

const HOURS = Array.from({ length: 15 }, (_, i) => i + 7);

function startOfWeek(d: Date): Date {
  const day = new Date(d);
  const offset = (day.getDay() + 6) % 7;
  day.setDate(day.getDate() - offset);
  day.setHours(0, 0, 0, 0);
  return day;
}

export default function CalendarView() {
  const s = useStore();
  const [anchor] = useState(() => startOfWeek(new Date()));
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const d = new Date(anchor);
    d.setDate(anchor.getDate() + i);
    return d;
  }), [anchor]);

  const todayKey = new Date().toDateString();

  function onDrop(day: Date, hour: number, assignmentId: string) {
    const start = new Date(day);
    start.setHours(hour, 0, 0, 0);
    s.moveSlot(assignmentId, start.toISOString());
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Calendar</h1>
          <p>Drag a block onto a new hour to pin it. Pinned times survive the next sync.</p>
        </div>
        <button className="btn" type="button" onClick={() => s.syncNow()} disabled={s.syncing}>
          {s.syncing ? "Syncing…" : "Sync now"}
        </button>
      </div>

      <div className="week">
        <div className="week-head" />
        {days.map((d) => (
          <div className="week-head" data-today={d.toDateString() === todayKey} key={d.toISOString()}>
            {d.toLocaleDateString([], { weekday: "short" })} {d.getDate()}
          </div>
        ))}

        {HOURS.map((hour) => (
          <HourRow
            key={hour}
            hour={hour}
            days={days}
            onDrop={onDrop}
          />
        ))}
      </div>
    </>
  );
}

function HourRow({
  hour,
  days,
  onDrop,
}: {
  hour: number;
  days: Date[];
  onDrop: (day: Date, hour: number, assignmentId: string) => void;
}) {
  const s = useStore();
  const label = new Date(2000, 0, 1, hour).toLocaleTimeString([], { hour: "numeric" });

  return (
    <>
      <div className="hour-label">{label}</div>
      {days.map((day) => {
        const blocks = s.slots.filter((slot) => {
          const start = new Date(slot.start);
          return start.toDateString() === day.toDateString() && start.getHours() === hour;
        });
        return (
          <div
            className="cell"
            key={`${day.toISOString()}-${hour}`}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              const id = e.dataTransfer.getData("text/plain");
              if (id) onDrop(day, hour, id);
            }}
          >
            {blocks.map((slot) => {
              const a = s.assignments.find((item) => item.id === slot.assignmentId);
              if (!a) return null;
              const start = new Date(slot.start);
              const end = new Date(slot.end);
              const span = Math.max(1, (end.getTime() - start.getTime()) / 3_600_000);
              return (
                <button
                  key={slot.id}
                  className="block"
                  type="button"
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData("text/plain", a.id)}
                  onClick={() => s.select(a.id)}
                  style={{
                    background: s.courseColor(a.courseId),
                    height: `${Math.min(span * 42 - 6, 120)}px`,
                  }}
                >
                  {a.title}
                </button>
              );
            })}
          </div>
        );
      })}
    </>
  );
}
