import { civ6SnapshotSchema } from "@civ6bot/shared";
import { authenticateClient, saveSnapshot } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = request.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice("Bearer ".length) : "";
  if (!token) return Response.json({ ok: false, reason: "missing_token" }, { status: 401 });

  const player = await authenticateClient(token);
  if (!player) return Response.json({ ok: false, reason: "invalid_token" }, { status: 401 });

  const snapshot = civ6SnapshotSchema.parse(await request.json());
  const saved = await saveSnapshot({
    matchId: String(player.match_id),
    playerId: String(player.id),
    snapshot
  });
  return Response.json({ ok: true, ...saved });
}
