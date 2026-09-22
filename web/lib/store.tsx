"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { isFocusEligible } from "./focus";
import { normalizeSnapshot } from "./normalize";
import { withOwnWork, type OwnWork } from "./own-work";
import { planSchedule } from "./schedule";
import {
  DEFAULT_AVAILABILITY,
  EMPTY_SNAPSHOT,
  type Assignment,
  type Availability,
  type Bucket,
  type FocusMode,
  type GoogleCalendarLink,
  type LmsConnections,
  type Status,
  type SyncSnapshot,
  type TimeSlot,
} from "./types";

export type View = "board" | "calendar" | "settings";

const AUTO_SYNC_MS = 3 * 60_000;

function stateKey(userId: string) {
  return `lumen.${userId}.state.v1`;
}
function marksKey(userId: string) {
  return `lumen.${userId}.marks.v1`;
}

interface PersistedState {
  snapshot: SyncSnapshot;
  studentName: string;
}

interface Marks {
  status: Record<string, Status>;
  minutes: Record<string, number>;
  buckets: Record<string, Bucket>;
  ownWork: OwnWork[];
  overrides: TimeSlot[];
  connections: LmsConnections;
  availability: Availability;
  googleCalendar: GoogleCalendarLink;
  timeTotals: Record<string, number>;
  notes: Record<string, string>;
}

const EMPTY_MARKS: Marks = {
  status: {},
  minutes: {},
  buckets: {},
  ownWork: [],
  overrides: [],
  connections: {},
  availability: DEFAULT_AVAILABILITY,
  googleCalendar: { enabled: false, calendarId: null, eventIds: {} },
  timeTotals: {},
  notes: {},
};

interface Store {
  ready: boolean;
  view: View;
  setView: (view: View) => void;
  snapshot: SyncSnapshot;
  studentName: string;
  assignments: Assignment[];
  slots: TimeSlot[];
  availability: Availability;
  connections: LmsConnections;
  googleCalendar: GoogleCalendarLink;
  ownWork: OwnWork[];
  selectedId: string | null;
  select: (id: string | null) => void;
  syncing: boolean;
  syncError: string | null;
  lastSync: number;
  syncNow: (fresh?: boolean) => Promise<void>;
  statusOf: (a: Assignment) => Status;
  bucketOf: (a: Assignment) => Bucket;
  moveTo: (id: string, bucket: Bucket) => void;
  toggleDone: (id: string) => void;
  setMinutes: (id: string, minutes: number) => void;
  minutesOf: (a: Assignment) => number;
  saveOwnWork: (work: OwnWork) => void;
  removeOwnWork: (id: string) => void;
  moveSlot: (assignmentId: string, startIso: string) => void;
  clearOverride: (assignmentId: string) => void;
  setAvailability: (availability: Availability) => void;
  setConnections: (connections: LmsConnections) => void;
  setGoogleCalendarEnabled: (enabled: boolean) => Promise<void>;
  courseName: (courseId: string) => string;
  courseColor: (courseId: string) => string;
  activeTimer: string | null;
  timerPaused: boolean;
  trackedMs: (id: string) => number;
  startTimer: (id: string) => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  skipTimer: () => void;
  completeActive: () => void;
  noteOf: (id: string) => string;
  setNote: (id: string, text: string) => void;
  focusMode: FocusMode;
  focusLeaving: null | "shrink" | "slide-left" | "slide-right";
  focusDock: "left" | "right";
  openFocus: () => void;
  closeFocus: (how?: "shrink" | "slide-left" | "slide-right") => void;
  setFocusMode: (mode: FocusMode) => void;
  focusEligible: Assignment[];
}

const Ctx = createContext<Store | null>(null);

export function useStore(): Store {
  const value = useContext(Ctx);
  if (!value) throw new Error("useStore must be used inside <StoreProvider>");
  return value;
}

function readJson<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function loadMarks(userId: string): Marks {
  const saved = readJson<Marks>(marksKey(userId));
  if (!saved) return EMPTY_MARKS;
  return {
    ...EMPTY_MARKS,
    ...saved,
    availability: saved.availability ?? DEFAULT_AVAILABILITY,
    googleCalendar: saved.googleCalendar ?? EMPTY_MARKS.googleCalendar,
    connections: saved.connections ?? {},
    overrides: saved.overrides ?? [],
    ownWork: saved.ownWork ?? [],
    status: saved.status ?? {},
    minutes: saved.minutes ?? {},
    buckets: saved.buckets ?? {},
    timeTotals: saved.timeTotals ?? {},
    notes: saved.notes ?? {},
  };
}

export function StoreProvider({ userId, children }: { userId: string; children: ReactNode }) {
  const [view, setView] = useState<View>("board");
  const [snapshot, setSnapshot] = useState<SyncSnapshot>(
    () => readJson<PersistedState>(stateKey(userId))?.snapshot ?? EMPTY_SNAPSHOT
  );
  const [studentName, setStudentName] = useState(
    () => readJson<PersistedState>(stateKey(userId))?.studentName ?? ""
  );
  const [marks, setMarks] = useState<Marks>(() => loadMarks(userId));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [activeTimer, setActiveTimer] = useState<string | null>(null);
  const [timerPaused, setTimerPaused] = useState(false);
  const [timerStartedAt, setTimerStartedAt] = useState<number | null>(null);
  const [tick, setTick] = useState(0);
  const [focusMode, setFocusMode] = useState<FocusMode>("off");
  const [focusLeaving, setFocusLeaving] = useState<null | "shrink" | "slide-left" | "slide-right">(null);
  const [focusDock, setFocusDock] = useState<"left" | "right">("right");
  const marksRef = useRef(marks);
  const ready = true;

  useEffect(() => {
    marksRef.current = marks;
  }, [marks]);

  useEffect(() => {
    if (!activeTimer || timerPaused) return;
    const id = window.setInterval(() => setTick((n) => n + 1), 250);
    return () => window.clearInterval(id);
  }, [activeTimer, timerPaused]);

  useEffect(() => {
    try {
      window.localStorage.setItem(stateKey(userId), JSON.stringify({ snapshot, studentName }));
    } catch {
      /* quota */
    }
  }, [userId, snapshot, studentName]);

  useEffect(() => {
    try {
      window.localStorage.setItem(marksKey(userId), JSON.stringify(marks));
    } catch {
      /* quota */
    }
  }, [userId, marks]);

  const assignments = useMemo(() => {
    const merged = withOwnWork(snapshot.assignments, marks.ownWork);
    return merged.map((a) => {
      const minutes = marks.minutes[a.id] ?? a.minutes;
      const status = marks.status[a.id];
      const bucket = status === "done" ? "done" : (marks.buckets[a.id] ?? a.bucket);
      return { ...a, minutes, bucket };
    });
  }, [snapshot.assignments, marks.ownWork, marks.minutes, marks.status, marks.buckets]);

  const slots = useMemo(
    () => planSchedule(assignments, marks.availability, marks.overrides),
    [assignments, marks.availability, marks.overrides]
  );

  const statusOf = useCallback(
    (a: Assignment): Status => marks.status[a.id] ?? (a.bucket === "done" ? "done" : "todo"),
    [marks.status]
  );

  const bucketOf = useCallback(
    (a: Assignment): Bucket => {
      if (statusOf(a) === "done") return "done";
      return marks.buckets[a.id] ?? a.bucket;
    },
    [marks.buckets, statusOf]
  );

  const trackedMs = useCallback(
    (id: string) => {
      const base = marks.timeTotals[id] ?? 0;
      if (activeTimer === id && !timerPaused && timerStartedAt) {
        return base + Math.max(0, Date.now() - timerStartedAt);
      }
      return base;
    },
    [marks.timeTotals, activeTimer, timerPaused, timerStartedAt]
  );

  const flushTimer = useCallback(() => {
    if (!activeTimer || !timerStartedAt) return;
    const extra = timerPaused ? 0 : Math.max(0, Date.now() - timerStartedAt);
    const id = activeTimer;
    setMarks((m) => ({
      ...m,
      timeTotals: { ...m.timeTotals, [id]: (m.timeTotals[id] ?? 0) + extra },
    }));
    setTimerStartedAt(Date.now());
  }, [activeTimer, timerPaused, timerStartedAt]);

  const startTimer = useCallback(
    (id: string) => {
      flushTimer();
      setActiveTimer(id);
      setTimerPaused(false);
      setTimerStartedAt(Date.now());
    },
    [flushTimer]
  );

  const pauseTimer = useCallback(() => {
    flushTimer();
    setTimerPaused(true);
  }, [flushTimer]);

  const resumeTimer = useCallback(() => {
    setTimerPaused(false);
    setTimerStartedAt(Date.now());
  }, []);

  const focusEligible = useMemo(
    () => assignments.filter((a) => isFocusEligible(a, bucketOf(a), slots)),
    [assignments, bucketOf, slots]
  );

  const skipTimer = useCallback(() => {
    if (!activeTimer) return;
    const current = activeTimer;
    flushTimer();
    const next = focusEligible.find((a) => a.id !== current);
    if (next) {
      setActiveTimer(next.id);
      setTimerPaused(false);
      setTimerStartedAt(Date.now());
    }
  }, [activeTimer, flushTimer, focusEligible]);

  const completeActive = useCallback(() => {
    if (!activeTimer) return;
    const current = activeTimer;
    flushTimer();
    setMarks((m) => ({
      ...m,
      status: { ...m.status, [current]: "done" },
      buckets: { ...m.buckets, [current]: "done" },
    }));
    const next = focusEligible.find((a) => a.id !== current);
    if (next) {
      setActiveTimer(next.id);
      setTimerPaused(false);
      setTimerStartedAt(Date.now());
    } else {
      setActiveTimer(null);
      setTimerStartedAt(null);
    }
  }, [activeTimer, flushTimer, focusEligible]);

  const syncNow = useCallback(async () => {
    const connections = marksRef.current.connections;
    if (!connections.schoology && !connections.canvas) {
      setSyncError("Connect Schoology or Canvas in Settings.");
      return;
    }
    setSyncing(true);
    setSyncError(null);
    try {
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(connections),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Sync failed");
      const next = normalizeSnapshot(data.snapshot);
      if (next.assignments.length === 0 && snapshot.assignments.length > 0) {
        setSyncError("Sync came back empty — keeping the last board.");
        return;
      }
      setSnapshot(next);
      if (data.student) setStudentName(data.student);
    } catch (e) {
      setSyncError(e instanceof Error ? e.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  }, [snapshot.assignments.length]);

  useEffect(() => {
    const connections = marksRef.current.connections;
    if (!connections.schoology && !connections.canvas) return;
    void syncNow();
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") void syncNow();
    }, AUTO_SYNC_MS);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  const pushCalendar = useCallback(
    async (nextSlots: TimeSlot[], enabled: boolean, calendarId: string | null, titles: Record<string, string>) => {
      if (!enabled) return;
      try {
        const res = await fetch("/api/calendar", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            slots: nextSlots,
            titles,
            calendarId,
            eventIds: marksRef.current.googleCalendar.eventIds,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Calendar sync failed");
        setMarks((m) => ({
          ...m,
          googleCalendar: {
            enabled: true,
            calendarId: data.calendarId ?? null,
            eventIds: data.eventIds ?? {},
          },
        }));
      } catch (e) {
        setSyncError(e instanceof Error ? e.message : "Google Calendar sync failed");
      }
    },
    []
  );

  const minutesOf = useCallback((a: Assignment) => marks.minutes[a.id] ?? a.minutes, [marks.minutes]);

  const courseName = useCallback(
    (courseId: string) => snapshot.courses.find((c) => c.id === courseId)?.name ?? "Personal",
    [snapshot.courses]
  );

  const courseColor = useCallback(
    (courseId: string) => snapshot.courses.find((c) => c.id === courseId)?.color ?? "#3dba9c",
    [snapshot.courses]
  );

  const openFocus = useCallback(() => {
    const live = focusEligible[0];
    if (!live) {
      setSyncError("Nothing in Today is ready to focus yet. Add a task due today, or wait for its scheduled time.");
      return;
    }
    setSyncError(null);
    setFocusLeaving(null);
    setFocusMode("panel");
    startTimer(live.id);
  }, [focusEligible, startTimer]);

  const closeFocus = useCallback((how: "shrink" | "slide-left" | "slide-right" = "shrink") => {
    setFocusLeaving(how);
    if (how === "slide-left") setFocusDock("left");
    if (how === "slide-right") setFocusDock("right");
    if (how === "shrink") pauseTimer();
    window.setTimeout(() => {
      setFocusMode(how === "shrink" ? "off" : "docked");
      setFocusLeaving(null);
    }, 320);
  }, [pauseTimer]);

  const value = useMemo<Store>(
    () => {
      void tick;
      return {
      ready,
      view,
      setView,
      snapshot,
      studentName,
      assignments,
      slots,
      availability: marks.availability,
      connections: marks.connections,
      googleCalendar: marks.googleCalendar,
      ownWork: marks.ownWork,
      selectedId,
      select: setSelectedId,
      syncing,
      syncError,
      lastSync: snapshot.syncedAt,
      syncNow,
      statusOf,
      bucketOf,
      moveTo: (id, bucket) => {
        if (bucket === "overdue") return;
        setMarks((m) => ({
          ...m,
          buckets: { ...m.buckets, [id]: bucket },
          status: { ...m.status, [id]: bucket === "done" ? "done" : "todo" },
        }));
      },
      toggleDone: (id) => {
        const item = assignments.find((a) => a.id === id);
        const done = (marks.status[id] ?? (item?.bucket === "done" ? "done" : "todo")) === "done";
        setMarks((m) => ({
          ...m,
          status: { ...m.status, [id]: done ? "todo" : "done" },
        }));
        if (!done && activeTimer === id) {
          flushTimer();
          setActiveTimer(null);
          setTimerStartedAt(null);
        }
      },
      setMinutes: (id, minutes) =>
        setMarks((m) => ({ ...m, minutes: { ...m.minutes, [id]: Math.max(10, Math.min(180, minutes)) } })),
      minutesOf,
      saveOwnWork: (work) =>
        setMarks((m) => {
          const i = m.ownWork.findIndex((w) => w.id === work.id);
          const ownWork = i >= 0 ? m.ownWork.map((w) => (w.id === work.id ? work : w)) : [...m.ownWork, work];
          return { ...m, ownWork };
        }),
      removeOwnWork: (id) => setMarks((m) => ({ ...m, ownWork: m.ownWork.filter((w) => w.id !== id) })),
      moveSlot: (assignmentId, startIso) => {
        const item = assignments.find((a) => a.id === assignmentId);
        const start = Date.parse(startIso);
        if (!item || Number.isNaN(start)) return;
        const end = start + item.minutes * 60_000;
        const slot: TimeSlot = {
          id: `slot:${assignmentId}:${start}`,
          assignmentId,
          start: new Date(start).toISOString(),
          end: new Date(end).toISOString(),
          minutes: item.minutes,
          manual: true,
        };
        setMarks((m) => ({
          ...m,
          overrides: [...m.overrides.filter((s) => s.assignmentId !== assignmentId), slot],
        }));
      },
      clearOverride: (assignmentId) =>
        setMarks((m) => ({ ...m, overrides: m.overrides.filter((s) => s.assignmentId !== assignmentId) })),
      setAvailability: (availability) => setMarks((m) => ({ ...m, availability })),
      setConnections: (connections) => setMarks((m) => ({ ...m, connections })),
      setGoogleCalendarEnabled: async (enabled) => {
        if (!enabled && marks.googleCalendar.calendarId) {
          await fetch("/api/calendar", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ unlink: true, calendarId: marks.googleCalendar.calendarId }),
          }).catch(() => {});
          setMarks((m) => ({
            ...m,
            googleCalendar: { enabled: false, calendarId: null, eventIds: {} },
          }));
          return;
        }
        setMarks((m) => ({ ...m, googleCalendar: { ...m.googleCalendar, enabled } }));
        if (enabled) {
          const titles = Object.fromEntries(assignments.map((a) => [a.id, a.title]));
          await pushCalendar(slots, true, marks.googleCalendar.calendarId, titles);
        }
      },
      courseName,
      courseColor,
      activeTimer,
      timerPaused,
      trackedMs,
      startTimer,
      pauseTimer,
      resumeTimer,
      skipTimer,
      completeActive,
      noteOf: (id) => marks.notes[id] ?? "",
      setNote: (id, text) => setMarks((m) => ({ ...m, notes: { ...m.notes, [id]: text } })),
      focusMode,
      focusLeaving,
      focusDock,
      openFocus,
      closeFocus,
      setFocusMode,
      focusEligible,
      };
    },
    [
      ready,
      view,
      snapshot,
      studentName,
      assignments,
      slots,
      marks,
      selectedId,
      syncing,
      syncError,
      syncNow,
      statusOf,
      bucketOf,
      minutesOf,
      courseName,
      courseColor,
      pushCalendar,
      activeTimer,
      timerPaused,
      trackedMs,
      startTimer,
      pauseTimer,
      resumeTimer,
      skipTimer,
      completeActive,
      focusMode,
      focusLeaving,
      focusDock,
      openFocus,
      closeFocus,
      focusEligible,
      flushTimer,
      tick,
    ]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
