import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/api-auth";
import { getApplication, NotFoundError } from "@/lib/applications/applications";
import { toApplicationContext } from "@/lib/application-ai-context";
import {
  buildJobAnalysisPrompt,
  JOB_ANALYSIS_RESPONSE_SCHEMA,
  JOB_ANALYSIS_SYSTEM_INSTRUCTION,
  MalformedAnalysisError,
  parseJobAnalysis,
  validateJobDescription,
  ValidationError,
} from "@/lib/job-analysis/job-analysis";
import { generateStructuredReply, GeminiConfigError, GeminiRequestError } from "@/lib/gemini";
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

  const applicationId = parseApplicationId(raw.applicationId);
  if (raw.applicationId !== undefined && raw.applicationId !== null && applicationId === null) {
    return NextResponse.json({ error: "Invalid applicationId" }, { status: 400 });
  }

  let jobDescription: string;
  let context: ReturnType<typeof toApplicationContext> | undefined;

  if (applicationId !== null) {
    // The stored description is authoritative when analyzing from an application —
    // any client-supplied jobDescription is ignored to avoid analyzing text that
    // doesn't actually match the application being referenced.
    let application;
    try {
      application = await getApplication(userId, applicationId);
    } catch (error) {
      if (error instanceof NotFoundError) {
        return NextResponse.json({ error: "Application not found" }, { status: 404 });
      }
      throw error;
    }

    if (!application.jobDescription?.trim()) {
      return NextResponse.json(
        { error: "This application doesn't have a job description to analyze." },
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
    context = toApplicationContext(application);
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

  const prompt = buildJobAnalysisPrompt(jobDescription, context);

  try {
    const rawReply = await generateStructuredReply(
      JOB_ANALYSIS_SYSTEM_INSTRUCTION,
      prompt,
      JOB_ANALYSIS_RESPONSE_SCHEMA,
    );
    const analysis = parseJobAnalysis(rawReply);
    return NextResponse.json({ analysis });
  } catch (error) {
    if (error instanceof GeminiConfigError) {
      console.error("[ai/job-analysis] Gemini is not configured");
      return NextResponse.json(
        { error: "The job analysis feature is not available right now." },
        { status: 503 },
      );
    }
    if (error instanceof GeminiRequestError) {
      return NextResponse.json({ error: error.message }, { status: 502 });
    }
    if (error instanceof MalformedAnalysisError) {
      console.error("[ai/job-analysis] Gemini returned an unusable structured response");
      return NextResponse.json({ error: error.message }, { status: 502 });
    }
    throw error;
  }
}
