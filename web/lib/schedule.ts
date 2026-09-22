import type { Assignment, Availability, TimeSlot } from "./types";

const BUFFER_MS = 10 * 60_000;
const LOOKBACK_DAYS = 7;

function parseHm(hm: string, day: Date): Date {
  const [h, m] = hm.split(":").map(Number);
  const d = new Date(day);
  d.setHours(h || 0, m || 0, 0, 0);
  return d;
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addDays(d: Date, n: number): Date {
  const next = new Date(d);
  next.setDate(next.getDate() + n);
  return next;
}

interface Interval {
  start: number;
  end: number;
}

function subtract(window: Interval, occupied: Interval[]): Interval[] {
  let free = [window];
  const blocks = [...occupied].sort((a, b) => a.start - b.start);
  for (const block of blocks) {
    const next: Interval[] = [];
    for (const gap of free) {
      if (block.end <= gap.start || block.start >= gap.end) {
        next.push(gap);
        continue;
      }
      if (block.start > gap.start) next.push({ start: gap.start, end: Math.min(block.start, gap.end) });
      if (block.end < gap.end) next.push({ start: Math.max(block.end, gap.start), end: gap.end });
    }
    free = next.filter((g) => g.end - g.start >= 60_000);
  }
  return free;
}

function slotId(assignmentId: string, start: number): string {
  return `slot:${assignmentId}:${start}`;
}

/**
 * Pack open assignments into weekly availability.
 * Latest day that still finishes before the due time wins; spill earlier if needed.
 * Manual overrides occupy time first and are never moved.
 */
export function planSchedule(
  assignments: Assignment[],
  availability: Availability,
  overrides: TimeSlot[],
  now = new Date()
): TimeSlot[] {
  const open = assignments.filter((a) => a.bucket !== "done");
  const occupied: Interval[] = overrides.map((slot) => ({
    start: Date.parse(slot.start),
    end: Date.parse(slot.end) + BUFFER_MS,
  }));

  const ranked = [...open].sort((a, b) => {
    const aOver = (a.dateOffset ?? 0) < 0 ? -1 : 0;
    const bOver = (b.dateOffset ?? 0) < 0 ? -1 : 0;
    if (aOver !== bOver) return aOver - bOver;
    const aDue = a.dueAt ? Date.parse(a.dueAt) : Number.POSITIVE_INFINITY;
    const bDue = b.dueAt ? Date.parse(b.dueAt) : Number.POSITIVE_INFINITY;
    if (aDue !== bDue) return aDue - bDue;
    return b.minutes - a.minutes;
  });

  const generated: TimeSlot[] = [];
  const overridden = new Set(overrides.map((s) => s.assignmentId));

  for (const assignment of ranked) {
    if (overridden.has(assignment.id)) continue;
    const duration = Math.max(10, assignment.minutes) * 60_000;
    const deadline = assignment.dueAt
      ? new Date(assignment.dueAt)
      : addDays(startOfDay(now), Math.max(assignment.dateOffset ?? 7, 0) + 1);

    const placed = placeLatest(duration, deadline, now, availability, occupied);
    if (!placed) continue;

    occupied.push({ start: placed.start, end: placed.end + BUFFER_MS });
    generated.push({
      id: slotId(assignment.id, placed.start),
      assignmentId: assignment.id,
      start: new Date(placed.start).toISOString(),
      end: new Date(placed.end).toISOString(),
      minutes: assignment.minutes,
      manual: false,
    });
  }

  return [...overrides, ...generated].sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
}

function placeLatest(
  duration: number,
  deadline: Date,
  now: Date,
  availability: Availability,
  occupied: Interval[]
): Interval | null {
  const today = startOfDay(now);
  const last = startOfDay(deadline);
  const first = addDays(today, -LOOKBACK_DAYS);

  for (let day = new Date(last); day >= first; day = addDays(day, -1)) {
    const window = availability[day.getDay()];
    if (!window) continue;

    let start = parseHm(window.start, day).getTime();
    let end = parseHm(window.end, day).getTime();
    if (end <= start) continue;

    const sameDayAsDue = startOfDay(day).getTime() === last.getTime();
    if (sameDayAsDue) end = Math.min(end, deadline.getTime());
    if (startOfDay(day).getTime() === today.getTime()) start = Math.max(start, now.getTime());
    if (end - start < duration) continue;

    const free = subtract({ start, end }, occupied);
    for (let i = free.length - 1; i >= 0; i -= 1) {
      const gap = free[i];
      if (gap.end - gap.start >= duration) {
        return { start: gap.end - duration, end: gap.end };
      }
    }
  }
  return null;
}

export function unscheduledIds(assignments: Assignment[], slots: TimeSlot[]): string[] {
  const placed = new Set(slots.map((s) => s.assignmentId));
  return assignments.filter((a) => a.bucket !== "done" && !placed.has(a.id)).map((a) => a.id);
}

export function slotsOnDay(slots: TimeSlot[], day: Date): TimeSlot[] {
  const start = startOfDay(day).getTime();
  const end = addDays(startOfDay(day), 1).getTime();
  return slots.filter((s) => {
    const t = Date.parse(s.start);
    return t >= start && t < end;
  });
}
