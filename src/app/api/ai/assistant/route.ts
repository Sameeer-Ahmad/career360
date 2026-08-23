import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getApplication, NotFoundError } from "@/lib/applications";
import {
  buildAssistantPrompt,
  CAREER_ASSISTANT_SYSTEM_INSTRUCTION,
  toApplicationContext,
  validateQuestion,
  ValidationError,
} from "@/lib/career-assistant";
import { generateAssistantReply, GeminiConfigError, GeminiRequestError } from "@/lib/gemini";

function parseApplicationId(value: unknown): number | null {
  if (value === undefined || value === null) return null;
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const raw = body as Record<string, unknown>;

  let question: string;
  try {
    question = validateQuestion(raw.question);
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }

  const applicationId = parseApplicationId(raw.applicationId);
  if (raw.applicationId !== undefined && raw.applicationId !== null && applicationId === null) {
    return NextResponse.json({ error: "Invalid applicationId" }, { status: 400 });
  }

  let context;
  if (applicationId !== null) {
    try {
      const application = await getApplication(Number(session.user.id), applicationId);
      context = toApplicationContext(application);
    } catch (error) {
      if (error instanceof NotFoundError) {
        return NextResponse.json({ error: "Application not found" }, { status: 404 });
      }
      throw error;
    }
  }

  const prompt = buildAssistantPrompt(question, context);

  try {
    const reply = await generateAssistantReply(CAREER_ASSISTANT_SYSTEM_INSTRUCTION, prompt);
    return NextResponse.json({ reply });
  } catch (error) {
    if (error instanceof GeminiConfigError) {
      console.error("[ai/assistant] Gemini is not configured");
      return NextResponse.json(
        { error: "The AI assistant is not available right now." },
        { status: 503 },
      );
    }
    if (error instanceof GeminiRequestError) {
      return NextResponse.json({ error: error.message }, { status: 502 });
    }
    throw error;
  }
}
