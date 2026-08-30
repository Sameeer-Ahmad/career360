// Server-only Groq client, used by the AI Assistant (multi-turn chat) and
// Learning (structured JSON). Job Analysis/Resume Analysis/Tailoring use
// Gemini instead (src/lib/gemini.ts). Request bodies (resume/JD content) are
// never logged — only response status/shape diagnostics are.
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "openai/gpt-oss-120b";
const MAX_OUTPUT_TOKENS = 800;
const STRUCTURED_MAX_OUTPUT_TOKENS = 2000;
const TEMPERATURE = 0.6;
// gpt-oss-120b is a reasoning model: without a cap, it can spend the whole
// output budget on invisible reasoning and return an empty reply (finish_reason "length").
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

/** Shared POST to Groq's chat completions endpoint. Returns the first choice, or throws GroqConfigError/GroqRequestError. */
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

/** Sends a multi-turn conversation to Groq and returns the reply to the final turn. */
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

/** Returns JSON text matching the shape described in `systemInstruction` (Groq only enforces valid JSON syntax, not a schema — caller validates the shape). Single-turn; used by Learning. */
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
