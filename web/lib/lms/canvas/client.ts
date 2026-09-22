export class CanvasError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly unauthorized: boolean
  ) {
    super(message);
    this.name = "CanvasError";
  }
}

export interface CanvasCreds {
  baseUrl: string;
  token: string;
}

function originOf(baseUrl: string): string {
  let trimmed = baseUrl.trim().replace(/\/+$/, "");
  if (!/^https?:\/\//i.test(trimmed)) trimmed = `https://${trimmed}`;
  try {
    return new URL(trimmed).origin;
  } catch {
    throw new CanvasError("Canvas URL looks invalid. Use https://your-school.instructure.com", 400, false);
  }
}

async function get<T>(creds: CanvasCreds, path: string): Promise<T> {
  const url = path.startsWith("http") ? path : `${originOf(creds.baseUrl)}${path}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${creds.token.trim()}`,
      Accept: "application/json",
    },
    cache: "no-store",
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) {
    throw new CanvasError(
      res.status === 401 || res.status === 403
        ? "Canvas rejected the access token. Generate a new one under Account → Settings."
        : `Canvas returned ${res.status} for ${path}`,
      res.status,
      res.status === 401 || res.status === 403
    );
  }
  return (await res.json()) as T;
}

async function getAll<T>(creds: CanvasCreds, path: string): Promise<T[]> {
  const out: T[] = [];
  let next: string | null = `${originOf(creds.baseUrl)}${path}${path.includes("?") ? "&" : "?"}per_page=100`;
  for (let page = 0; next && page < 20; page += 1) {
    const res = await fetch(next, {
      headers: {
        Authorization: `Bearer ${creds.token.trim()}`,
        Accept: "application/json",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) {
      throw new CanvasError(
        res.status === 401 || res.status === 403
          ? "Canvas rejected the access token. Generate a new one under Account → Settings."
          : `Canvas returned ${res.status}`,
        res.status,
        res.status === 401 || res.status === 403
      );
    }
    const body = (await res.json()) as T[];
    if (Array.isArray(body)) out.push(...body);
    next = parseNext(res.headers.get("link"));
  }
  return out;
}

function parseNext(link: string | null): string | null {
  if (!link) return null;
  const part = link.split(",").find((p) => p.includes('rel="next"'));
  const m = part?.match(/<([^>]+)>/);
  return m?.[1] ?? null;
}

export interface CanvasUser {
  name?: string;
  short_name?: string;
}

export interface CanvasCourse {
  id: number;
  name: string;
  course_code?: string;
  html_url?: string;
}

export interface CanvasAssignment {
  id: number;
  name: string;
  description?: string | null;
  due_at?: string | null;
  points_possible?: number | null;
  html_url?: string;
  submission_types?: string[];
  published?: boolean;
  submission?: { workflow_state?: string } | null;
}

export const canvas = {
  me: (creds: CanvasCreds) => get<CanvasUser>(creds, "/api/v1/users/self"),
  courses: (creds: CanvasCreds) =>
    getAll<CanvasCourse>(creds, "/api/v1/courses?enrollment_state=active"),
  assignments: (creds: CanvasCreds, courseId: number) =>
    getAll<CanvasAssignment>(
      creds,
      `/api/v1/courses/${courseId}/assignments?include[]=submission`
    ),
};
