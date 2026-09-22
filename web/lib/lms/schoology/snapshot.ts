import type { RawSnapshot } from "@/lib/normalize";
import type { LmsSnapshotResult } from "@/lib/lms/types";
import {
  schoology,
  type SchoologyAssignment,
  type SchoologySection,
} from "./client";
import type { SchoologyKeys } from "./oauth";

function kindOf(a: SchoologyAssignment): "assignment" | "quiz" | "discussion" {
  switch (a.type) {
    case "test_quiz":
      return "quiz";
    case "discussion":
      return "discussion";
    default:
      return "assignment";
  }
}

function dueInstant(due: string | undefined): { dueAt: string | null; allDay: boolean } {
  const raw = (due ?? "").trim();
  if (!raw) return { dueAt: null, allDay: false };

  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/.exec(raw);
  if (!m) return { dueAt: null, allDay: false };

  const [, y, mo, d, hh, mm, ss] = m;
  const date = new Date(
    Number(y),
    Number(mo) - 1,
    Number(d),
    Number(hh ?? 0),
    Number(mm ?? 0),
    Number(ss ?? 0)
  );
  if (Number.isNaN(date.getTime())) return { dueAt: null, allDay: false };

  const allDay = hh === undefined || (hh === "00" && mm === "00");
  return { dueAt: date.toISOString(), allDay };
}

function courseName(s: SchoologySection): string {
  const title = s.course_title?.trim() || "Untitled course";
  const section = s.section_title?.trim();
  return section && section.toLowerCase() !== title.toLowerCase() ? `${title} - ${section}` : title;
}

function numeric(value: unknown): number | null {
  const n = typeof value === "string" ? parseFloat(value) : typeof value === "number" ? value : NaN;
  return Number.isFinite(n) ? n : null;
}

export async function buildSchoologySnapshot(keys: SchoologyKeys): Promise<LmsSnapshotResult> {
  const me = await schoology.me(keys);
  const uid = me.uid;
  const sections = (await schoology.sections(uid, keys)).filter((s) => !s.admin);

  const courses: RawSnapshot["courses"] = [];
  const assignments: RawSnapshot["assignments"] = [];

  for (const section of sections) {
    const id = `schoology:${section.id}`;
    const items = await schoology.assignments(String(section.id), keys).catch(() => [] as SchoologyAssignment[]);

    courses.push({
      id,
      provider: "schoology",
      name: courseName(section),
      period: section.section_school_code?.trim() || "",
      url: section.link || `https://app.schoology.com/course/${section.id}`,
    });

    for (const a of items) {
      const { dueAt, allDay } = dueInstant(a.due);
      assignments.push({
        id: `schoology:${a.id}`,
        provider: "schoology",
        courseId: id,
        title: a.title?.trim() || "Untitled",
        kind: kindOf(a),
        brief: a.description?.trim() ?? "",
        dueAt,
        allDay,
        completed: a.completed === 1,
        url: a.web_url || `https://app.schoology.com/assignment/${a.id}`,
        points: numeric(a.max_points),
      });
    }
  }

  return {
    snapshot: {
      domain: "schoology.com",
      courses,
      assignments,
      syncedAt: Date.now(),
    },
    stats: { courses: courses.length, assignments: assignments.length },
    student: me.name_display?.trim() || me.name_first?.trim() || "",
  };
}
