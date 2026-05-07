import nacl from "tweetnacl";
import { env } from "./env";

export const InteractionType = {
  Ping: 1,
  ApplicationCommand: 2,
  MessageComponent: 3,
  ModalSubmit: 5
} as const;

export const InteractionResponseType = {
  Pong: 1,
  ChannelMessageWithSource: 4,
  DeferredChannelMessageWithSource: 5,
  DeferredUpdateMessage: 6,
  Modal: 9
} as const;

export function jsonResponse(body: unknown, status = 200) {
  return Response.json(body, { status });
}

export async function verifyDiscordRequest(request: Request, rawBody: string) {
  const signature = request.headers.get("x-signature-ed25519");
  const timestamp = request.headers.get("x-signature-timestamp");
  if (!signature || !timestamp || !env.DISCORD_PUBLIC_KEY) return false;

  const message = new TextEncoder().encode(timestamp + rawBody);
  const signatureBytes = hexToBytes(signature);
  const publicKeyBytes = hexToBytes(env.DISCORD_PUBLIC_KEY);
  return nacl.sign.detached.verify(message, signatureBytes, publicKeyBytes);
}

export function ephemeral(content: string, components?: unknown[]) {
  return {
    type: InteractionResponseType.ChannelMessageWithSource,
    data: {
      content,
      flags: 64,
      components
    }
  };
}

export function publicMessage(content: string, components?: unknown[]) {
  return {
    type: InteractionResponseType.ChannelMessageWithSource,
    data: { content, components }
  };
}

export function modal(customId: string, title: string, components: unknown[]) {
  return {
    type: InteractionResponseType.Modal,
    data: { custom_id: customId, title, components }
  };
}

export function textInput(customId: string, label: string, required = true, value?: string) {
  return {
    type: 1,
    components: [{
      type: 4,
      custom_id: customId,
      label,
      style: 1,
      required,
      value
    }]
  };
}

export function button(customId: string, label: string, style = 1) {
  return { type: 2, custom_id: customId, label, style };
}

export async function createDm(userId: string) {
  if (!env.DISCORD_BOT_TOKEN) return null;
  const response = await fetch("https://discord.com/api/v10/users/@me/channels", {
    method: "POST",
    headers: {
      authorization: `Bot ${env.DISCORD_BOT_TOKEN}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({ recipient_id: userId })
  });
  if (!response.ok) return null;
  return await response.json() as { id: string };
}

export async function sendDiscordMessage(channelId: string, content: string) {
  if (!env.DISCORD_BOT_TOKEN) return false;
  const response = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
    method: "POST",
    headers: {
      authorization: `Bot ${env.DISCORD_BOT_TOKEN}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({ content })
  });
  return response.ok;
}

function hexToBytes(hex: string) {
  return new Uint8Array(hex.match(/.{1,2}/g)?.map((byte) => Number.parseInt(byte, 16)) ?? []);
}
