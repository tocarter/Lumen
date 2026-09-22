import type { Assignment, Bucket, TimeSlot } from "./types";

export const FOCUS_CHANNEL = "lumen-focus";

export interface FocusState {
  title: string;
  elapsed: number;
  paused: boolean;
  activeId: string | null;
  course: string;
}

export type FocusMessage =
  | ({ type: "state" } & FocusState)
  | { type: "pause" }
  | { type: "resume" }
  | { type: "skip" }
  | { type: "done" }
  | { type: "expand" }
  | { type: "close" };

export function todayBucket(): Bucket {
  return "tonight";
}

/**
 * Blitzit rule: Today tasks with a future scheduled start are not eligible.
 * Undated / already-due / past-slot items can go live.
 */
export function isFocusEligible(a: Assignment, bucket: Bucket, slots: TimeSlot[], now = Date.now()): boolean {
  if (bucket === "done") return false;
  if (bucket !== "tonight" && bucket !== "overdue") return false;
  const slot = slots.find((s) => s.assignmentId === a.id);
  if (!slot) return true;
  return Date.parse(slot.start) <= now;
}

export function isElectron(): boolean {
  return typeof navigator !== "undefined" && /Electron/i.test(navigator.userAgent);
}
