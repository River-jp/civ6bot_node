import { publicMatch } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const match = await publicMatch(id);
  if (!match) return Response.json({ ok: false, reason: "not_found" }, { status: 404 });
  return Response.json({ ok: true, match });
}
