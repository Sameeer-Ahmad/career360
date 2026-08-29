import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/api-auth";
import { getApplication, NotFoundError } from "@/lib/applications/applications";
import {
  buildSystemInstruction,
  validateMessages,
  ValidationError,
} from "@/lib/ai-assistant/career-assistant";
import { toApplicationContext } from "@/lib/application-ai-context";
import { generateAssistantReply, GroqConfigError, GroqRequestError } from "@/lib/groq";
import { isValidObjectId } from "@/lib/object-id";

function parseApplicationId(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  return isValidObjectId(value) ? value : null;
}

export async function POST(request: NextRequest) {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

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

  let messages;
  try {
    messages = validateMessages(raw.messages);
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
      const application = await getApplication(userId, applicationId);
      context = toApplicationContext(application);
    } catch (error) {
      if (error instanceof NotFoundError) {
        return NextResponse.json({ error: "Application not found" }, { status: 404 });
      }
      throw error;
    }
  }

  const systemInstruction = buildSystemInstruction(context);

  try {
    const reply = await generateAssistantReply(systemInstruction, messages);
    return NextResponse.json({ reply });
  } catch (error) {
    if (error instanceof GroqConfigError) {
      console.error("[ai/assistant] Groq is not configured");
      return NextResponse.json(
        { error: "The AI assistant is not available right now." },
        { status: 503 },
      );
    }
    if (error instanceof GroqRequestError) {
      return NextResponse.json({ error: error.message }, { status: 502 });
    }
    throw error;
  }
}
