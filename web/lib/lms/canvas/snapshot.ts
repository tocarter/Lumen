import type { RawSnapshot } from "@/lib/normalize";
import type { LmsSnapshotResult } from "@/lib/lms/types";
import { canvas, type CanvasAssignment, type CanvasCreds } from "./client";

function kindOf(a: CanvasAssignment): "assignment" | "quiz" | "discussion" {
  const types = a.submission_types ?? [];
  if (types.includes("online_quiz")) return "quiz";
  if (types.includes("discussion_topic")) return "discussion";
  return "assignment";
}

export async function buildCanvasSnapshot(creds: CanvasCreds): Promise<LmsSnapshotResult> {
  const me = await canvas.me(creds);
  const coursesRaw = await canvas.courses(creds);

  const courses: RawSnapshot["courses"] = [];
  const assignments: RawSnapshot["assignments"] = [];

  for (const course of coursesRaw) {
    const id = `canvas:${course.id}`;
    courses.push({
      id,
      provider: "canvas",
      name: course.name?.trim() || "Untitled course",
      period: course.course_code?.trim() || "",
      url: course.html_url || `${creds.baseUrl.replace(/\/+$/, "")}/courses/${course.id}`,
    });

    const items = await canvas.assignments(creds, course.id).catch(() => [] as CanvasAssignment[]);
    for (const a of items) {
      if (a.published === false) continue;
      const dueAt = a.due_at && !Number.isNaN(Date.parse(a.due_at)) ? a.due_at : null;
      const state = a.submission?.workflow_state;
      assignments.push({
        id: `canvas:${a.id}`,
        provider: "canvas",
        courseId: id,
        title: a.name?.trim() || "Untitled",
        kind: kindOf(a),
        brief: "",
        dueAt,
        allDay: false,
        completed: state === "submitted" || state === "graded",
        url: a.html_url || "",
        points: typeof a.points_possible === "number" ? a.points_possible : null,
      });
    }
  }

  return {
    snapshot: {
      domain: new URL(creds.baseUrl).host,
      courses,
      assignments,
      syncedAt: Date.now(),
    },
    stats: { courses: courses.length, assignments: assignments.length },
    student: me.short_name?.trim() || me.name?.trim() || "",
  };
}
