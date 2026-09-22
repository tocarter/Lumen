import type { LmsConnections, LmsProviderId } from "@/lib/types";
import type { RawSnapshot } from "@/lib/normalize";

export interface LmsPing {
  running: boolean;
  student?: string;
  error?: string;
}

export interface LmsSnapshotResult {
  snapshot: RawSnapshot;
  stats: { courses: number; assignments: number };
  student: string;
}

export interface LmsProvider {
  id: LmsProviderId;
  label: string;
  ping: (connections: LmsConnections) => Promise<LmsPing>;
  buildSnapshot: (connections: LmsConnections) => Promise<LmsSnapshotResult>;
}
