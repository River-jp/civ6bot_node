import { z } from "zod";

export const gameSettingsSchema = z.object({
  era: z.string().min(1),
  mapSize: z.string().min(1),
  gameSpeed: z.string().min(1),
  victoryTypes: z.array(z.string()).default([]),
  maxPlayers: z.number().int().positive().max(16).default(8),
  notes: z.string().max(1000).optional()
});

export type GameSettings = z.infer<typeof gameSettingsSchema>;

export const civ6SnapshotSchema = z.object({
  exportVersion: z.literal(1),
  matchCode: z.string().optional(),
  turn: z.number().int().nonnegative(),
  year: z.string().optional(),
  era: z.string().optional(),
  player: z.object({
    civilization: z.string().optional(),
    leader: z.string().optional(),
    score: z.number().optional(),
    gold: z.number().optional(),
    faith: z.number().optional(),
    sciencePerTurn: z.number().optional(),
    culturePerTurn: z.number().optional()
  }),
  cities: z.array(z.object({
    name: z.string(),
    population: z.number().optional(),
    production: z.string().optional(),
    turnsRemaining: z.number().optional()
  })).default([]),
  units: z.array(z.object({
    type: z.string(),
    x: z.number().optional(),
    y: z.number().optional(),
    health: z.number().optional(),
    moves: z.number().optional()
  })).default([]),
  technologies: z.array(z.string()).default([]),
  civics: z.array(z.string()).default([]),
  resources: z.record(z.number()).default({}),
  diplomacy: z.array(z.object({
    civilization: z.string(),
    relationship: z.string().optional()
  })).default([]),
  raw: z.record(z.unknown()).optional()
});

export type Civ6Snapshot = z.infer<typeof civ6SnapshotSchema>;

export const aiAdviceSchema = z.object({
  summary: z.string(),
  priorities: z.array(z.string()).default([]),
  risks: z.array(z.string()).default([]),
  suggestedActions: z.array(z.string()).default([]),
  questionAnswer: z.string().optional()
});

export type AiAdvice = z.infer<typeof aiAdviceSchema>;

export type MatchStatus = "active" | "ended";
