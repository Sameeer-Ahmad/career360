import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/api-auth";
import { getApplication, NotFoundError as ApplicationNotFoundError } from "@/lib/applications/applications";
import {
  buildLearningPrompt,
  getPrimaryResumeContent,
  LEARNING_SYSTEM_INSTRUCTION,
  MalformedLearningPlanError,
  parseLearningPlan,
  type LearningApplicationContext,
} from "@/lib/learning/learning";
import { generateStructuredJsonReply, GroqConfigError, GroqRequestError } from "@/lib/groq";
import { isValidObjectId } from "@/lib/object-id";

/**
 * Generates a learning-plan PREVIEW only — nothing is persisted here. The
 * client reviews it and, if it wants to keep it, POSTs it back to
 * /api/learning to actually save it. Every input (resume content, JD,
 * application ownership) is gathered server-side; nothing sensitive is
 * ever trusted from the request body.
 */
export async function POST(request: NextRequest) {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const raw = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};

  let applicationId: string | null = null;
  if (raw.applicationId !== undefined && raw.applicationId !== null) {
    if (!isValidObjectId(raw.applicationId)) {
      return NextResponse.json({ error: "Invalid applicationId" }, { status: 400 });
    }
    applicationId = raw.applicationId;
  }

  let applicationContext: LearningApplicationContext | undefined;
  if (applicationId !== null) {
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
        { error: "This application doesn't have a job description to base a learning path on." },
        { status: 400 },
      );
    }

    applicationContext = {
      jobTitle: application.jobTitle,
      companyName: application.company.name,
      employmentType: application.employmentType,
      jobDescription: application.jobDescription,
    };
  }

  const { main, master } = await getPrimaryResumeContent(userId);
  if (!main) {
    return NextResponse.json(
      { error: "Add a Main Resume before generating a learning path." },
      { status: 400 },
    );
  }

  const prompt = buildLearningPrompt(main.content, master?.content, applicationContext);

  try {
    const rawReply = await generateStructuredJsonReply(LEARNING_SYSTEM_INSTRUCTION, prompt);
    const plan = parseLearningPlan(rawReply);
    return NextResponse.json({ preview: plan, applicationId });
  } catch (error) {
    if (error instanceof GroqConfigError) {
      console.error("[learning/generate] Groq is not configured");
      return NextResponse.json(
        { error: "The learning workspace is not available right now." },
        { status: 503 },
      );
    }
    if (error instanceof GroqRequestError) {
      return NextResponse.json({ error: error.message }, { status: 502 });
    }
    if (error instanceof MalformedLearningPlanError) {
      console.error("[learning/generate] Groq returned an unusable structured response");
      return NextResponse.json({ error: error.message }, { status: 502 });
    }
    throw error;
  }
}
