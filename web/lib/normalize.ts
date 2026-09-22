import { estimateMinutes } from "./estimate-local";
import type { Assignment, Bucket, Course, ItemKind, ItemSource, LmsProviderId, SyncSnapshot } from "./types";

const PALETTE = ["#D4A24A", "#3DBA9C", "#6B9AC4", "#E06A5C", "#8B7EC8", "#5C8A7A"];

export interface RawCourse {
  id: string;
  provider: LmsProviderId;
  name: string;
  period?: string;
  url?: string;
}

export interface RawAssignment {
  id: string;
  provider: ItemSource;
  courseId: string;
  title: string;
  kind?: ItemKind;
  brief?: string;
  dueAt?: string | null;
  allDay?: boolean;
  completed?: boolean;
  url?: string;
  points?: number | null;
  minutes?: number;
}

export interface RawSnapshot {
  domain: string;
  courses: RawCourse[];
  assignments: RawAssignment[];
  syncedAt?: number;
}

export function bucketFor(offset: number | null): Bucket {
  if (offset === null) return "week";
  if (offset < 0) return "overdue";
  if (offset <= 0) return "tonight";
  if (offset === 1) return "soon";
  return "week";
}

function shorten(name: string): string {
  const base = name
    .replace(/:.*$/, "")
    .replace(/\s+-\s+\d{3,6}\s*$/, "")
    .replace(/\s*[-–—(]\s*(period|per\.?|p)\s*\d+.*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
  return base.length > 22 ? `${base.slice(0, 21)}…` : base || name;
}

function offsetFromIso(iso: string, now: Date): number | null {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return null;
  const d = new Date(ms);
  const a = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const b = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((a.getTime() - b.getTime()) / 86_400_000);
}

function formatDue(iso: string, allDay: boolean): string {
  const d = new Date(iso);
  const day = d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
  if (allDay) return `Due ${day}`;
  return `Due ${day} at ${d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
}

export function normalizeSnapshot(raw: RawSnapshot, now = new Date()): SyncSnapshot {
  const courses: Course[] = (raw.courses ?? []).map((c, i) => ({
    id: c.id,
    provider: c.provider,
    name: c.name,
    short: shorten(c.name),
    period: c.period ?? "",
    color: PALETTE[i % PALETTE.length],
    url: c.url ?? "#",
  }));

  const known = new Set(courses.map((c) => c.id));

  const assignments: Assignment[] = (raw.assignments ?? [])
    .filter((a) => a.provider === "own" || known.has(a.courseId))
    .map((a) => {
      const kind = a.kind ?? "assignment";
      const dueAt = a.dueAt && !Number.isNaN(Date.parse(a.dueAt)) ? a.dueAt : null;
      const offset = dueAt ? offsetFromIso(dueAt, now) : null;
      return {
        id: a.id,
        provider: a.provider,
        courseId: a.courseId,
        kind,
        title: a.title,
        brief: a.brief ?? "",
        due: dueAt ? formatDue(dueAt, a.allDay ?? false) : "No due date",
        dueAt,
        allDay: a.allDay ?? false,
        dateOffset: offset,
        minutes: a.minutes ?? estimateMinutes(kind, a.title, a.brief ?? "", a.points),
        bucket: a.completed ? "done" : bucketFor(offset),
        url: a.url ?? "",
        points: a.points ?? null,
      };
    })
    .sort((x, y) => (x.dateOffset ?? Number.POSITIVE_INFINITY) - (y.dateOffset ?? Number.POSITIVE_INFINITY));

  return {
    domain: raw.domain,
    courses,
    assignments,
    syncedAt: raw.syncedAt ?? Date.now(),
  };
}

export function mergeRawSnapshots(parts: RawSnapshot[]): RawSnapshot {
  const courses = parts.flatMap((p) => p.courses);
  const assignments = parts.flatMap((p) => p.assignments);
  const domain = parts
    .map((p) => p.domain)
    .filter(Boolean)
    .join(",");
  return {
    domain,
    courses,
    assignments,
    syncedAt: Date.now(),
  };
}
