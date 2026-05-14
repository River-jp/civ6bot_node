import { handleCommand, handleComponent, handleModal } from "@/lib/discord-commands";
import { InteractionResponseType, InteractionType, jsonResponse, verifyDiscordRequest } from "@/lib/discord";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const verified = await verifyDiscordRequest(request, rawBody);
  if (!verified) return new Response("invalid request signature", { status: 401 });

  const interaction = JSON.parse(rawBody);
  const appBaseUrl = new URL(request.url).origin;
  interaction.app_base_url = appBaseUrl;
  if (interaction.type === InteractionType.Ping) {
    return jsonResponse({ type: InteractionResponseType.Pong });
  }
  if (interaction.type === InteractionType.ApplicationCommand) {
    return jsonResponse(await handleCommand(interaction));
  }
  if (interaction.type === InteractionType.MessageComponent) {
    return jsonResponse(await handleComponent(interaction));
  }
  if (interaction.type === InteractionType.ModalSubmit) {
    return jsonResponse(await handleModal(interaction));
  }
  return jsonResponse({ type: InteractionResponseType.ChannelMessageWithSource, data: { content: "未対応のInteractionです。", flags: 64 } });
}
