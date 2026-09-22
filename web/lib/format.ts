export function fmtElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

export function fmtMinutes(m: number): string {
  if (m <= 0) return "0m";
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (!h) return `${r}m`;
  return r ? `${h}h ${r}m` : `${h}h`;
}

export function nowLabel(): string {
  return new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function dateFromOffset(offset: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d;
}

export function fmtClock(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function fmtDay(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const a = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const b = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const days = Math.round((a.getTime() - b.getTime()) / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days === -1) return "Yesterday";
  return d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
}

export function fmtRange(start: string, end: string): string {
  return `${fmtClock(start)} – ${fmtClock(end)}`;
}

export function weekdayName(day: number): string {
  return ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][day] ?? "";
}

export function providerLabel(provider: string): string {
  if (provider === "canvas") return "Canvas";
  if (provider === "schoology") return "Schoology";
  if (provider === "own") return "Personal";
  return provider;
}
