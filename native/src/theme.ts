export const colors = {
  bg: "#0c0e10",
  bg2: "#101418",
  surface: "#161b21",
  surface2: "#1c232c",
  ink: "#eef3f1",
  ink2: "#9aa8a3",
  muted: "#6d7a76",
  line: "rgba(238, 243, 241, 0.08)",
  gold: "#d4a24a",
  teal: "#3dba9c",
  bad: "#e06a5c",
};

export type Bucket = "overdue" | "tonight" | "soon" | "week" | "done";

export type Assignment = {
  id: string;
  title: string;
  course: string;
  color: string;
  due: string;
  minutes: number;
  bucket: Bucket;
};

export const COLUMNS: { key: Bucket; label: string }[] = [
  { key: "overdue", label: "Overdue" },
  { key: "tonight", label: "Today" },
  { key: "soon", label: "Tomorrow" },
  { key: "week", label: "Later" },
  { key: "done", label: "Turned in" },
];

export const SEED: Assignment[] = [
  {
    id: "1",
    title: "Kinematics FRQ set",
    course: "AP Physics",
    color: "#6B9AC4",
    due: "Due yesterday at 11:59 PM",
    minutes: 40,
    bucket: "overdue",
  },
  {
    id: "2",
    title: "Chapter 12 reading notes",
    course: "English",
    color: "#D4A24A",
    due: "Due today at 8:00 AM",
    minutes: 25,
    bucket: "tonight",
  },
  {
    id: "3",
    title: "Limits worksheet",
    course: "AP Calculus",
    color: "#3DBA9C",
    due: "Due today at 3:30 PM",
    minutes: 35,
    bucket: "tonight",
  },
  {
    id: "4",
    title: "Lab write-up: titration",
    course: "Chemistry",
    color: "#E06A5C",
    due: "Due tomorrow at 9:00 AM",
    minutes: 50,
    bucket: "soon",
  },
  {
    id: "5",
    title: "Spanish oral practice",
    course: "Spanish 3",
    color: "#8B7EC8",
    due: "Due tomorrow",
    minutes: 20,
    bucket: "soon",
  },
  {
    id: "6",
    title: "US History DBQ outline",
    course: "US History",
    color: "#5C8A7A",
    due: "Due Fri",
    minutes: 45,
    bucket: "week",
  },
  {
    id: "7",
    title: "Code review for project 2",
    course: "CS Principles",
    color: "#D4A24A",
    due: "Due next week",
    minutes: 30,
    bucket: "week",
  },
  {
    id: "8",
    title: "Quiz corrections",
    course: "AP Calculus",
    color: "#3DBA9C",
    due: "Turned in",
    minutes: 15,
    bucket: "done",
  },
];

export function fmtMinutes(m: number): string {
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h}h ${r}m` : `${h}h`;
}

export function fmtElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}
