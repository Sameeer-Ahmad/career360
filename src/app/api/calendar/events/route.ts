import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/api-auth";
import { assertApplicationOwnership, NotFoundError as ApplicationNotFoundError } from "@/lib/applications/applications";
import { prisma } from "@/lib/prisma";
import { isValidObjectId } from "@/lib/object-id";
import { createCalendarEvent, listEventsInRange } from "@/lib/google-calendar/events";
import { mapGoogleCalendarError } from "@/lib/google-calendar/http-errors";
import {
  buildWeeklyRecurrenceRule,
  CALENDAR_EVENT_TYPES,
  DEFAULT_REMINDER_MINUTES,
  WEEKDAY_CODES,
  type WeekdayCode,
} from "@/lib/google-calendar/mapping";

const MAX_RANGE_DAYS = 62; // a month/week view never needs more than a bounded window

/** Powers the Career360 Calendar UI's month/week views — pass explicit timeMin/timeMax for the visible range. */
export async function GET(request: NextRequest) {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  const timeMinParam = request.nextUrl.searchParams.get("timeMin");
  const timeMaxParam = request.nextUrl.searchParams.get("timeMax");
  if (!timeMinParam || !timeMaxParam) {
    return NextResponse.json({ error: "timeMin and timeMax are required" }, { status: 400 });
  }
  const timeMin = new Date(timeMinParam);
  const timeMax = new Date(timeMaxParam);
  if (Number.isNaN(timeMin.getTime()) || Number.isNaN(timeMax.getTime()) || timeMax <= timeMin) {
    return NextResponse.json({ error: "timeMin and timeMax must be valid, with timeMax after timeMin" }, { status: 400 });
  }
  const rangeDays = (timeMax.getTime() - timeMin.getTime()) / (24 * 60 * 60 * 1000);
  if (rangeDays > MAX_RANGE_DAYS) {
    return NextResponse.json({ error: `Date range must not exceed ${MAX_RANGE_DAYS} days` }, { status: 400 });
  }

  try {
    const events = await listEventsInRange(userId, timeMin.toISOString(), timeMax.toISOString());
    return NextResponse.json({ events });
  } catch (error) {
    const mapped = mapGoogleCalendarError(error);
    if (mapped) return mapped;
    throw error;
  }
}

type CreateEventBody = {
  eventType?: string;
  title?: string;
  description?: string;
  startIso?: string;
  endIso?: string;
  reminderMinutes?: number[];
  applicationId?: string;
  learningPathId?: string;
  recurrenceDays?: string[];
};

export async function POST(request: NextRequest) {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  let body: CreateEventBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.eventType || !CALENDAR_EVENT_TYPES.includes(body.eventType as (typeof CALENDAR_EVENT_TYPES)[number])) {
    return NextResponse.json({ error: `eventType must be one of ${CALENDAR_EVENT_TYPES.join(", ")}` }, { status: 400 });
  }
  if (!body.title || typeof body.title !== "string" || !body.title.trim()) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }
  if (!body.startIso || !body.endIso) {
    return NextResponse.json({ error: "startIso and endIso are required" }, { status: 400 });
  }
  if (body.reminderMinutes !== undefined && !Array.isArray(body.reminderMinutes)) {
    return NextResponse.json({ error: "reminderMinutes must be an array of minute values" }, { status: 400 });
  }

  // Data-integrity check: an applicationId/learningPathId attached to an event must genuinely belong to this user.
  if (body.applicationId) {
    if (!isValidObjectId(body.applicationId)) {
      return NextResponse.json({ error: "Invalid applicationId" }, { status: 400 });
    }
    try {
      await assertApplicationOwnership(userId, body.applicationId);
    } catch (error) {
      if (error instanceof ApplicationNotFoundError) {
        return NextResponse.json({ error: "Application not found" }, { status: 404 });
      }
      throw error;
    }
  }
  if (body.learningPathId) {
    if (!isValidObjectId(body.learningPathId)) {
      return NextResponse.json({ error: "Invalid learningPathId" }, { status: 400 });
    }
    const path = await prisma.learningPath.findFirst({
      where: { id: body.learningPathId, userId: userId },
      select: { id: true },
    });
    if (!path) {
      return NextResponse.json({ error: "Learning path not found" }, { status: 404 });
    }
  }

  let recurrence: string[] | undefined;
  if (body.recurrenceDays && body.recurrenceDays.length > 0) {
    const validDays = body.recurrenceDays.filter((d): d is WeekdayCode => WEEKDAY_CODES.includes(d as WeekdayCode));
    if (validDays.length === 0) {
      return NextResponse.json({ error: "recurrenceDays must contain at least one valid weekday code" }, { status: 400 });
    }
    recurrence = [buildWeeklyRecurrenceRule(validDays, new Date(body.startIso))];
  }

  try {
    const event = await createCalendarEvent(userId, {
      eventType: body.eventType as (typeof CALENDAR_EVENT_TYPES)[number],
      title: body.title,
      description: body.description,
      startIso: body.startIso,
      endIso: body.endIso,
      reminderMinutes:
        body.reminderMinutes ?? DEFAULT_REMINDER_MINUTES[body.eventType as (typeof CALENDAR_EVENT_TYPES)[number]],
      applicationId: body.applicationId,
      learningPathId: body.learningPathId,
      recurrence,
    });
    return NextResponse.json(event, { status: 201 });
  } catch (error) {
    const mapped = mapGoogleCalendarError(error);
    if (mapped) return mapped;
    throw error;
  }
}
