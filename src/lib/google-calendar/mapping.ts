// Pure, deterministic mapping helpers shared by events.ts and the API
// routes. Career360-created events are marked via Google's own
// extendedProperties.private (never encoded into the title), which is also
// how they're found again for duplicate prevention and ownership checks.
import type { BadgeVariant } from "@/lib/format";

export type CalendarEventType = "INTERVIEW" | "FOLLOW_UP" | "APPLICATION_DEADLINE" | "LEARNING_SESSION";

export const CALENDAR_EVENT_TYPES: CalendarEventType[] = [
  "INTERVIEW",
  "FOLLOW_UP",
  "APPLICATION_DEADLINE",
  "LEARNING_SESSION",
];

export const CALENDAR_EVENT_TYPE_LABELS: Record<CalendarEventType, string> = {
  INTERVIEW: "Interview",
  FOLLOW_UP: "Follow-up",
  APPLICATION_DEADLINE: "Application Deadline",
  LEARNING_SESSION: "Learning Session",
};

/** Shared Badge coloring for a Career360 event type — used by both the Calendar workspace and the Dashboard's Upcoming section. */
export const CALENDAR_EVENT_TYPE_BADGE_VARIANT: Record<CalendarEventType, BadgeVariant> = {
  INTERVIEW: "primary",
  FOLLOW_UP: "info",
  APPLICATION_DEADLINE: "warning",
  LEARNING_SESSION: "neutral",
};

/** Default popup reminders (minutes before the event) — a starting point the user can add to, remove from, or fully override. */
export const DEFAULT_REMINDER_MINUTES: Record<CalendarEventType, number[]> = {
  INTERVIEW: [24 * 60, 60, 10],
  FOLLOW_UP: [24 * 60, 60, 10],
  APPLICATION_DEADLINE: [24 * 60],
  LEARNING_SESSION: [15],
};

/** The fixed set of reminder lead times selectable in the UI — every event can have any combination of these, not just one. */
export const REMINDER_OPTIONS: { label: string; minutes: number }[] = [
  { label: "5 minutes before", minutes: 5 },
  { label: "10 minutes before", minutes: 10 },
  { label: "15 minutes before", minutes: 15 },
  { label: "30 minutes before", minutes: 30 },
  { label: "1 hour before", minutes: 60 },
  { label: "2 hours before", minutes: 120 },
  { label: "1 day before", minutes: 24 * 60 },
  { label: "1 week before", minutes: 7 * 24 * 60 },
];

const MAX_REMINDER_MINUTES = 4 * 7 * 24 * 60; // 4 weeks — generous upper bound against a malformed request

/** Builds Google's `reminders.overrides` array: drops invalid/out-of-range values, deduplicates, and sorts descending (largest lead time first). */
export function buildReminderOverrides(minutesList: number[]): { method: "popup"; minutes: number }[] {
  const valid = minutesList.filter(
    (m) => Number.isFinite(m) && Number.isInteger(m) && m >= 0 && m <= MAX_REMINDER_MINUTES,
  );
  const deduped = [...new Set(valid)];
  deduped.sort((a, b) => b - a);
  return deduped.map((minutes) => ({ method: "popup" as const, minutes }));
}

/** Parses Google's `reminders.overrides` back into a sorted, deduplicated list of popup lead times — ignores any non-popup override method. */
export function parseReminderMinutes(overrides: { method?: string; minutes?: number }[] | undefined): number[] {
  if (!Array.isArray(overrides)) return [];
  const minutes = overrides
    .filter((o) => o.method === "popup" && typeof o.minutes === "number")
    .map((o) => o.minutes as number);
  return [...new Set(minutes)].sort((a, b) => b - a);
}

const CAREER360_MARKER_KEY = "career360";
const CAREER360_EVENT_TYPE_KEY = "career360EventType";
const CAREER360_APPLICATION_ID_KEY = "career360ApplicationId";
const CAREER360_LEARNING_PATH_ID_KEY = "career360LearningPathId";

export type Career360ExtendedProperties = {
  eventType: CalendarEventType;
  applicationId?: string;
  learningPathId?: string;
};

/** Builds the Google Events.insert `extendedProperties.private` object marking an event as Career360-created, with just enough context to find and identify it again later. */
export function buildExtendedProperties(props: Career360ExtendedProperties): Record<string, string> {
  const result: Record<string, string> = {
    [CAREER360_MARKER_KEY]: "true",
    [CAREER360_EVENT_TYPE_KEY]: props.eventType,
  };
  if (props.applicationId) result[CAREER360_APPLICATION_ID_KEY] = props.applicationId;
  if (props.learningPathId) result[CAREER360_LEARNING_PATH_ID_KEY] = props.learningPathId;
  return result;
}

/** Parses a Google event's extendedProperties.private back into Career360's own shape. Returns null for any event Career360 didn't create (the common case for a user's regular calendar entries). */
export function parseExtendedProperties(privateProps: Record<string, string> | undefined | null): Career360ExtendedProperties | null {
  if (!privateProps || privateProps[CAREER360_MARKER_KEY] !== "true") return null;
  const eventType = privateProps[CAREER360_EVENT_TYPE_KEY];
  if (!CALENDAR_EVENT_TYPES.includes(eventType as CalendarEventType)) return null;
  return {
    eventType: eventType as CalendarEventType,
    applicationId: privateProps[CAREER360_APPLICATION_ID_KEY] || undefined,
    learningPathId: privateProps[CAREER360_LEARNING_PATH_ID_KEY] || undefined,
  };
}

/** The exact query-parameter pairs to pass as repeated `privateExtendedProperty` filters on events.list, to find an existing Career360 event of a given type tied to a given application/path. */
export function buildLookupFilters(props: Career360ExtendedProperties): string[] {
  const filters = [`${CAREER360_MARKER_KEY}=true`, `${CAREER360_EVENT_TYPE_KEY}=${props.eventType}`];
  if (props.applicationId) filters.push(`${CAREER360_APPLICATION_ID_KEY}=${props.applicationId}`);
  if (props.learningPathId) filters.push(`${CAREER360_LEARNING_PATH_ID_KEY}=${props.learningPathId}`);
  return filters;
}

export const WEEKDAY_CODES = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"] as const;
export type WeekdayCode = (typeof WEEKDAY_CODES)[number];

/**
 * Builds an RFC5545 RRULE for a weekly-recurring Learning Session, e.g.
 * `RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR;UNTIL=20261123T000000Z`. Bounded to
 * ~90 days by default so a schedule doesn't recur forever unattended.
 */
export function buildWeeklyRecurrenceRule(days: WeekdayCode[], startDate: Date, horizonDays = 90): string {
  const until = new Date(startDate.getTime() + horizonDays * 24 * 60 * 60 * 1000);
  const untilStamp = until.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const byDay = [...new Set(days)].join(",");
  return `RRULE:FREQ=WEEKLY;BYDAY=${byDay};UNTIL=${untilStamp}`;
}
