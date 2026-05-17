import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, test } from "node:test";
import { readNewExports } from "./index.js";

let tempDir = "";

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "civ6bot-client-"));
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

test("readNewExports ignores an unfinished final export line and keeps the offset before it", async () => {
  const completePayload = JSON.stringify({
    exportVersion: 1,
    turn: 1,
    player: {},
    cities: [],
    units: [],
    technologies: [],
    civics: [],
    resources: {},
    diplomacy: []
  });
  const completeLine = `CIV6BOT_EXPORT:${completePayload}\n`;
  const partialLine = 'CIV6BOT_EXPORT:{"exportVersion":1,"turn":2,"player":{"civilization":"Japan';
  const logPath = join(tempDir, "Lua.log");
  await writeFile(logPath, completeLine + partialLine, "utf8");

  const result = await readNewExports(logPath, 0);

  assert.deepEqual(result.payloads, [completePayload]);
  assert.equal(result.offset, Buffer.byteLength(completeLine));
});

test("readNewExports includes a complete final export line without a trailing newline", async () => {
  const completePayload = JSON.stringify({
    exportVersion: 1,
    turn: 3,
    player: {},
    cities: [],
    units: [],
    technologies: [],
    civics: [],
    resources: {},
    diplomacy: []
  });
  const logPath = join(tempDir, "Lua.log");
  await writeFile(logPath, `CIV6BOT_EXPORT:${completePayload}`, "utf8");

  const result = await readNewExports(logPath, 0);

  assert.deepEqual(result.payloads, [completePayload]);
  assert.equal(result.offset, Buffer.byteLength(`CIV6BOT_EXPORT:${completePayload}`));
});
