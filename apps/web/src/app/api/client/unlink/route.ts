import { unlinkClient } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = request.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice("Bearer ".length) : "";
  if (!token) return Response.json({ ok: false, reason: "missing_token" }, { status: 401 });

  const result = await unlinkClient(token);
  if (!result.ok) return Response.json(result, { status: 401 });

  return Response.json({ ok: true });
}
