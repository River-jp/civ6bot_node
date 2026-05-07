#!/usr/bin/env node
import { civ6SnapshotSchema } from "@civ6bot/shared";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

type Config = {
  serverUrl: string;
  token?: string;
  matchId?: string;
  playerId?: string;
  logPath: string;
  lastOffset?: number;
  lastHash?: string;
};

const exportPrefix = "CIV6BOT_EXPORT:";
const defaultLogPath = join(homedir(), "Documents", "My Games", "Sid Meier's Civilization VI", "Logs", "Lua.log");
const configPath = join(homedir(), ".civ6bot-client.json");

async function main() {
  const [command, ...rest] = process.argv.slice(2);
  const args = parseArgs(rest);
  if (command === "claim") return claim(args);
  if (command === "watch") return watch(args);
  if (command === "send-once") return sendOnce(args);
  help();
}

async function claim(args: Record<string, string>) {
  const code = required(args.code, "--code");
  const serverUrl = args.server ?? "http://localhost:3000";
  const response = await fetch(`${serverUrl}/api/client/claim`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ code })
  });
  const json = await response.json() as { ok: boolean; token?: string; matchId?: string; playerId?: string; reason?: string };
  if (!response.ok || !json.ok || !json.token || !json.matchId || !json.playerId) {
    throw new Error(`claim failed: ${json.reason ?? response.statusText}`);
  }
  const config = loadConfig();
  saveConfig({
    ...config,
    serverUrl,
    token: json.token,
    matchId: json.matchId,
    playerId: json.playerId,
    logPath: args.log ?? config.logPath ?? defaultLogPath
  });
  console.log(`Linked. Config saved to ${configPath}`);
}

async function watch(args: Record<string, string>) {
  const config = withOverrides(loadConfig(), args);
  requireLinked(config);
  console.log(`Watching ${config.logPath}`);
  console.log(`Sending snapshots to ${config.serverUrl}`);
  let offset = config.lastOffset ?? initialOffset(config.logPath);

  setInterval(async () => {
    try {
      const result = await readNewExports(config.logPath, offset);
      offset = result.offset;
      for (const payload of result.payloads) {
        const sent = await sendPayload(config, payload);
        if (sent) saveConfig({ ...config, lastOffset: offset, lastHash: hash(payload) });
      }
    } catch (error) {
      console.error(error instanceof Error ? error.message : error);
    }
  }, Number.parseInt(args.interval ?? "2000", 10));
}

async function sendOnce(args: Record<string, string>) {
  const config = withOverrides(loadConfig(), args);
  requireLinked(config);
  const result = await readNewExports(config.logPath, config.lastOffset ?? 0);
  for (const payload of result.payloads) await sendPayload(config, payload);
  saveConfig({ ...config, lastOffset: result.offset });
}

async function readNewExports(logPath: string, offset: number) {
  if (!existsSync(logPath)) throw new Error(`Lua.log not found: ${logPath}`);
  const currentSize = statSync(logPath).size;
  const safeOffset = offset > currentSize ? 0 : offset;
  const content = readFileSync(logPath, "utf8").slice(safeOffset);
  const payloads = content
    .split(/\r?\n/)
    .map((line) => {
      const index = line.indexOf(exportPrefix);
      return index >= 0 ? line.slice(index + exportPrefix.length).trim() : "";
    })
    .filter(Boolean);
  return { offset: currentSize, payloads };
}

async function sendPayload(config: Config, payload: string) {
  const payloadHash = hash(payload);
  if (payloadHash === config.lastHash) return false;
  const snapshot = civ6SnapshotSchema.parse(JSON.parse(payload));
  const response = await fetch(`${config.serverUrl}/api/client/snapshots`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${config.token}`
    },
    body: JSON.stringify(snapshot)
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`snapshot upload failed: ${response.status} ${text}`);
  }
  console.log(`Uploaded turn ${snapshot.turn}`);
  return true;
}

function parseArgs(args: string[]) {
  const result: Record<string, string> = {};
  for (let index = 0; index < args.length; index += 1) {
    const key = args[index];
    const value = args[index + 1];
    if (key?.startsWith("--") && value) {
      result[key.slice(2)] = value;
      index += 1;
    }
  }
  return result;
}

function loadConfig(): Config {
  if (!existsSync(configPath)) {
    return { serverUrl: "http://localhost:3000", logPath: defaultLogPath };
  }
  return JSON.parse(readFileSync(configPath, "utf8")) as Config;
}

function saveConfig(config: Config) {
  writeFileSync(configPath, JSON.stringify(config, null, 2));
}

function withOverrides(config: Config, args: Record<string, string>): Config {
  return {
    ...config,
    serverUrl: args.server ?? config.serverUrl,
    logPath: args.log ?? config.logPath
  };
}

function requireLinked(config: Config) {
  if (!config.token) throw new Error("Not linked. Run `npm run client -- claim --code YOUR_CODE --server https://your-app.vercel.app` first.");
}

function required(value: string | undefined, name: string) {
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

function initialOffset(logPath: string) {
  return existsSync(logPath) ? statSync(logPath).size : 0;
}

function hash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function help() {
  console.log([
    "Civ6 Bot client",
    "",
    "Commands:",
    "  claim --code CODE --server https://your-app.vercel.app [--log PATH]",
    "  watch [--server URL] [--log PATH] [--interval 2000]",
    "  send-once [--server URL] [--log PATH]"
  ].join("\n"));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
