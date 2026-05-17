import { gameSettingsSchema, civ6SnapshotSchema, type Civ6Snapshot, type GameSettings } from "@civ6bot/shared";
import { closePlayerSession, createLinkToken, createMatch, findPlayer, findPlayerByPrivateChannel, getLatestSnapshot, joinMatch, latestMatchForUser, publicMatch, saveAnalysis, setPlayerPrivateChannel } from "./db";
import { button, createPrivateTextChannel, deleteDiscordChannel, ephemeral, InteractionResponseType, modal, publicMessage, sendDiscordMessage, textInput } from "./discord";
import { env } from "./env";
import { generateCiv6Advice } from "./gemini";

type DiscordOption = { name: string; value?: string | number | boolean };
type DiscordInteraction = {
  type: number;
  application_id?: string;
  token?: string;
  data?: {
    name?: string;
    custom_id?: string;
    components?: Array<{ components?: Array<{ custom_id: string; value: string }> }>;
    options?: DiscordOption[];
  };
  guild_id?: string;
  channel_id?: string;
  member?: { user?: { id: string; username?: string; global_name?: string } };
  user?: { id: string; username?: string; global_name?: string };
  app_base_url?: string;
};

export async function handleCommand(interaction: DiscordInteraction) {
  const name = interaction.data?.name;
  if (name === "start") return startModal();
  if (name === "link") return link(interaction);
  if (name === "analyze") return adviceCommand(interaction, "analyze");
  if (name === "next") return adviceCommand(interaction, "next");
  if (name === "advice") return adviceCommand(interaction, "advice");
  if (name === "status") return status(interaction);
  if (name === "close") return close(interaction);
  if (name === "help") return ephemeral(helpText());
  return ephemeral("未対応のコマンドです。`/help`を確認してください。");
}

export async function handleComponent(interaction: DiscordInteraction) {
  const customId = interaction.data?.custom_id ?? "";
  if (customId.startsWith("join:")) {
    const matchId = customId.slice("join:".length);
    const user = userFrom(interaction);
    if (!user) return ephemeral("ユーザー情報を取得できませんでした。");
    if (!interaction.guild_id) return ephemeral("サーバー内で参加してください。");
    const playerId = await joinMatch(matchId, user.id, user.name);
    const existingPlayer = await findPlayer(matchId, user.id);
    let channelId = existingPlayer?.private_channel_id ? String(existingPlayer.private_channel_id) : "";
    if (!channelId && env.DISCORD_APPLICATION_ID) {
      const channel = await createPrivateTextChannel({
        guildId: interaction.guild_id,
        userId: user.id,
        botUserId: env.DISCORD_APPLICATION_ID,
        name: privateChannelName(user.name)
      });
      channelId = channel?.id ?? "";
      if (channelId) await setPlayerPrivateChannel(matchId, user.id, channelId);
    }
    if (channelId) {
      await sendDiscordMessage(
        channelId,
        `Civ6 Botに参加しました。\nこの専用チャンネルで /link を実行して、表示されたコードをユーザー側Node companionに入力してください。\n会話を終了して参加情報を消す場合は /close を実行してください。\nplayerId: ${playerId}`
      );
      return ephemeral(`参加しました。専用チャンネル <#${channelId}> を作成しました。`);
    }
    return ephemeral("参加しました。専用チャンネルを作成できませんでした。Botのチャンネル管理権限を確認してください。");
  }
  return ephemeral("未対応のボタンです。");
}

export async function handleModal(interaction: DiscordInteraction) {
  const customId = interaction.data?.custom_id;
  if (customId !== "start-match") return ephemeral("未対応の入力です。");
  const values = modalValues(interaction);
  const settings = gameSettingsSchema.parse({
    era: values.era,
    mapSize: values.mapSize,
    gameSpeed: values.gameSpeed,
    victoryTypes: (values.victoryTypes ?? "").split(",").map((value) => value.trim()).filter(Boolean),
    maxPlayers: Number.parseInt(values.maxPlayers || "8", 10),
    notes: values.notes || undefined
  });
  const user = userFrom(interaction);
  if (!user || !interaction.guild_id || !interaction.channel_id) {
    return ephemeral("サーバー内のチャンネルで実行してください。");
  }
  const matchId = await createMatch({
    guildId: interaction.guild_id,
    channelId: interaction.channel_id,
    hostUserId: user.id,
    settings
  });
  await joinMatch(matchId, user.id, user.name);
  const url = `${appBaseUrl(interaction)}/matches/${matchId}`;
  return publicMessage(
    [
      `Civ6 Botの試合を開始しました: ${matchId}`,
      `時代: ${settings.era} / マップ: ${settings.mapSize} / 速度: ${settings.gameSpeed}`,
      `閲覧ページ: ${url}`,
      "参加するプレイヤーは下のボタンを押してください。"
    ].join("\n"),
    [{ type: 1, components: [button(`join:${matchId}`, "参加して専用チャンネルを開始", 3)] }]
  );
}

function startModal() {
  return modal("start-match", "Civ6試合情報", [
    textInput("era", "開始時代", true, "Ancient"),
    textInput("mapSize", "マップサイズ", true, "Standard"),
    textInput("gameSpeed", "ゲーム速度", true, "Online"),
    textInput("victoryTypes", "勝利条件（カンマ区切り）", false, "Science,Culture,Diplomacy,Domination"),
    textInput("maxPlayers", "参加人数", true, "8")
  ]);
}

async function link(interaction: DiscordInteraction) {
  const user = userFrom(interaction);
  if (!user) return ephemeral("ユーザー情報を取得できませんでした。");
  const latest = await latestMatchForUser(user.id);
  if (!latest) return ephemeral("参加中のアクティブな試合がありません。先に参加ボタンを押してください。");
  const token = await createLinkToken(String(latest.match_id), String(latest.player_id));
  return ephemeral([
    "バッチファイルを起動して、次のリンクコードを入力してください。",
    `\`${token.code}\``
  ].join("\n"));
}

async function adviceCommand(interaction: DiscordInteraction, kind: "analyze" | "next" | "advice") {
  const user = userFrom(interaction);
  if (!user) return ephemeral("ユーザー情報を取得できませんでした。");
  const latest = await latestMatchForUser(user.id);
  if (!latest) return ephemeral("参加中のアクティブな試合がありません。");
  const snapshotRow = await getLatestSnapshot(String(latest.player_id));
  if (!snapshotRow) return ephemeral("まだインゲーム情報が送信されていません。ホットキーで出力してから再実行してください。");
  const match = await publicMatch(String(latest.match_id));
  if (!match) return ephemeral("試合情報が見つかりません。");

  const question = kind === "advice" ? String(interaction.data?.options?.find((option) => option.name === "question")?.value ?? "") : undefined;
  const snapshot = civ6SnapshotSchema.parse(JSON.parse(String(snapshotRow.payload_json))) as Civ6Snapshot;
  const result = await generateCiv6Advice({ kind, settings: match.settings, snapshot, question });
  await saveAnalysis({
    matchId: String(latest.match_id),
    playerId: String(latest.player_id),
    snapshotId: String(snapshotRow.id),
    kind,
    prompt: question,
    result
  });
  return ephemeral(formatAdvice(result));
}

export async function runAdviceCommand(interaction: DiscordInteraction, kind: "analyze" | "next" | "advice") {
  const response = await adviceCommand(interaction, kind);
  return String(response.data.content ?? "結果を取得できませんでした。");
}

async function status(interaction: DiscordInteraction) {
  const user = userFrom(interaction);
  if (!user) return ephemeral("ユーザー情報を取得できませんでした。");
  const latest = await latestMatchForUser(user.id);
  if (!latest) return ephemeral("参加中のアクティブな試合がありません。");
  const player = await findPlayer(String(latest.match_id), user.id);
  return ephemeral([
    `試合: ${latest.match_id}`,
    `リンク: ${player?.linked_at ? "済み" : "未リンク"}`,
    `最終スナップショット: ${player?.last_snapshot_at ?? "なし"}`,
    `閲覧ページ: ${appBaseUrl(interaction)}/matches/${latest.match_id}`
  ].join("\n"));
}

async function close(interaction: DiscordInteraction) {
  const user = userFrom(interaction);
  if (!user || !interaction.channel_id) return ephemeral("ユーザー情報またはチャンネル情報を取得できませんでした。");
  const session = await findPlayerByPrivateChannel(interaction.channel_id, user.id);
  if (!session) return ephemeral("このコマンドは自分のCiv6 Bot専用チャンネルで実行してください。");
  const result = await closePlayerSession(String(session.match_id), user.id);
  if (!result.ok) return ephemeral("参加情報が見つかりませんでした。");
  await sendDiscordMessage(interaction.channel_id, "参加情報を削除しました。このチャンネルを閉じます。");
  await deleteDiscordChannel(interaction.channel_id);
  return ephemeral("参加情報を削除しました。");
}

function appBaseUrl(interaction: DiscordInteraction) {
  return (interaction.app_base_url ?? env.APP_BASE_URL).replace(/\/$/, "");
}

function privateChannelName(displayName: string) {
  const safeName = displayName.toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 32);
  return `civ6-${safeName || "player"}`;
}

function userFrom(interaction: DiscordInteraction) {
  const user = interaction.member?.user ?? interaction.user;
  if (!user?.id) return null;
  return { id: user.id, name: user.global_name ?? user.username ?? user.id };
}

function modalValues(interaction: DiscordInteraction) {
  const result: Record<string, string> = {};
  for (const row of interaction.data?.components ?? []) {
    for (const component of row.components ?? []) result[component.custom_id] = component.value;
  }
  return result;
}

function formatAdvice(result: { summary: string; priorities: string[]; risks: string[]; suggestedActions: string[]; questionAnswer?: string }) {
  return [
    `概要: ${result.summary}`,
    result.questionAnswer ? `回答: ${result.questionAnswer}` : "",
    result.priorities.length ? `優先: ${result.priorities.map((item) => `\n- ${item}`).join("")}` : "",
    result.suggestedActions.length ? `行動: ${result.suggestedActions.map((item) => `\n- ${item}`).join("")}` : "",
    result.risks.length ? `注意: ${result.risks.map((item) => `\n- ${item}`).join("")}` : ""
  ].filter(Boolean).join("\n");
}

function helpText() {
  return [
    "`/start`: 試合を作成します。",
    "`/link`: ユーザー側Node companionとのリンクコードを発行します。",
    "`/analyze`: 最新データを分析します。",
    "`/next`: 次にやることを提案します。",
    "`/advice question:<質問>`: 任意質問に答えます。",
    "`/status`: 自分のリンク状態を確認します。",
    "`/close`: 専用チャンネルと自分の参加情報を削除します。"
  ].join("\n");
}
