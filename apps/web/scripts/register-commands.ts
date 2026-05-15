import { dirname, resolve } from "node:path";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
loadDotEnv(resolve(scriptDir, "../../..", ".env"));
loadDotEnv(resolve(scriptDir, "..", ".env"));

const { env } = await import("../src/lib/env");

function loadDotEnv(path: string) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator < 0) continue;
    const key = trimmed.slice(0, separator).trim();
    const rawValue = trimmed.slice(separator + 1).trim();
    if (!key || process.env[key] !== undefined) continue;
    process.env[key] = rawValue.replace(/^['"]|['"]$/g, "");
  }
}

const commands = [
  {
    name: "start",
    description: "Civ6 Botの試合を作成します"
  },
  {
    name: "link",
    description: "ユーザー側Node companionとのリンクコードを発行します"
  },
  {
    name: "analyze",
    description: "最新のインゲーム情報を分析します"
  },
  {
    name: "next",
    description: "次にやるべき行動を提案します"
  },
  {
    name: "advice",
    description: "任意の質問に対してCiv6の助言を返します",
    options: [{
      name: "question",
      description: "聞きたいこと",
      type: 3,
      required: true
    }]
  },
  {
    name: "status",
    description: "自分のリンク状態と試合状態を確認します"
  },
  {
    name: "close",
    description: "専用チャンネルと自分の参加情報を削除します"
  },
  {
    name: "help",
    description: "Civ6 Botの使い方を表示します"
  }
];

if (!env.DISCORD_APPLICATION_ID || !env.DISCORD_BOT_TOKEN) {
  throw new Error("DISCORD_APPLICATION_ID and DISCORD_BOT_TOKEN are required.");
}

const route = env.DISCORD_GUILD_ID
  ? `applications/${env.DISCORD_APPLICATION_ID}/guilds/${env.DISCORD_GUILD_ID}/commands`
  : `applications/${env.DISCORD_APPLICATION_ID}/commands`;

const response = await fetch(`https://discord.com/api/v10/${route}`, {
  method: "PUT",
  headers: {
    authorization: `Bot ${env.DISCORD_BOT_TOKEN}`,
    "content-type": "application/json"
  },
  body: JSON.stringify(commands)
});

if (!response.ok) {
  throw new Error(`Failed to register commands: ${response.status} ${await response.text()}`);
}

console.log(`Registered ${commands.length} commands.`);
