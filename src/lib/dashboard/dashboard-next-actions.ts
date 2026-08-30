// Powers the Dashboard's "Upcoming" section: the next few Interview /
// Follow-up / Learning Session events, reusing the existing Google
// Calendar read path rather than a new local model.
import { prisma } from "@/lib/prisma";
import { listEventsInRange, type CalendarEventSummary } from "@/lib/google-calendar/events";
import { CALENDAR_EVENT_TYPE_LABELS, type CalendarEventType } from "@/lib/google-calendar/mapping";
import { calendarEventHref, formatEventWhen } from "@/lib/google-calendar/calendar-date";
import { buildApplicationSlug } from "@/lib/applications/application-slug";

// Excludes APPLICATION_DEADLINE — no deadline field/UI exists yet.
const NEXT_ACTION_EVENT_TYPES = new Set<CalendarEventType>(["INTERVIEW", "FOLLOW_UP", "LEARNING_SESSION"]);

const DEFAULT_LIMIT = 5;
const DEFAULT_WINDOW_DAYS = 30;

export type NextActionItem = {
  id: string;
  eventType: CalendarEventType;
  eventTypeLabel: string;
  /** Linked application/learning-path context when available, else the raw event title. */
  displayTitle: string;
  start: string;
  whenLabel: string;
  applicationHref: string | null;
  learningHref: string | null;
  calendarHref: string;
};

// Filters to relevant, still-upcoming event types, nearest-first.
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

// Takes lookup maps rather than querying itself, so this stays pure/testable.
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

// Batches the Application/LearningPath lookups (no N+1) and returns an
// empty list on a Calendar failure so the Dashboard just shows its empty state.
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
