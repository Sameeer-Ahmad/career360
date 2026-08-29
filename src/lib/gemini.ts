import { GoogleGenAI, type Schema } from "@google/genai";

// Flash tier — fast and cost-effective. Used for Job Analysis, Resume
// Analysis, and Resume Tailoring's structured output. (The AI Assistant
// uses Groq instead — see src/lib/groq.ts.)
const MODEL = "gemini-3.6-flash";
const TEMPERATURE = 0.6;

export class GeminiConfigError extends Error {
  constructor() {
    super("Gemini is not configured.");
  }
}

export class GeminiRequestError extends Error {
  // Gemini only powers Job Analysis, Resume Analysis, and Resume Tailoring
  // (the AI Assistant chat uses Groq — see src/lib/groq.ts) — this default
  // message previously said "AI assistant", which read as a report of the
  // wrong feature being down and caused real confusion.
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

// gemini-3.6-flash is a "thinking" model: without an explicit cap, it can
// spend most (or all) of maxOutputTokens on invisible internal reasoning
// before ever emitting the actual JSON, truncating the response mid-string
// (finishReason "MAX_TOKENS", unparsable JSON). Root-caused via live
// reproduction on 2026-08-23: a richer prompt (Master Resume + longer JD)
// pushed thoughtsTokenCount to ~1900 of a 2000 budget, leaving ~70 tokens
// for output. Capping the thinking budget fixed it in every reproduction
// (and was faster: ~8s vs ~12-16s) — do not remove this without re-testing
// against a real Gemini request first.
const STRUCTURED_THINKING_BUDGET = 512;

/**
 * Asks Gemini to return JSON matching `responseSchema` and returns the raw
 * JSON text (unparsed — callers own parsing/validation of their own
 * response shape). Never throws the underlying Gemini/network error to the
 * caller — only GeminiConfigError or GeminiRequestError, both safe to
 * surface to users.
 */
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
    // Gemini's free-tier daily quota (20 requests/day for gemini-3.6-flash)
    // surfaces as a 429 — worth telling the user apart from a generic
    // failure, since "try again" a moment later won't help but waiting
    // will.
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
