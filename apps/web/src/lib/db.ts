import { createClient, type Client } from "@libsql/client";
import type { Civ6Snapshot, GameSettings, MatchStatus } from "@civ6bot/shared";
import { env } from "./env";

let client: Client | undefined;
let initialized = false;

export function db() {
  client ??= createClient({
    url: env.DATABASE_URL,
    authToken: env.DATABASE_AUTH_TOKEN
  });
  return client;
}

export async function ensureDb() {
  if (initialized) return;
  const database = db();
  await database.executeMultiple(`
    CREATE TABLE IF NOT EXISTS matches (
      id TEXT PRIMARY KEY,
      guild_id TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      host_user_id TEXT NOT NULL,
      settings_json TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      ended_at TEXT
    );

    CREATE TABLE IF NOT EXISTS match_players (
      id TEXT PRIMARY KEY,
      match_id TEXT NOT NULL,
      discord_user_id TEXT NOT NULL,
      display_name TEXT NOT NULL,
      civilization TEXT,
      leader TEXT,
      client_token_hash TEXT,
      linked_at TEXT,
      last_snapshot_at TEXT,
      UNIQUE(match_id, discord_user_id)
    );

    CREATE TABLE IF NOT EXISTS link_tokens (
      code TEXT PRIMARY KEY,
      match_id TEXT NOT NULL,
      player_id TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      claimed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS snapshots (
      id TEXT PRIMARY KEY,
      match_id TEXT NOT NULL,
      player_id TEXT NOT NULL,
      turn INTEGER NOT NULL,
      year TEXT,
      era TEXT,
      hash TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(player_id, hash)
    );

    CREATE TABLE IF NOT EXISTS analyses (
      id TEXT PRIMARY KEY,
      match_id TEXT NOT NULL,
      player_id TEXT NOT NULL,
      snapshot_id TEXT,
      kind TEXT NOT NULL,
      prompt TEXT,
      result_json TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
  initialized = true;
}

export function id(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replaceAll("-", "")}`;
}

export async function createMatch(input: {
  guildId: string;
  channelId: string;
  hostUserId: string;
  settings: GameSettings;
}) {
  await ensureDb();
  const matchId = id("match");
  await db().execute({
    sql: "INSERT INTO matches (id, guild_id, channel_id, host_user_id, settings_json) VALUES (?, ?, ?, ?, ?)",
    args: [matchId, input.guildId, input.channelId, input.hostUserId, JSON.stringify(input.settings)]
  });
  return matchId;
}

export async function joinMatch(matchId: string, discordUserId: string, displayName: string) {
  await ensureDb();
  const existing = await db().execute({
    sql: "SELECT id FROM match_players WHERE match_id = ? AND discord_user_id = ?",
    args: [matchId, discordUserId]
  });
  if (existing.rows[0]?.id) return String(existing.rows[0].id);
  const playerId = id("player");
  await db().execute({
    sql: "INSERT INTO match_players (id, match_id, discord_user_id, display_name) VALUES (?, ?, ?, ?)",
    args: [playerId, matchId, discordUserId, displayName]
  });
  return playerId;
}

export async function findPlayer(matchId: string, discordUserId: string) {
  await ensureDb();
  const result = await db().execute({
    sql: "SELECT * FROM match_players WHERE match_id = ? AND discord_user_id = ?",
    args: [matchId, discordUserId]
  });
  return result.rows[0];
}

export async function latestMatchForUser(discordUserId: string) {
  await ensureDb();
  const result = await db().execute({
    sql: `SELECT m.id AS match_id, p.id AS player_id
          FROM match_players p
          JOIN matches m ON m.id = p.match_id
          WHERE p.discord_user_id = ? AND m.status = 'active'
          ORDER BY m.created_at DESC
          LIMIT 1`,
    args: [discordUserId]
  });
  return result.rows[0];
}

export async function createLinkToken(matchId: string, playerId: string) {
  await ensureDb();
  const code = crypto.randomUUID().slice(0, 8).toUpperCase();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  await db().execute({
    sql: "INSERT INTO link_tokens (code, match_id, player_id, expires_at) VALUES (?, ?, ?, ?)",
    args: [code, matchId, playerId, expiresAt]
  });
  return { code, expiresAt };
}

export async function claimLinkToken(code: string) {
  await ensureDb();
  const token = await db().execute({
    sql: "SELECT * FROM link_tokens WHERE code = ?",
    args: [code.toUpperCase()]
  });
  const row = token.rows[0];
  if (!row) return { ok: false as const, reason: "not_found" };
  if (row.claimed_at) return { ok: false as const, reason: "claimed" };
  if (new Date(String(row.expires_at)).getTime() < Date.now()) {
    return { ok: false as const, reason: "expired" };
  }
  const bearer = `civ6_${crypto.randomUUID()}_${crypto.randomUUID()}`;
  const hash = await sha256(bearer);
  await db().batch([
    {
      sql: "UPDATE link_tokens SET claimed_at = CURRENT_TIMESTAMP WHERE code = ?",
      args: [code.toUpperCase()]
    },
    {
      sql: "UPDATE match_players SET client_token_hash = ?, linked_at = CURRENT_TIMESTAMP WHERE id = ?",
      args: [hash, String(row.player_id)]
    }
  ]);
  return {
    ok: true as const,
    token: bearer,
    matchId: String(row.match_id),
    playerId: String(row.player_id)
  };
}

export async function authenticateClient(token: string) {
  await ensureDb();
  const hash = await sha256(token);
  const result = await db().execute({
    sql: "SELECT id, match_id FROM match_players WHERE client_token_hash = ?",
    args: [hash]
  });
  return result.rows[0];
}

export async function unlinkClient(token: string) {
  await ensureDb();
  const hash = await sha256(token);
  const existing = await db().execute({
    sql: "SELECT id FROM match_players WHERE client_token_hash = ?",
    args: [hash]
  });
  const row = existing.rows[0];
  if (!row) return { ok: false as const, reason: "invalid_token" };
  await db().execute({
    sql: "UPDATE match_players SET client_token_hash = NULL, linked_at = NULL WHERE id = ?",
    args: [String(row.id)]
  });
  return { ok: true as const };
}

export async function saveSnapshot(input: {
  matchId: string;
  playerId: string;
  snapshot: Civ6Snapshot;
}) {
  await ensureDb();
  const payload = JSON.stringify(input.snapshot);
  const hash = await sha256(payload);
  const snapshotId = id("snap");
  await db().execute({
    sql: `INSERT OR IGNORE INTO snapshots
          (id, match_id, player_id, turn, year, era, hash, payload_json)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      snapshotId,
      input.matchId,
      input.playerId,
      input.snapshot.turn,
      input.snapshot.year ?? null,
      input.snapshot.era ?? null,
      hash,
      payload
    ]
  });
  await db().execute({
    sql: `UPDATE match_players
          SET civilization = COALESCE(?, civilization),
              leader = COALESCE(?, leader),
              last_snapshot_at = CURRENT_TIMESTAMP
          WHERE id = ?`,
    args: [
      input.snapshot.player.civilization ?? null,
      input.snapshot.player.leader ?? null,
      input.playerId
    ]
  });
  return { snapshotId, hash };
}

export async function getLatestSnapshot(playerId: string) {
  await ensureDb();
  const result = await db().execute({
    sql: "SELECT * FROM snapshots WHERE player_id = ? ORDER BY created_at DESC LIMIT 1",
    args: [playerId]
  });
  return result.rows[0];
}

export async function saveAnalysis(input: {
  matchId: string;
  playerId: string;
  snapshotId?: string;
  kind: "analyze" | "next" | "advice";
  prompt?: string;
  result: unknown;
}) {
  await ensureDb();
  const analysisId = id("analysis");
  await db().execute({
    sql: "INSERT INTO analyses (id, match_id, player_id, snapshot_id, kind, prompt, result_json) VALUES (?, ?, ?, ?, ?, ?, ?)",
    args: [
      analysisId,
      input.matchId,
      input.playerId,
      input.snapshotId ?? null,
      input.kind,
      input.prompt ?? null,
      JSON.stringify(input.result)
    ]
  });
  return analysisId;
}

export async function publicMatch(matchId: string) {
  await ensureDb();
  const match = await db().execute({
    sql: "SELECT * FROM matches WHERE id = ?",
    args: [matchId]
  });
  const matchRow = match.rows[0];
  if (!matchRow) return null;
  const players = await db().execute({
    sql: "SELECT id, display_name, civilization, leader, linked_at, last_snapshot_at FROM match_players WHERE match_id = ? ORDER BY display_name",
    args: [matchId]
  });
  const turn = await db().execute({
    sql: "SELECT turn, year, era, created_at FROM snapshots WHERE match_id = ? ORDER BY created_at DESC LIMIT 1",
    args: [matchId]
  });
  return {
    id: String(matchRow.id),
    status: String(matchRow.status) as MatchStatus,
    settings: JSON.parse(String(matchRow.settings_json)) as GameSettings,
    createdAt: String(matchRow.created_at),
    latestTurn: turn.rows[0] ?? null,
    players: players.rows
  };
}

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
