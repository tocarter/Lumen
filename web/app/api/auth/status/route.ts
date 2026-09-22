import { googleConfigured } from "@/auth";

export async function GET() {
  return Response.json({ configured: googleConfigured });
}
