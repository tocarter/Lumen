export type LmsProviderId = "schoology" | "canvas";
export type ItemSource = LmsProviderId | "own";

export type ItemKind = "assignment" | "quiz" | "assessment" | "discussion" | "drive";
export type Status = "todo" | "done";
export type Bucket = "overdue" | "tonight" | "soon" | "week" | "done";
export type FocusMode = "off" | "panel" | "mini" | "docked";

export interface Course {
  id: string;
  provider: LmsProviderId;
  name: string;
  short: string;
  period: string;
  color: string;
  url: string;
}

export interface Assignment {
  id: string;
  provider: ItemSource;
  courseId: string;
  kind: ItemKind;
  title: string;
  brief: string;
  due: string;
  dueAt: string | null;
  allDay: boolean;
  dateOffset: number | null;
  minutes: number;
  bucket: Bucket;
  url: string;
  points: number | null;
}

export interface SyncSnapshot {
  domain: string;
  courses: Course[];
  assignments: Assignment[];
  syncedAt: number;
}

export interface TimeSlot {
  id: string;
  assignmentId: string;
  start: string;
  end: string;
  minutes: number;
  manual: boolean;
}

export interface DayWindow {
  start: string;
  end: string;
}

/** 0 = Sunday … 6 = Saturday. `null` means that day is off. */
export type Availability = Record<number, DayWindow | null>;

export interface SchoologyConnection {
  key: string;
  secret: string;
}

export interface CanvasConnection {
  baseUrl: string;
  token: string;
}

export interface LmsConnections {
  schoology?: SchoologyConnection;
  canvas?: CanvasConnection;
}

export interface GoogleCalendarLink {
  enabled: boolean;
  calendarId: string | null;
  eventIds: Record<string, string>;
}

export const EMPTY_SNAPSHOT: SyncSnapshot = {
  domain: "",
  courses: [],
  assignments: [],
  syncedAt: 0,
};

export const DEFAULT_AVAILABILITY: Availability = {
  0: null,
  1: { start: "16:00", end: "21:00" },
  2: { start: "16:00", end: "21:00" },
  3: { start: "16:00", end: "21:00" },
  4: { start: "16:00", end: "21:00" },
  5: { start: "16:00", end: "21:00" },
  6: null,
};
