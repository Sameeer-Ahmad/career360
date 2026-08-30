import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { deleteCalendarEvent, getCalendarEvent, updateCalendarEvent } from "@/lib/google-calendar/events";
import { mapGoogleCalendarError } from "@/lib/google-calendar/http-errors";

type RouteParams = { params: Promise<{ eventId: string }> };

/** Resolves the linked application/learning path (if any), ownership-scoped so a tampered/foreign id can never resolve to another user's data. */
async function resolveLinkedEntities(userId: string, career360: { applicationId?: string; learningPathId?: string } | null) {
  const [linkedApplication, linkedLearningPath] = await Promise.all([
    career360?.applicationId
      ? prisma.application.findFirst({
          where: { id: career360.applicationId, userId },
          select: { id: true, jobTitle: true, company: { select: { name: true } } },
        })
      : null,
    career360?.learningPathId
      ? prisma.learningPath.findFirst({
          where: { id: career360.learningPathId, userId },
          select: { id: true, title: true },
        })
      : null,
  ]);

  return {
    linkedApplication: linkedApplication
      ? { id: linkedApplication.id, jobTitle: linkedApplication.jobTitle, companyName: linkedApplication.company.name }
      : null,
    linkedLearningPath: linkedLearningPath ? { id: linkedLearningPath.id, title: linkedLearningPath.title } : null,
  };
}

/** Full detail for a single Career360-created event — powers the event detail dialog. getCalendarEvent itself verifies ownership (extendedProperties marker) before returning anything. */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  const { eventId } = await params;

  try {
    const event = await getCalendarEvent(userId, eventId);
    const linked = await resolveLinkedEntities(userId, event.career360);
    return NextResponse.json({ ...event, ...linked });
  } catch (error) {
    const mapped = mapGoogleCalendarError(error);
    if (mapped) return mapped;
    throw error;
  }
}

type UpdateEventBody = {
  title?: string;
  description?: string;
  startIso?: string;
  endIso?: string;
  reminderMinutes?: number[];
};

/** Edits a Career360-created event only — updateCalendarEvent itself verifies the event carries Career360's extendedProperties marker before allowing any change, so an arbitrary Google Calendar event id can never be mutated through this route. */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  const { eventId } = await params;

  let body: UpdateEventBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (body.reminderMinutes !== undefined && !Array.isArray(body.reminderMinutes)) {
    return NextResponse.json({ error: "reminderMinutes must be an array of minute values" }, { status: 400 });
  }

  try {
    const event = await updateCalendarEvent(userId, eventId, body);
    return NextResponse.json(event);
  } catch (error) {
    const mapped = mapGoogleCalendarError(error);
    if (mapped) return mapped;
    throw error;
  }
}

/** Removes a Career360-created event only. Idempotent — an event already gone from Google Calendar is treated as a successful removal. */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  const { eventId } = await params;

  try {
    await deleteCalendarEvent(userId, eventId);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const mapped = mapGoogleCalendarError(error);
    if (mapped) return mapped;
    throw error;
  }
}
