import { authorizationHeader, type SchoologyKeys } from "./oauth";

const API = "https://api.schoology.com/v1";

export class SchoologyError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly unauthorized: boolean
  ) {
    super(message);
    this.name = "SchoologyError";
  }
}

export function keysFromEnv(): SchoologyKeys | null {
  const key = process.env.SCHOOLOGY_KEY?.trim();
  const secret = process.env.SCHOOLOGY_SECRET?.trim();
  if (!key || !secret) return null;
  return { key, secret };
}

async function get<T>(path: string, keys: SchoologyKeys): Promise<T> {
  const url = path.startsWith("http") ? path : `${API}${path}`;
  const res = await fetch(url, {
    headers: {
      Authorization: await authorizationHeader("GET", url, keys),
      Accept: "application/json",
    },
    cache: "no-store",
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new SchoologyError(
      res.status === 401 || res.status === 403
        ? "Schoology rejected the API key. Check the key and secret, and that your district has API access enabled."
        : `Schoology returned ${res.status} for ${path}${body ? `: ${body.slice(0, 200)}` : ""}`,
      res.status,
      res.status === 401 || res.status === 403
    );
  }
  return (await res.json()) as T;
}

async function getAll<T>(path: string, collection: string, keys: SchoologyKeys): Promise<T[]> {
  const out: T[] = [];
  let next: string | undefined = `${API}${path}${path.includes("?") ? "&" : "?"}limit=200`;
  for (let page = 0; next && page < 40; page += 1) {
    const body: Record<string, unknown> = await get(next, keys);
    const items = body[collection];
    if (Array.isArray(items)) out.push(...(items as T[]));
    const links = body.links as { next?: string } | undefined;
    next = links?.next;
  }
  return out;
}

export interface SchoologyUser {
  uid: number | string;
  name_display?: string;
  name_first?: string;
}

export interface SchoologySection {
  id: string;
  course_title: string;
  section_title?: string;
  section_school_code?: string;
  link?: string;
  admin?: number;
}

export interface SchoologyAssignment {
  id: string;
  title: string;
  description?: string;
  due?: string;
  max_points?: number;
  type?: string;
  web_url?: string;
  completed?: number;
}

export const schoology = {
  me: (keys: SchoologyKeys) => get<SchoologyUser>("/users/me", keys),
  sections: (uid: string | number, keys: SchoologyKeys) =>
    getAll<SchoologySection>(`/users/${uid}/sections`, "section", keys),
  assignments: (sectionId: string, keys: SchoologyKeys) =>
    getAll<SchoologyAssignment>(`/sections/${sectionId}/assignments`, "assignment", keys),
};
