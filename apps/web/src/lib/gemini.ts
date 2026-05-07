import { GoogleGenAI, Type } from "@google/genai";
import { aiAdviceSchema, type AiAdvice, type Civ6Snapshot, type GameSettings } from "@civ6bot/shared";
import { env } from "./env";

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    summary: { type: Type.STRING },
    priorities: { type: Type.ARRAY, items: { type: Type.STRING } },
    risks: { type: Type.ARRAY, items: { type: Type.STRING } },
    suggestedActions: { type: Type.ARRAY, items: { type: Type.STRING } },
    questionAnswer: { type: Type.STRING }
  },
  required: ["summary", "priorities", "risks", "suggestedActions"]
};

export async function generateCiv6Advice(input: {
  kind: "analyze" | "next" | "advice";
  settings: GameSettings;
  snapshot: Civ6Snapshot;
  question?: string;
}): Promise<AiAdvice> {
  if (!env.GEMINI_API_KEY) {
    return fallbackAdvice(input.kind, input.question);
  }

  const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  const response = await ai.models.generateContent({
    model: env.GEMINI_MODEL,
    contents: [{
      role: "user",
      parts: [{ text: buildPrompt(input) }]
    }],
    config: {
      responseMimeType: "application/json",
      responseSchema,
      temperature: 0.4
    }
  });

  const text = response.text ?? "{}";
  return aiAdviceSchema.parse(JSON.parse(text));
}

function buildPrompt(input: {
  kind: "analyze" | "next" | "advice";
  settings: GameSettings;
  snapshot: Civ6Snapshot;
  question?: string;
}) {
  return [
    "You are a Civilization VI multiplayer coach for beginners.",
    "Give concise, actionable advice in Japanese.",
    "Use only the provided player snapshot and public match settings.",
    "Do not infer hidden opponent information.",
    `Request kind: ${input.kind}`,
    input.question ? `Player question: ${input.question}` : "",
    `Match settings JSON: ${JSON.stringify(input.settings)}`,
    `Player snapshot JSON: ${JSON.stringify(input.snapshot)}`
  ].filter(Boolean).join("\n");
}

function fallbackAdvice(kind: "analyze" | "next" | "advice", question?: string): AiAdvice {
  return {
    summary: "Gemini APIキーが未設定のため、簡易ルールベースの助言を返しています。",
    priorities: kind === "next"
      ? ["都市の生産を空にしない", "探索ユニットで周辺を確認する", "研究と社会制度の次の目標を決める"]
      : ["最新スナップショットを確認する", "軍事・内政・科学文化の遅れを比較する"],
    risks: ["AI分析ではないため、盤面固有の判断は限定的です。"],
    suggestedActions: ["`.env`にGEMINI_API_KEYを設定して再実行してください。"],
    questionAnswer: question ? "質問への詳細回答にはGemini APIキーが必要です。" : undefined
  };
}
