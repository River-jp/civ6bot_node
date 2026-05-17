import { handleInteraction } from "@/lib/discord-interactions";
import { jsonResponse, verifyDiscordRequest } from "@/lib/discord";
import { after } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const verified = await verifyDiscordRequest(request, rawBody);
  if (!verified) return new Response("invalid request signature", { status: 401 });

  const interaction = JSON.parse(rawBody);
  const appBaseUrl = new URL(request.url).origin;
  interaction.app_base_url = appBaseUrl;
  return jsonResponse(await handleInteraction(interaction, (task) => after(task)));
}
