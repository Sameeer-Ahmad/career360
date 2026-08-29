// Server-only. All Google Calendar API access for Career360 goes through
// this module — never scattered across routes/components. Only ever
// operates on `calendarId=primary` (the authenticated user's own primary
// calendar), using that user's own resolved access token (see
// connection.ts) — there is no code path here that accepts a token from
// the browser or reaches another user's calendar. Never logs a token, a
// request body, or a raw Google response body — only status/reason.
import {
  forceRefreshAccessToken,
  getValidAccessToken,
  GoogleCalendarNotConnectedError,
} from "@/lib/google-calendar/connection";
import {
  buildExtendedProperties,
  buildLookupFilters,
  buildReminderOverrides,
  parseExtendedProperties,
  parseReminderMinutes,
  type Career360ExtendedProperties,
} from "@/lib/google-calendar/mapping";

export { GoogleCalendarNotConnectedError };

const CALENDAR_API_URL = "https://www.googleapis.com/calendar/v3";

export class GoogleCalendarRequestError extends Error {
  constructor(message = "Google Calendar is temporarily unavailable. Please try again.") {
    super(message);
  }
}

export class GoogleCalendarPermissionError extends Error {
  constructor() {
    super("Google denied permission for this Calendar action.");
  }
}

export class GoogleCalendarRateLimitError extends Error {
  constructor() {
    super("Google Calendar is rate-limited right now. Please try again shortly.");
  }
}

/** The event id either never existed, or exists but wasn't created by Career360 — both are treated identically, matching the existing "never distinguish missing vs. not-owned" convention elsewhere in this codebase. */
export class GoogleCalendarEventNotFoundError extends Error {
  constructor() {
    super("This event could not be found. It may have been removed from Google Calendar.");
  }
}

export class GoogleCalendarInvalidEventError extends Error {
  issues: string[];
  constructor(issues: string[]) {
    super("Invalid event data");
    this.issues = issues;
  }
}

type RawResult = { status: number; json: unknown };

async function rawFetch(accessToken: string, method: string, path: string, body?: unknown): Promise<RawResult> {
  let response: Response;
  try {
    response = await fetch(`${CALENDAR_API_URL}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (error) {
    console.error(`[google-calendar] network request failed (${method} ${path.split("?")[0]}):`, error);
    throw new GoogleCalendarRequestError();
  }

  let json: unknown = null;
  if (response.status !== 204) {
    json = await response.json().catch(() => null);
  }
  return { status: response.status, json };
}

/**
 * Resolves a valid access token, makes one Calendar API call, and — only
 * if Calendar itself rejects that token with 401 (e.g. revoked
 * independent of our locally-tracked expiry) — force-refreshes once and
 * retries exactly once more. Every high-level operation below goes
 * through this single choke point for token handling and error mapping.
 */
async function calendarRequest(userId: string, method: string, path: string, body?: unknown): Promise<RawResult> {
  const accessToken = await getValidAccessToken(userId);
  let result = await rawFetch(accessToken, method, path, body);

  if (result.status === 401) {
    const refreshedToken = await forceRefreshAccessToken(userId);
    result = await rawFetch(refreshedToken, method, path, body);
  }

  return result;
}

function assertOk(result: RawResult, context: string): void {
  if (result.status >= 200 && result.status < 300) return;

  if (result.status === 401) {
    // Both the original call and the one-time refresh-and-retry failed —
    // Calendar is still rejecting the (now freshly refreshed) token.
    console.error(`[google-calendar] persistent 401 after refresh (${context})`);
    throw new GoogleCalendarNotConnectedError();
  }
  if (result.status === 403) {
    console.error(`[google-calendar] permission denied (${context})`);
    throw new GoogleCalendarPermissionError();
  }
  if (result.status === 404 || result.status === 410) {
    throw new GoogleCalendarEventNotFoundError();
  }
  if (result.status === 429) {
    console.error(`[google-calendar] rate limited (${context})`);
    throw new GoogleCalendarRateLimitError();
  }
  if (result.status === 400) {
    const parsed = result.json as { error?: { message?: string } } | null;
    console.error(`[google-calendar] bad request (${context}):`, parsed?.error?.message ?? "unknown");
    throw new GoogleCalendarInvalidEventError([parsed?.error?.message ?? "Invalid event data"]);
  }
  console.error(`[google-calendar] request failed (${context}):`, result.status);
  throw new GoogleCalendarRequestError();
}

// ---------------------------------------------------------------------------
// Reading
// ---------------------------------------------------------------------------

export type CalendarEventSummary = {
  id: string;
  title: string;
  description: string | null;
  start: string | null;
  end: string | null;
  allDay: boolean;
  htmlLink: string;
  reminderMinutes: number[];
  career360: Career360ExtendedProperties | null;
};

function toEventSummary(raw: Record<string, unknown>): CalendarEventSummary {
  const start = raw.start as Record<string, unknown> | undefined;
  const end = raw.end as Record<string, unknown> | undefined;
  const extendedProperties = raw.extendedProperties as { private?: Record<string, string> } | undefined;
  const reminders = raw.reminders as { overrides?: { method?: string; minutes?: number }[] } | undefined;

  return {
    id: String(raw.id ?? ""),
    title: typeof raw.summary === "string" ? raw.summary : "(No title)",
    description: typeof raw.description === "string" ? raw.description : null,
    start: (start?.dateTime as string) ?? (start?.date as string) ?? null,
    end: (end?.dateTime as string) ?? (end?.date as string) ?? null,
    allDay: Boolean(start?.date && !start?.dateTime),
    htmlLink: typeof raw.htmlLink === "string" ? raw.htmlLink : "",
    reminderMinutes: parseReminderMinutes(reminders?.overrides),
    career360: parseExtendedProperties(extendedProperties?.private),
  };
}

// A calendar month/week view never needs more than this many events
// rendered — well above what any real month realistically has, purely a
// safety cap so a request is never unbounded.
const MAX_RANGE_RESULTS = 250;

/**
 * Events on the user's primary calendar within an explicit [timeMin,
 * timeMax) window — powers the Career360 Calendar UI's month/week views,
 * which the caller re-requests only when the user actually navigates
 * (never a polling loop, never unbounded historical data). Bounded by
 * MAX_RANGE_RESULTS regardless of the window size.
 */
export async function listEventsInRange(userId: string, timeMinIso: string, timeMaxIso: string): Promise<CalendarEventSummary[]> {
  const params = new URLSearchParams({
    timeMin: timeMinIso,
    timeMax: timeMaxIso,
    maxResults: String(MAX_RANGE_RESULTS),
    singleEvents: "true",
    orderBy: "startTime",
  });

  const result = await calendarRequest(userId, "GET", `/calendars/primary/events?${params.toString()}`);
  assertOk(result, "listEventsInRange");

  const items = (result.json as { items?: unknown[] })?.items;
  if (!Array.isArray(items)) return [];
  return items.map((item) => toEventSummary(item as Record<string, unknown>));
}

/**
 * Looks for an existing, non-cancelled Career360 event matching the given
 * type + related entity — the duplicate-prevention check used before
 * showing "Add to Google Calendar" (an Interview event already added
 * shows "Added" instead). Never creates anything.
 */
export async function findExistingEvent(userId: string, props: Career360ExtendedProperties): Promise<CalendarEventSummary | null> {
  const params = new URLSearchParams({ singleEvents: "true", showDeleted: "false" });
  for (const filter of buildLookupFilters(props)) {
    params.append("privateExtendedProperty", filter);
  }

  const result = await calendarRequest(userId, "GET", `/calendars/primary/events?${params.toString()}`);
  assertOk(result, "findExistingEvent");

  const items = (result.json as { items?: Record<string, unknown>[] })?.items ?? [];
  const match = items.find((item) => item.status !== "cancelled");
  return match ? toEventSummary(match) : null;
}

/**
 * Every non-cancelled Career360 event of the given type tied to a given
 * application — unlike findExistingEvent (which returns at most one, for
 * dedup-check UIs like the Interview button), this powers the Application
 * Detail "Follow-ups" list, where multiple genuinely separate events for
 * the same application are expected and must all be shown. Ordered
 * earliest-first via startTime, same as listEventsInRange.
 */
export async function findEventsForApplication(
  userId: string,
  applicationId: string,
  eventType: Career360ExtendedProperties["eventType"],
): Promise<CalendarEventSummary[]> {
  const params = new URLSearchParams({ singleEvents: "true", showDeleted: "false", orderBy: "startTime" });
  for (const filter of buildLookupFilters({ eventType, applicationId })) {
    params.append("privateExtendedProperty", filter);
  }

  const result = await calendarRequest(userId, "GET", `/calendars/primary/events?${params.toString()}`);
  assertOk(result, "findEventsForApplication");

  const items = (result.json as { items?: Record<string, unknown>[] })?.items ?? [];
  return items.filter((item) => item.status !== "cancelled").map((item) => toEventSummary(item));
}

// ---------------------------------------------------------------------------
// Writing
// ---------------------------------------------------------------------------

export type CreateCalendarEventInput = {
  eventType: Career360ExtendedProperties["eventType"];
  title: string;
  description?: string;
  /** ISO 8601 datetime with an embedded UTC offset (e.g. from Date#toISOString()) — Google infers the display timezone from the calendar itself, so no separate timeZone field is sent. */
  startIso: string;
  endIso: string;
  /** Lead times in minutes before the event — any number of them, including zero (no reminders). Deduplicated and sorted before being sent to Google (see buildReminderOverrides). */
  reminderMinutes: number[];
  applicationId?: string;
  learningPathId?: string;
  /** RFC5545 RRULE line(s), e.g. "RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR;UNTIL=...". Only used for LEARNING_SESSION. */
  recurrence?: string[];
};

function validateCreateInput(input: CreateCalendarEventInput): void {
  const issues: string[] = [];
  if (!input.title.trim()) issues.push("title is required");
  const startMs = Date.parse(input.startIso);
  if (Number.isNaN(startMs)) issues.push("start must be a valid date/time");
  if (Number.isNaN(Date.parse(input.endIso))) issues.push("end must be a valid date/time");
  if (Date.parse(input.endIso) <= startMs) issues.push("end must be after start");
  // No arbitrary minimum lead time — only that the event hasn't already
  // happened. Re-checked here even though the client also validates this,
  // since a client bypass must never be able to create a past event.
  if (!Number.isNaN(startMs) && startMs <= Date.now()) issues.push("start must be in the future");
  if (!Array.isArray(input.reminderMinutes)) issues.push("reminderMinutes must be an array of minute values");
  if (issues.length > 0) throw new GoogleCalendarInvalidEventError(issues);
}

export async function createCalendarEvent(userId: string, input: CreateCalendarEventInput): Promise<CalendarEventSummary> {
  validateCreateInput(input);

  const body: Record<string, unknown> = {
    summary: input.title,
    description: input.description ?? undefined,
    start: { dateTime: input.startIso },
    end: { dateTime: input.endIso },
    reminders: {
      useDefault: false,
      overrides: buildReminderOverrides(input.reminderMinutes),
    },
    extendedProperties: {
      private: buildExtendedProperties({
        eventType: input.eventType,
        applicationId: input.applicationId,
        learningPathId: input.learningPathId,
      }),
    },
  };
  if (input.recurrence && input.recurrence.length > 0) body.recurrence = input.recurrence;

  const result = await calendarRequest(userId, "POST", "/calendars/primary/events", body);
  assertOk(result, "createCalendarEvent");
  return toEventSummary(result.json as Record<string, unknown>);
}

/** Ownership-checked: fetches the event and confirms it's one Career360 created before returning it. Throws GoogleCalendarEventNotFoundError uniformly whether the event never existed or simply isn't ours — Career360 must never mutate an arbitrary event on the user's calendar. */
async function getOwnedCareer360Event(userId: string, eventId: string): Promise<Record<string, unknown>> {
  const result = await calendarRequest(userId, "GET", `/calendars/primary/events/${encodeURIComponent(eventId)}`);
  assertOk(result, "getOwnedCareer360Event");
  const raw = result.json as Record<string, unknown>;

  const extendedProperties = raw.extendedProperties as { private?: Record<string, string> } | undefined;
  if (!parseExtendedProperties(extendedProperties?.private)) {
    throw new GoogleCalendarEventNotFoundError();
  }
  return raw;
}

/** Ownership-checked read of a single Career360-created event — powers the Career360 event detail dialog. */
export async function getCalendarEvent(userId: string, eventId: string): Promise<CalendarEventSummary> {
  const raw = await getOwnedCareer360Event(userId, eventId);
  return toEventSummary(raw);
}

export type UpdateCalendarEventInput = {
  title?: string;
  description?: string;
  startIso?: string;
  endIso?: string;
  /** Replaces the full reminder list when provided — not merged with the existing set. */
  reminderMinutes?: number[];
};

export async function updateCalendarEvent(userId: string, eventId: string, input: UpdateCalendarEventInput): Promise<CalendarEventSummary> {
  await getOwnedCareer360Event(userId, eventId);

  const body: Record<string, unknown> = {};
  if (input.title !== undefined) body.summary = input.title;
  if (input.description !== undefined) body.description = input.description;
  if (input.startIso !== undefined) body.start = { dateTime: input.startIso };
  if (input.endIso !== undefined) body.end = { dateTime: input.endIso };
  if (input.reminderMinutes !== undefined) {
    body.reminders = { useDefault: false, overrides: buildReminderOverrides(input.reminderMinutes) };
  }

  const result = await calendarRequest(userId, "PATCH", `/calendars/primary/events/${encodeURIComponent(eventId)}`, body);
  assertOk(result, "updateCalendarEvent");
  return toEventSummary(result.json as Record<string, unknown>);
}

/** Idempotent: an event already gone from Google Calendar (deleted directly by the user) is treated as a successful delete, not an error — matches the "gracefully handle already-removed" requirement. */
export async function deleteCalendarEvent(userId: string, eventId: string): Promise<void> {
  try {
    await getOwnedCareer360Event(userId, eventId);
  } catch (error) {
    if (error instanceof GoogleCalendarEventNotFoundError) return;
    throw error;
  }

  const result = await calendarRequest(userId, "DELETE", `/calendars/primary/events/${encodeURIComponent(eventId)}`);
  if (result.status === 404 || result.status === 410 || result.status === 204 || result.status === 200) return;
  assertOk(result, "deleteCalendarEvent");
}
