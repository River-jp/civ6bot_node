import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { createPrivateTextChannel, deleteDiscordChannel } from "./discord";
import { env } from "./env";

const originalFetch = globalThis.fetch;
const originalToken = env.DISCORD_BOT_TOKEN;

afterEach(() => {
  globalThis.fetch = originalFetch;
  env.DISCORD_BOT_TOKEN = originalToken;
});

test("createPrivateTextChannel creates a guild channel visible only to the player and bot", async () => {
  env.DISCORD_BOT_TOKEN = "token";
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  globalThis.fetch = (async (url, init) => {
    calls.push({ url: String(url), init });
    return Response.json({ id: "channel_123" });
  }) as typeof fetch;

  const channel = await createPrivateTextChannel({
    guildId: "guild_1",
    userId: "user_1",
    botUserId: "bot_1",
    name: "civ6-match-alice"
  });

  assert.deepEqual(channel, { id: "channel_123" });
  const call = calls[0];
  assert.ok(call);
  assert.equal(call.url, "https://discord.com/api/v10/guilds/guild_1/channels");
  assert.equal(call.init?.method, "POST");
  const body = JSON.parse(String(call.init?.body));
  assert.equal(body.type, 0);
  assert.equal(body.name, "civ6-match-alice");
  assert.deepEqual(body.permission_overwrites, [
    { id: "guild_1", type: 0, deny: "1024" },
    { id: "user_1", type: 1, allow: "2147552256" },
    { id: "bot_1", type: 1, allow: "2147552256" }
  ]);
});

test("deleteDiscordChannel deletes the Discord channel by id", async () => {
  env.DISCORD_BOT_TOKEN = "token";
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  globalThis.fetch = (async (url, init) => {
    calls.push({ url: String(url), init });
    return new Response(null, { status: 204 });
  }) as typeof fetch;

  const deleted = await deleteDiscordChannel("channel_123");

  assert.equal(deleted, true);
  const call = calls[0];
  assert.ok(call);
  assert.equal(call.url, "https://discord.com/api/v10/channels/channel_123");
  assert.equal(call.init?.method, "DELETE");
});
