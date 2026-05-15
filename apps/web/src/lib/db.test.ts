import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, test } from "node:test";

let tempDir = "";
let loadedDbModule: { closeDbForTests: () => void } | undefined;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "civ6bot-db-"));
  process.env.DATABASE_URL = `file:${join(tempDir, "test.db")}`;
});

afterEach(async () => {
  loadedDbModule?.closeDbForTests();
  loadedDbModule = undefined;
});

test("closePlayerSession removes the player data and returns the private channel id", async () => {
  const dbModule = await import(`./db.ts?case=${Date.now()}`);
  loadedDbModule = dbModule;
  const matchId = await dbModule.createMatch({
    guildId: "guild_1",
    channelId: "match_channel",
    hostUserId: "host_1",
    settings: {
      era: "Ancient",
      mapSize: "Standard",
      gameSpeed: "Online",
      victoryTypes: ["Science"],
      maxPlayers: 8
    }
  });
  const playerId = await dbModule.joinMatch(matchId, "user_1", "Alice");
  await dbModule.setPlayerPrivateChannel(matchId, "user_1", "private_1");
  await dbModule.createLinkToken(matchId, playerId);
  await dbModule.saveSnapshot({
    matchId,
    playerId,
    snapshot: {
      turn: 1,
      player: { name: "Alice", civilization: "Japan", leader: "Tokugawa" }
    }
  });
  await dbModule.saveAnalysis({
    matchId,
    playerId,
    snapshotId: "snapshot_1",
    kind: "next",
    result: { summary: "test", priorities: [], risks: [], suggestedActions: [] }
  });

  const result = await dbModule.closePlayerSession(matchId, "user_1");

  assert.deepEqual(result, { ok: true, channelId: "private_1", playerId });
  assert.equal(await dbModule.findPlayer(matchId, "user_1"), undefined);
});
