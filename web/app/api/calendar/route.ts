import { auth } from "@/auth";
import type { TimeSlot } from "@/lib/types";

const CAL_API = "https://www.googleapis.com/calendar/v3";

interface SyncBody {
  slots?: TimeSlot[];
  titles?: Record<string, string>;
  calendarId?: string | null;
  eventIds?: Record<string, string>;
  unlink?: boolean;
}

async function gfetch(accessToken: string, path: string, init?: RequestInit) {
  const res = await fetch(`${CAL_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Google Calendar ${res.status}: ${text.slice(0, 240)}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

async function ensureCalendar(accessToken: string, existing: string | null | undefined): Promise<string> {
  if (existing) {
    try {
      await gfetch(accessToken, `/calendars/${encodeURIComponent(existing)}`);
      return existing;
    } catch {
      /* recreate */
    }
  }
  const created = await gfetch(accessToken, "/calendars", {
    method: "POST",
    body: JSON.stringify({ summary: "Lumen", description: "Study blocks from Lumen" }),
  });
  return created.id as string;
}

export async function POST(req: Request) {
  const session = await auth();
  const accessToken = session?.accessToken;
  if (!accessToken || !session.hasCalendar) {
    return Response.json(
      { error: "Sign in with Google and allow Calendar access to link events." },
      { status: 401 }
    );
  }

  const body = (await req.json().catch(() => ({}))) as SyncBody;

  if (body.unlink && body.calendarId) {
    try {
      await gfetch(accessToken, `/calendars/${encodeURIComponent(body.calendarId)}`, {
        method: "DELETE",
      });
    } catch {
      /* already gone */
    }
    return Response.json({ calendarId: null, eventIds: {} });
  }

  const calendarId = await ensureCalendar(accessToken, body.calendarId ?? null);
  const eventIds: Record<string, string> = { ...(body.eventIds ?? {}) };
  const titles = body.titles ?? {};

  for (const slot of body.slots ?? []) {
    const payload = {
      summary: titles[slot.assignmentId] ?? "Study block",
      description: "Scheduled by Lumen",
      start: { dateTime: slot.start },
      end: { dateTime: slot.end },
    };
    const existing = eventIds[slot.assignmentId];
    if (existing) {
      try {
        await gfetch(
          accessToken,
          `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(existing)}`,
          { method: "PATCH", body: JSON.stringify(payload) }
        );
        continue;
      } catch {
        delete eventIds[slot.assignmentId];
      }
    }
    const created = await gfetch(accessToken, `/calendars/${encodeURIComponent(calendarId)}/events`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    eventIds[slot.assignmentId] = created.id as string;
  }

  return Response.json({ calendarId, eventIds });
}
