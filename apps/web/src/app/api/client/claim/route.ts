import { claimLinkToken } from "@/lib/db";
import { z } from "zod";

export const runtime = "nodejs";

const claimSchema = z.object({
  code: z.string().min(4).max(32)
});

export async function POST(request: Request) {
  const body = claimSchema.parse(await request.json());
  const result = await claimLinkToken(body.code);
  if (!result.ok) {
    return Response.json({ ok: false, reason: result.reason }, { status: 400 });
  }
  return Response.json({
    ok: true,
    token: result.token,
    matchId: result.matchId,
    playerId: result.playerId
  });
}
