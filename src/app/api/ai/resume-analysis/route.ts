import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/api-auth";
import { getApplication, NotFoundError as ApplicationNotFoundError } from "@/lib/applications/applications";
import { getDocument, NotFoundError as DocumentNotFoundError } from "@/lib/documents/documents";
import { toApplicationContext } from "@/lib/application-ai-context";
import { validateJobDescription, ValidationError } from "@/lib/job-analysis/job-analysis";
import {
  analyzeResumeReadiness,
  buildResumeJdMatchPrompt,
  MalformedAnalysisError,
  parseResumeJdMatch,
  parseSessionContext,
  RESUME_JD_MATCH_RESPONSE_SCHEMA,
  RESUME_JD_MATCH_SYSTEM_INSTRUCTION,
  suggestionFingerprint,
} from "@/lib/resume/resume-analysis";
import { generateStructuredReply, GeminiConfigError, GeminiRequestError } from "@/lib/gemini";
import { isValidObjectId } from "@/lib/object-id";

function parseId(value: unknown): string | null {
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

  const documentId = parseId(raw.documentId);
  if (documentId === null) {
    return NextResponse.json({ error: "A documentId is required" }, { status: 400 });
  }

  let document;
  try {
    document = await getDocument(userId, documentId);
  } catch (error) {
    if (error instanceof DocumentNotFoundError) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }
    throw error;
  }

  if (document.type !== "RESUME") {
    return NextResponse.json(
      { error: "Only resume documents can be analyzed." },
      { status: 400 },
    );
  }

  const applicationId = parseId(raw.applicationId);
  if (raw.applicationId !== undefined && raw.applicationId !== null && applicationId === null) {
    return NextResponse.json({ error: "Invalid applicationId" }, { status: 400 });
  }

  const masterDocumentId = parseId(raw.masterDocumentId);
  if (raw.masterDocumentId !== undefined && raw.masterDocumentId !== null && masterDocumentId === null) {
    return NextResponse.json({ error: "Invalid masterDocumentId" }, { status: 400 });
  }

  // No JD source at all (neither an application nor pasted text) — resume-only
  // readiness mode. Fully deterministic; no Gemini call. The Master Resume
  // doesn't factor in here — readiness reflects what would actually be
  // submitted (the Main Resume), not the reference library.
  const hasStandaloneDescription =
    typeof raw.jobDescription === "string" && raw.jobDescription.trim().length > 0;
  if (applicationId === null && !hasStandaloneDescription) {
    const readiness = analyzeResumeReadiness(document.content);
    return NextResponse.json({ mode: "readiness", readiness });
  }

  // The Master Resume, if given, is verified independently of the document
  // being tailored and of the application — never assumed to belong to the
  // same user just because the other two do.
  let masterResumeContent: string | undefined;
  if (masterDocumentId !== null && masterDocumentId !== documentId) {
    let masterDocument;
    try {
      masterDocument = await getDocument(userId, masterDocumentId);
    } catch (error) {
      if (error instanceof DocumentNotFoundError) {
        return NextResponse.json({ error: "Master resume not found" }, { status: 404 });
      }
      throw error;
    }
    if (masterDocument.type !== "RESUME" || masterDocument.resumeRole !== "MASTER") {
      return NextResponse.json({ error: "masterDocumentId must reference a Master Resume." }, { status: 400 });
    }
    masterResumeContent = masterDocument.content;
  }

  let jobDescription: string;
  let applicationContext: ReturnType<typeof toApplicationContext> | undefined;

  if (applicationId !== null) {
    // The stored description is authoritative when analyzing against a tracked
    // application — any client-supplied jobDescription is ignored, matching the
    // Job Analysis endpoint's behavior. Application ownership is verified
    // independently of the document's ownership above.
    let application;
    try {
      application = await getApplication(userId, applicationId);
    } catch (error) {
      if (error instanceof ApplicationNotFoundError) {
        return NextResponse.json({ error: "Application not found" }, { status: 404 });
      }
      throw error;
    }

    if (!application.jobDescription?.trim()) {
      return NextResponse.json(
        { error: "This application doesn't have a job description to analyze against." },
        { status: 400 },
      );
    }

    try {
      jobDescription = validateJobDescription(application.jobDescription);
    } catch (error) {
      if (error instanceof ValidationError) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      throw error;
    }
    applicationContext = toApplicationContext(application);
  } else {
    try {
      jobDescription = validateJobDescription(raw.jobDescription);
    } catch (error) {
      if (error instanceof ValidationError) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      throw error;
    }
  }

  // Optional tailoring-session context (round number + prior-round history) —
  // the client tracks the session, since nothing here needs to be persisted
  // server-side; a missing/malformed context is simply treated as a fresh,
  // comprehensive first-pass analysis.
  const sessionContext = parseSessionContext(raw);

  const prompt = buildResumeJdMatchPrompt(
    document.content,
    jobDescription,
    applicationContext,
    masterResumeContent,
    document.contentFormat,
    sessionContext,
  );

  const excludeFingerprints = sessionContext
    ? new Set(sessionContext.appliedSuggestions.map((s) => suggestionFingerprint(s)))
    : undefined;

  try {
    const rawReply = await generateStructuredReply(
      RESUME_JD_MATCH_SYSTEM_INSTRUCTION,
      prompt,
      RESUME_JD_MATCH_RESPONSE_SCHEMA,
    );
    const match = parseResumeJdMatch(rawReply, document.content, masterResumeContent, excludeFingerprints);
    return NextResponse.json({ mode: "match", match });
  } catch (error) {
    if (error instanceof GeminiConfigError) {
      console.error("[ai/resume-analysis] Gemini is not configured");
      return NextResponse.json(
        { error: "The resume analysis feature is not available right now." },
        { status: 503 },
      );
    }
    if (error instanceof GeminiRequestError) {
      return NextResponse.json({ error: error.message }, { status: 502 });
    }
    if (error instanceof MalformedAnalysisError) {
      console.error("[ai/resume-analysis] Gemini returned an unusable structured response");
      return NextResponse.json({ error: error.message }, { status: 502 });
    }
    throw error;
  }
}
