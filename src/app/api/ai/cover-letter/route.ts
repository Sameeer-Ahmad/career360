import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/api-auth";
import { NotFoundError as ApplicationNotFoundError } from "@/lib/applications/applications";
import { NotFoundError as DocumentNotFoundError } from "@/lib/documents/documents";
import {
  generateCoverLetterDraft,
  MalformedCoverLetterError,
  MissingJobDescriptionError,
  ValidationError,
} from "@/lib/cover-letter/cover-letter";
import { GeminiConfigError, GeminiRequestError } from "@/lib/gemini";
import { isValidObjectId } from "@/lib/object-id";

function parseId(value: unknown): string | null {
  return isValidObjectId(value) ? value : null;
}

/** Generates a draft PREVIEW only; the client PUTs to /api/applications/[id]/cover-letter to save it. */
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

  const applicationId = parseId(raw.applicationId);
  if (applicationId === null) {
    return NextResponse.json({ error: "A valid applicationId is required" }, { status: 400 });
  }

  const documentId = parseId(raw.documentId);
  if (documentId === null) {
    return NextResponse.json({ error: "A valid documentId is required" }, { status: 400 });
  }

  try {
    const result = await generateCoverLetterDraft(userId, applicationId, documentId);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ApplicationNotFoundError) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }
    if (error instanceof DocumentNotFoundError) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }
    if (error instanceof MissingJobDescriptionError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof GeminiConfigError) {
      console.error("[ai/cover-letter] Gemini is not configured");
      return NextResponse.json(
        { error: "The cover letter feature is not available right now." },
        { status: 503 },
      );
    }
    if (error instanceof GeminiRequestError) {
      return NextResponse.json({ error: error.message }, { status: 502 });
    }
    if (error instanceof MalformedCoverLetterError) {
      console.error("[ai/cover-letter] Gemini returned an unusable structured response");
      return NextResponse.json({ error: error.message }, { status: 502 });
    }
    throw error;
  }
}
