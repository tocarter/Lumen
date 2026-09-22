import { auth } from "@/auth";
import { buildAllSnapshots, pingConnections } from "@/lib/lms/registry";
import { keysFromEnv } from "@/lib/lms/schoology/client";
import type { LmsConnections } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

function connectionsFrom(body: unknown): LmsConnections {
  const raw = (body ?? {}) as LmsConnections;
  const out: LmsConnections = {};
  if (raw.schoology?.key && raw.schoology.secret) {
    out.schoology = { key: raw.schoology.key.trim(), secret: raw.schoology.secret.trim() };
  } else {
    const env = keysFromEnv();
    if (env) out.schoology = env;
  }
  if (raw.canvas?.baseUrl && raw.canvas.token) {
    out.canvas = { baseUrl: raw.canvas.baseUrl.trim(), token: raw.canvas.token.trim() };
  }
  return out;
}

export async function GET() {
  const env = keysFromEnv();
  const connections: LmsConnections = env ? { schoology: env } : {};
  const ping = await pingConnections(connections);
  return Response.json(ping);
}

export async function POST(req: Request) {
  const session = await auth();
  const body = await req.json().catch(() => ({}));
  const connections = connectionsFrom(body);

  if (!connections.schoology && !connections.canvas) {
    return Response.json(
      { error: "Connect Schoology or Canvas in Settings first." },
      { status: 400 }
    );
  }

  try {
    const result = await buildAllSnapshots(connections);
    return Response.json({
      ...result,
      signedIn: Boolean(session?.user),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Sync failed.";
    return Response.json({ error: message }, { status: 502 });
  }
}
