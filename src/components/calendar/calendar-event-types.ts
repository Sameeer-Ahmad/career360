import { eventTimeLabel } from "@/lib/google-calendar/calendar-date";
import type { CalendarEventType } from "@/lib/google-calendar/mapping";

// Local type mirror for the event shape itself — events.ts is server-only
// (imports the Prisma client indirectly via connection.ts).
export type Career360Info = { eventType: CalendarEventType; applicationId?: string; learningPathId?: string };

export type CalendarEventItem = {
  id: string;
  title: string;
  description: string | null;
  start: string | null;
  end: string | null;
  allDay: boolean;
  htmlLink: string;
  reminderMinutes: number[];
  career360: Career360Info | null;
};

export type CalendarEventDetail = CalendarEventItem & {
  linkedApplication: { id: string; jobTitle: string; companyName: string } | null;
  linkedLearningPath: { id: string; title: string } | null;
};

export function eventTime(event: CalendarEventItem): string {
  if (event.allDay || !event.start) return "All day";
  return eventTimeLabel(new Date(event.start));
}
