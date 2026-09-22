import { bucketFor } from "./normalize";
import type { Assignment, Course } from "./types";

const OWN = "own:";

export function isOwnWork(id: string): boolean {
  return id.startsWith(OWN);
}

export function newOwnWorkId(): string {
  return `${OWN}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

export interface OwnWork {
  id: string;
  title: string;
  courseId: string;
  dueDate: string | null;
  dueTime?: string;
  notes?: string;
  minutes: number;
  createdAt: number;
}

export function emptyOwnWork(courseId = ""): OwnWork {
  const d = new Date();
  const dueDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return {
    id: newOwnWorkId(),
    title: "",
    courseId,
    dueDate,
    minutes: 30,
    createdAt: Date.now(),
  };
}

function offsetOf(dueDate: string | null, today: Date): number | null {
  if (!dueDate) return null;
  const due = new Date(`${dueDate}T12:00:00`);
  if (Number.isNaN(due.getTime())) return null;
  const noon = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12);
  return Math.round((due.getTime() - noon.getTime()) / 86_400_000);
}

function dueLabel(dueDate: string | null, dueTime: string | undefined, offset: number | null): string {
  if (!dueDate) return "No due date";
  const at = new Date(`${dueDate}T${dueTime ?? "12:00"}:00`);
  const clock = dueTime
    ? ` at ${at.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }).toLowerCase()}`
    : "";
  const day =
    offset === 0
      ? "Today"
      : offset === 1
        ? "Tomorrow"
        : at.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
  return `${day}${clock}`;
}

export function toAssignment(work: OwnWork, today = new Date()): Assignment {
  const offset = offsetOf(work.dueDate, today);
  const at = work.dueDate ? new Date(`${work.dueDate}T${work.dueTime ?? "23:59"}:00`) : null;

  return {
    id: work.id,
    provider: "own",
    courseId: work.courseId,
    kind: "assignment",
    title: work.title.trim() || "Untitled",
    brief: work.notes ?? "",
    due: dueLabel(work.dueDate, work.dueTime, offset),
    dueAt: at && !Number.isNaN(at.getTime()) ? at.toISOString() : null,
    allDay: !work.dueTime,
    dateOffset: offset,
    minutes: work.minutes,
    bucket: bucketFor(offset),
    url: "",
    points: null,
  };
}

export function withOwnWork(assignments: Assignment[], own: OwnWork[], today = new Date()): Assignment[] {
  if (!own.length) return assignments;
  return [...assignments, ...own.map((w) => toAssignment(w, today))];
}

export function courseOf(work: OwnWork, courses: Course[]): Course | null {
  return courses.find((c) => c.id === work.courseId) ?? null;
}
