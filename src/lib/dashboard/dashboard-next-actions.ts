// Powers the Dashboard's "Upcoming" section — a small, chronological slice
// of the user's own Career360-created Calendar events (Interview,
// Follow-up, Learning Session only), reusing the existing Google Calendar
// read path (listEventsInRange) rather than a new local model. Split into
// a pure selection/shaping core (independently testable, no I/O) and a
// thin async orchestrator that does the Calendar fetch + the
// Application/LearningPath joins — the same "pure core, route-layer join"
// split events.ts's own API routes already use for resolveLinkedEntities.
import { prisma } from "@/lib/prisma";
import { listEventsInRange, type CalendarEventSummary } from "@/lib/google-calendar/events";
import { CALENDAR_EVENT_TYPE_LABELS, type CalendarEventType } from "@/lib/google-calendar/mapping";
import { calendarEventHref, formatEventWhen } from "@/lib/google-calendar/calendar-date";
import { buildApplicationSlug } from "@/lib/applications/application-slug";

/** The only event types the Dashboard ever surfaces — never an arbitrary Google Calendar event, and never APPLICATION_DEADLINE (no deadline field/UI exists yet). */
const NEXT_ACTION_EVENT_TYPES = new Set<CalendarEventType>(["INTERVIEW", "FOLLOW_UP", "LEARNING_SESSION"]);

const DEFAULT_LIMIT = 5;
const DEFAULT_WINDOW_DAYS = 30;

export type NextActionItem = {
  id: string;
  eventType: CalendarEventType;
  eventTypeLabel: string;
  /** The linked application/learning-path context when available (e.g. "Acamae · SDE 1"), falling back to the raw event title when there's no linked context to derive a cleaner line from. */
  displayTitle: string;
  start: string;
  whenLabel: string;
  /** Present only for an application-linked event whose application still resolves (owned, not deleted). */
  applicationHref: string | null;
  /** Present only for a learning-related event. */
  learningHref: string | null;
  calendarHref: string;
};

/**
 * Pure: filters to the relevant, still-upcoming Career360 event types and
 * returns them nearest-first. No ranking beyond "soonest" — the Dashboard
 * intentionally doesn't build a recommendation system.
 */
export function selectUpcomingCareerEvents(
  events: CalendarEventSummary[],
  now: Date,
  limit: number = DEFAULT_LIMIT,
): CalendarEventSummary[] {
  return events
    .filter((event) => event.career360 && NEXT_ACTION_EVENT_TYPES.has(event.career360.eventType))
    .filter((event) => event.start && new Date(event.start).getTime() > now.getTime())
    .sort((a, b) => new Date(a.start as string).getTime() - new Date(b.start as string).getTime())
    .slice(0, limit);
}

type ApplicationContext = { id: string; jobTitle: string; company: { name: string } };
type LearningPathContext = { id: string; title: string; applicationId: string | null };

/** Pure: turns already-selected events (plus their already-fetched linked context) into display-ready items. No I/O — takes lookup maps rather than querying itself, so this is testable without a database. */
export function buildNextActionItems(
  events: CalendarEventSummary[],
  applicationById: Map<string, ApplicationContext>,
  learningPathById: Map<string, LearningPathContext>,
): NextActionItem[] {
  return events
    .filter((event): event is CalendarEventSummary & { start: string; career360: NonNullable<CalendarEventSummary["career360"]> } =>
      Boolean(event.start && event.career360),
    )
    .map((event) => {
      const { eventType, applicationId, learningPathId } = event.career360;
      const application = applicationId ? applicationById.get(applicationId) : undefined;
      const learningPath = learningPathId ? learningPathById.get(learningPathId) : undefined;

      let displayTitle = event.title;
      if (eventType === "INTERVIEW" && application) {
        displayTitle = `${application.company.name} · ${application.jobTitle}`;
      } else if (eventType === "FOLLOW_UP" && application) {
        displayTitle = application.company.name;
      } else if (eventType === "LEARNING_SESSION" && learningPath) {
        displayTitle = learningPath.title;
      }

      const applicationHref = application ? `/applications/${buildApplicationSlug(application)}` : null;
      const learningHref =
        eventType === "LEARNING_SESSION"
          ? learningPath?.applicationId
            ? `/learning?applicationId=${learningPath.applicationId}`
            : "/learning"
          : null;

      return {
        id: event.id,
        eventType,
        eventTypeLabel: CALENDAR_EVENT_TYPE_LABELS[eventType],
        displayTitle,
        start: event.start,
        whenLabel: formatEventWhen(new Date(event.start), " · "),
        applicationHref,
        learningHref,
        calendarHref: calendarEventHref(event.id),
      };
    });
}

/**
 * One Calendar API call (bounded date window, never a poll) plus one
 * batched Application query and one batched LearningPath query — never
 * N+1, never a separate Google Calendar call per event. Returns an empty
 * list rather than throwing on a transient Calendar failure or a
 * not-connected account, so the Dashboard just shows its empty state
 * instead of breaking the page.
 */
export async function getNextActions(
  userId: string,
  options: { limit?: number; windowDays?: number } = {},
): Promise<NextActionItem[]> {
  const limit = options.limit ?? DEFAULT_LIMIT;
  const windowDays = options.windowDays ?? DEFAULT_WINDOW_DAYS;
  const now = new Date();
  const windowEnd = new Date(now.getTime() + windowDays * 24 * 60 * 60 * 1000);

  let events: CalendarEventSummary[];
  try {
    events = await listEventsInRange(userId, now.toISOString(), windowEnd.toISOString());
  } catch {
    return [];
  }

  const upcoming = selectUpcomingCareerEvents(events, now, limit);
  if (upcoming.length === 0) return [];

  const applicationIds = [...new Set(upcoming.map((e) => e.career360?.applicationId).filter((v): v is string => Boolean(v)))];
  const learningPathIds = [...new Set(upcoming.map((e) => e.career360?.learningPathId).filter((v): v is string => Boolean(v)))];

  const [applications, learningPaths] = await Promise.all([
    applicationIds.length > 0
      ? prisma.application.findMany({
          where: { id: { in: applicationIds }, userId },
          select: { id: true, jobTitle: true, company: { select: { name: true } } },
        })
      : Promise.resolve([]),
    learningPathIds.length > 0
      ? prisma.learningPath.findMany({
          where: { id: { in: learningPathIds }, userId },
          select: { id: true, title: true, applicationId: true },
        })
      : Promise.resolve([]),
  ]);

  const applicationById = new Map(applications.map((a) => [a.id, a]));
  const learningPathById = new Map(learningPaths.map((p) => [p.id, p]));

  return buildNextActionItems(upcoming, applicationById, learningPathById);
}
