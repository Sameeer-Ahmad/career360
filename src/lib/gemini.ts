import { GoogleGenAI } from "@google/genai";

// Flash tier — fast and cost-effective, appropriate for a single-turn assistant reply.
const MODEL = "gemini-3.6-flash";
const MAX_OUTPUT_TOKENS = 800;
const TEMPERATURE = 0.6;

export class GeminiConfigError extends Error {
  constructor() {
    super("Gemini is not configured.");
  }
}

export class GeminiRequestError extends Error {
  constructor(message = "The AI assistant is temporarily unavailable. Please try again.") {
    super(message);
  }
}

let client: GoogleGenAI | undefined;

function getClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new GeminiConfigError();
  }
  client ??= new GoogleGenAI({ apiKey });
  return client;
}

export type ConversationTurn = {
  role: "user" | "assistant";
  content: string;
};

/**
 * Sends a multi-turn conversation to Gemini and returns the plain-text reply
 * to the final turn. Turns use this app's "user"/"assistant" role naming —
 * mapped here to Gemini's "user"/"model" convention, an implementation
 * detail callers don't need to know about.
 *
 * Never throws the underlying Gemini/network error to the caller — only
 * GeminiConfigError or GeminiRequestError, both safe to surface to users.
 */
export async function generateAssistantReply(
  systemInstruction: string,
  turns: ConversationTurn[],
): Promise<string> {
  const ai = getClient();

  const contents = turns.map((turn) => ({
    role: turn.role === "assistant" ? "model" : "user",
    parts: [{ text: turn.content }],
  }));

  let text: string | undefined;
  try {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents,
      config: {
        systemInstruction,
        maxOutputTokens: MAX_OUTPUT_TOKENS,
        temperature: TEMPERATURE,
      },
    });
    text = response.text;
  } catch (error) {
    if (error instanceof GeminiConfigError) throw error;
    console.error("[gemini] request failed:", error);
    throw new GeminiRequestError();
  }

  if (!text || !text.trim()) {
    throw new GeminiRequestError("The AI assistant didn't return a response. Please try again.");
  }

  return text.trim();
}
