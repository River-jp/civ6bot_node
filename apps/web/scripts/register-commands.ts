import { env } from "../src/lib/env";

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
