import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { handleInteraction } from "./discord-interactions";
import { InteractionResponseType, InteractionType } from "./discord";

const originalConsoleError = console.error;

afterEach(() => {
  console.error = originalConsoleError;
});

test("handleInteraction defers analyze commands before running the slow work", async () => {
  const scheduled: Array<() => Promise<void>> = [];

  const response = await handleInteraction(
    {
      type: InteractionType.ApplicationCommand,
      application_id: "app_1",
      token: "token_1",
      data: { name: "analyze" },
      member: { user: { id: "user_1", username: "Alice" } }
    },
    (task) => {
      scheduled.push(task);
    }
  );

  assert.equal(response.type, InteractionResponseType.DeferredChannelMessageWithSource);
  assert.equal(response.data?.flags, 64);
  assert.equal(scheduled.length, 1);
});

test("handleInteraction returns an ephemeral error when command handling throws", async () => {
  console.error = () => {};
  const response = await handleInteraction({
    type: InteractionType.ModalSubmit,
    data: {
      custom_id: "start-match",
      components: [{
        components: [
          { custom_id: "era", value: "Ancient" },
          { custom_id: "mapSize", value: "Standard" },
          { custom_id: "gameSpeed", value: "Online" },
          { custom_id: "maxPlayers", value: "not-a-number" }
        ]
      }]
    },
    guild_id: "guild_1",
    channel_id: "channel_1",
    member: { user: { id: "user_1", username: "Alice" } }
  });

  assert.equal(response.type, InteractionResponseType.ChannelMessageWithSource);
  assert.equal(response.data?.flags, 64);
  assert.match(response.data?.content ?? "", /処理中にエラー/);
});
