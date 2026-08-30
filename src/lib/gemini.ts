import { GoogleGenAI, type Schema } from "@google/genai";

// Used for Job Analysis, Resume Analysis, and Resume Tailoring. AI Assistant chat uses Groq (see groq.ts).
const MODEL = "gemini-3.6-flash";
const TEMPERATURE = 0.6;

export class GeminiConfigError extends Error {
  constructor() {
    super("Gemini is not configured.");
  }
}

export class GeminiRequestError extends Error {
  // Says "AI analysis" (Job Analysis / Resume Analysis / Tailoring) — the AI Assistant chat uses Groq, not Gemini.
  constructor(message = "The AI analysis is temporarily unavailable. Please try again.") {
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

const STRUCTURED_MAX_OUTPUT_TOKENS = 4000;

// gemini-3.6-flash is a "thinking" model: without a cap, it can spend the whole
// output budget on invisible reasoning and truncate the JSON mid-string
// (finishReason "MAX_TOKENS"). Don't remove this without re-testing.
const STRUCTURED_THINKING_BUDGET = 512;

/** Returns raw JSON text matching `responseSchema` (callers parse/validate it). Only throws GeminiConfigError/GeminiRequestError — safe to surface to users. */
export async function generateStructuredReply(
  systemInstruction: string,
  userPrompt: string,
  responseSchema: Schema,
): Promise<string> {
  const ai = getClient();

  let text: string | undefined;
  try {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: userPrompt,
      config: {
        systemInstruction,
        maxOutputTokens: STRUCTURED_MAX_OUTPUT_TOKENS,
        temperature: TEMPERATURE,
        responseMimeType: "application/json",
        responseSchema,
        thinkingConfig: { thinkingBudget: STRUCTURED_THINKING_BUDGET },
      },
    });
    text = response.text;

    const finishReason = response.candidates?.[0]?.finishReason;
    if (finishReason === "MAX_TOKENS") {
      console.error("[gemini] structured response truncated (MAX_TOKENS):", {
        usageMetadata: response.usageMetadata,
      });
      throw new GeminiRequestError(
        "The AI analysis was too long to complete. Please try again — if this keeps happening, try a shorter resume or job description.",
      );
    }
  } catch (error) {
    if (error instanceof GeminiConfigError || error instanceof GeminiRequestError) throw error;
    console.error("[gemini] structured request failed:", error);
    // Free-tier daily quota exhaustion surfaces as a 429 — tell it apart from a generic failure since retrying won't help.
    const status = (error as { status?: number })?.status;
    if (status === 429) {
      throw new GeminiRequestError(
        "The AI analysis has hit its usage limit for now. Please try again later.",
      );
    }
    throw new GeminiRequestError();
  }

  if (!text || !text.trim()) {
    throw new GeminiRequestError("The AI analysis didn't return a response. Please try again.");
  }

  return text.trim();
}
