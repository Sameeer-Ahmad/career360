import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/api-auth";
import { NotFoundError as ApplicationNotFoundError } from "@/lib/applications/applications";
import { getCoverLetterForApplication, saveCoverLetterForApplication, ValidationError } from "@/lib/cover-letter/cover-letter";
import { parseObjectId } from "@/lib/object-id";

type RouteParams = { params: Promise<{ id: string }> };

/** The saved cover letter for this application, or { coverLetter: null } if none has been saved yet. */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  const { id: idParam } = await params;
  const applicationId = parseObjectId(idParam);
  if (applicationId === null) {
    return NextResponse.json({ error: "Invalid application id" }, { status: 400 });
  }

  try {
    const coverLetter = await getCoverLetterForApplication(userId, applicationId);
    return NextResponse.json({ coverLetter });
  } catch (error) {
    if (error instanceof ApplicationNotFoundError) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }
    throw error;
  }
}

/** Saves (or updates) this application's cover letter — idempotent, never creates a duplicate document. */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  const { id: idParam } = await params;
  const applicationId = parseObjectId(idParam);
  if (applicationId === null) {
    return NextResponse.json({ error: "Invalid application id" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const raw = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};

  try {
    const coverLetter = await saveCoverLetterForApplication(userId, applicationId, {
      content: raw.content,
      title: raw.title,
    });
    return NextResponse.json({ coverLetter });
  } catch (error) {
    if (error instanceof ApplicationNotFoundError) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
