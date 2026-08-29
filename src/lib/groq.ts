// Server-only Groq client. Reused by the AI Assistant (free-text, multi-turn)
// and Learning (structured JSON, single-turn) — the only two Career360
// features that use Groq. Job Analysis, Resume Analysis, and Resume
// Tailoring remain on Gemini (src/lib/gemini.ts). GROQ_API_KEY is read from
// the environment and never leaves this server-side module; neither is
// resume/JD content or any other request body ever logged — only response
// status/shape diagnostics are.
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
// llama-3.3-70b-versatile was retired by Groq (confirmed via a live 404
// "model_not_found" response — 2026-08-24) and no longer appears in this
// account's /v1/models list at all. Replaced with openai/gpt-oss-120b, a
// currently-available general-purpose model on Groq.
const MODEL = "openai/gpt-oss-120b";
const MAX_OUTPUT_TOKENS = 800;
const STRUCTURED_MAX_OUTPUT_TOKENS = 2000;
const TEMPERATURE = 0.6;
// gpt-oss-120b is a reasoning model: without this, it can spend most of
// maxOutputTokens on invisible internal reasoning before emitting the
// actual reply, truncating it to empty (finish_reason "length", same
// failure mode already root-caused and fixed for Gemini in src/lib/gemini.ts).
// "low" is enough headroom for a quick reasoning pass while leaving the
// budget free for the reply itself — verified live before this change.
const REASONING_EFFORT = "low";

export class GroqConfigError extends Error {
  constructor() {
    super("Groq is not configured.");
  }
}

export class GroqRequestError extends Error {
  constructor(message = "The AI assistant is temporarily unavailable. Please try again.") {
    super(message);
  }
}

export type ConversationTurn = {
  role: "user" | "assistant";
  content: string;
};

function getApiKey(): string {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new GroqConfigError();
  }
  return apiKey;
}

type ChatCompletionChoice = {
  message?: { content?: string };
  finish_reason?: string;
};

type ChatCompletionResponse = {
  choices?: ChatCompletionChoice[];
  usage?: unknown;
};

/**
 * Shared low-level POST to Groq's chat completions endpoint — the exact
 * request/error-handling mechanics both generateAssistantReply and
 * generateStructuredReply use. Returns the first choice, or throws
 * GroqConfigError/GroqRequestError (never a raw provider/network error).
 */
async function postChatCompletion(body: Record<string, unknown>): Promise<ChatCompletionChoice> {
  const apiKey = getApiKey();

  let response: Response;
  try {
    response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  } catch (error) {
    console.error("[groq] network request failed:", error);
    throw new GroqRequestError();
  }

  if (!response.ok) {
    const detail = await response.json().catch(() => response.text().catch(() => undefined));
    console.error("[groq] request failed:", response.status, detail);
    throw new GroqRequestError();
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch (error) {
    console.error("[groq] failed to parse response JSON:", error);
    throw new GroqRequestError();
  }

  const parsed = typeof data === "object" && data !== null ? (data as ChatCompletionResponse) : {};
  const choice = parsed.choices?.[0];

  if (choice?.finish_reason === "length" && !choice.message?.content?.trim()) {
    console.error("[groq] reply truncated (finish_reason: length) with no content:", {
      usage: parsed.usage,
    });
    throw new GroqRequestError();
  }

  return choice ?? {};
}

/**
 * Sends a multi-turn conversation to Groq and returns the plain-text reply
 * to the final turn. Never throws the underlying provider/network error to
 * the caller — only GroqConfigError or GroqRequestError, both safe to
 * surface to users.
 */
export async function generateAssistantReply(
  systemInstruction: string,
  turns: ConversationTurn[],
): Promise<string> {
  const messages = [
    { role: "system", content: systemInstruction },
    ...turns.map((turn) => ({ role: turn.role, content: turn.content })),
  ];

  const choice = await postChatCompletion({
    model: MODEL,
    messages,
    max_tokens: MAX_OUTPUT_TOKENS,
    temperature: TEMPERATURE,
    reasoning_effort: REASONING_EFFORT,
  });

  const text = choice.message?.content;
  if (!text || !text.trim()) {
    throw new GroqRequestError("The AI assistant didn't return a response. Please try again.");
  }

  return text.trim();
}

/**
 * Asks Groq to return JSON matching the shape described in
 * `systemInstruction` (Groq's json_object mode enforces valid JSON syntax
 * only, not a specific schema — the caller owns parsing/validating its own
 * response shape, exactly like generateStructuredReply in gemini.ts). Used
 * by Learning; single-turn (no conversation history).
 */
export async function generateStructuredJsonReply(
  systemInstruction: string,
  userPrompt: string,
): Promise<string> {
  const choice = await postChatCompletion({
    model: MODEL,
    messages: [
      { role: "system", content: systemInstruction },
      { role: "user", content: userPrompt },
    ],
    max_tokens: STRUCTURED_MAX_OUTPUT_TOKENS,
    temperature: TEMPERATURE,
    reasoning_effort: REASONING_EFFORT,
    response_format: { type: "json_object" },
  });

  const text = choice.message?.content;
  if (!text || !text.trim()) {
    throw new GroqRequestError("The AI didn't return a response. Please try again.");
  }

  return text.trim();
}
