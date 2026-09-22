import { mergeRawSnapshots, type RawSnapshot } from "@/lib/normalize";
import type { LmsConnections } from "@/lib/types";
import { canvasProvider } from "./canvas/provider";
import { schoologyProvider } from "./schoology/provider";
import type { LmsPing, LmsProvider, LmsSnapshotResult } from "./types";

const PROVIDERS: LmsProvider[] = [schoologyProvider, canvasProvider];

export function connectedProviders(connections: LmsConnections): LmsProvider[] {
  return PROVIDERS.filter((p) => {
    if (p.id === "schoology") return Boolean(connections.schoology?.key && connections.schoology.secret);
    if (p.id === "canvas") return Boolean(connections.canvas?.baseUrl && connections.canvas.token);
    return false;
  });
}

export async function pingConnections(connections: LmsConnections): Promise<LmsPing> {
  const active = connectedProviders(connections);
  if (!active.length) {
    return { running: false, error: "Connect Schoology or Canvas in Settings." };
  }
  const results = await Promise.all(active.map((p) => p.ping(connections)));
  const ok = results.find((r) => r.running);
  if (ok) return ok;
  return results[0] ?? { running: false, error: "No LMS responded." };
}

export async function buildAllSnapshots(connections: LmsConnections): Promise<LmsSnapshotResult> {
  const active = connectedProviders(connections);
  if (!active.length) {
    const empty: RawSnapshot = { domain: "", courses: [], assignments: [], syncedAt: Date.now() };
    return { snapshot: empty, stats: { courses: 0, assignments: 0 }, student: "" };
  }

  const parts = await Promise.all(active.map((p) => p.buildSnapshot(connections)));
  const snapshot = mergeRawSnapshots(parts.map((p) => p.snapshot));
  return {
    snapshot,
    stats: {
      courses: snapshot.courses.length,
      assignments: snapshot.assignments.length,
    },
    student: parts.map((p) => p.student).find(Boolean) ?? "",
  };
}
