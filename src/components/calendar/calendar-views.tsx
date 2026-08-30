"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import { buildMonthGridDays, isSameDay, isToday } from "@/lib/google-calendar/calendar-date";
import { eventTime, type CalendarEventItem } from "@/components/calendar/calendar-event-types";
import { CALENDAR_EVENT_TYPE_BADGE_VARIANT as EVENT_TYPE_BADGE_VARIANT, CALENDAR_EVENT_TYPE_LABELS, type CalendarEventType } from "@/lib/google-calendar/mapping";

/** Same palette as the Badge variants, as chip classes for the month-grid cells (plain buttons, not Badge components). */
const EVENT_TYPE_CHIP_CLASSES: Record<CalendarEventType, string> = {
  INTERVIEW: "bg-status-applied-bg text-status-applied-fg",
  FOLLOW_UP: "bg-status-interview-bg text-status-interview-fg",
  APPLICATION_DEADLINE: "bg-status-screening-bg text-status-screening-fg",
  LEARNING_SESSION: "bg-muted text-muted-foreground",
};

function eventsForDay(events: CalendarEventItem[], day: Date): CalendarEventItem[] {
  return events.filter((event) => event.start && isSameDay(new Date(event.start), day));
}

const MAX_CHIPS_PER_DAY = 3;

// Month grid (desktop/tablet) — collapses to an agenda list on mobile via
// responsive visibility, not a separate JS branch.
export function MonthGrid({
  referenceDate,
  events,
  onSelectEvent,
}: {
  referenceDate: Date;
  events: CalendarEventItem[];
  onSelectEvent: (id: string) => void;
}) {
  const days = buildMonthGridDays(referenceDate);
  const currentMonth = referenceDate.getMonth();

  return (
    <div className="hidden overflow-hidden rounded-md border border-border sm:block">
      <div className="grid grid-cols-7 border-b border-border bg-muted/40 text-xs font-medium text-muted-foreground">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((label) => (
          <div key={label} className="px-2 py-1.5 text-center">
            {label}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const dayEvents = eventsForDay(events, day);
          const visible = dayEvents.slice(0, MAX_CHIPS_PER_DAY);
          const overflow = dayEvents.length - visible.length;
          return (
            <div
              key={day.toISOString()}
              className={cn(
                "min-h-24 border-b border-r border-border p-1.5 last:border-r-0",
                day.getMonth() !== currentMonth && "bg-muted/20",
              )}
            >
              <span
                className={cn(
                  "inline-flex size-5 items-center justify-center rounded-full text-xs",
                  isToday(day) ? "bg-primary text-primary-foreground" : "text-muted-foreground",
                  day.getMonth() !== currentMonth && "opacity-50",
                )}
              >
                {day.getDate()}
              </span>
              <div className="mt-1 space-y-0.5">
                {visible.map((event) => (
                  <button
                    key={event.id}
                    type="button"
                    onClick={() => onSelectEvent(event.id)}
                    className={cn(
                      "block w-full cursor-pointer truncate rounded border border-transparent px-1 py-0.5 text-left text-xs",
                      "transition-[background-color,border-color,opacity] duration-150",
                      "hover:border-current/25 hover:opacity-80",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
                      event.career360 ? EVENT_TYPE_CHIP_CLASSES[event.career360.eventType] : "bg-muted text-muted-foreground",
                    )}
                  >
                    {event.title}
                  </button>
                ))}
                {overflow > 0 && <p className="px-1 text-xs text-muted-foreground">+{overflow} more</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Agenda list — used for Week view always, and as Month view's mobile fallback.
export function AgendaList({
  days,
  events,
  onSelectEvent,
  emptyMessage,
}: {
  days: Date[];
  events: CalendarEventItem[];
  onSelectEvent: (id: string) => void;
  emptyMessage: string;
}) {
  const daysWithEvents = days.map((day) => ({ day, dayEvents: eventsForDay(events, day) })).filter((d) => d.dayEvents.length > 0);

  if (daysWithEvents.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <div className="space-y-4">
      {daysWithEvents.map(({ day, dayEvents }) => (
        <div key={day.toISOString()}>
          <p className="text-sm font-medium text-foreground">
            {isToday(day) ? "Today" : day.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
          </p>
          <div className="mt-1.5 divide-y divide-border/60">
            {dayEvents.map((event) => (
              <button
                key={event.id}
                type="button"
                onClick={() => onSelectEvent(event.id)}
                className="flex w-full items-center justify-between gap-3 py-2 text-left hover:bg-muted/40"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm text-foreground">{event.title}</p>
                  <p className="text-xs text-muted-foreground">{eventTime(event)}</p>
                </div>
                {event.career360 && (
                  <Badge variant={EVENT_TYPE_BADGE_VARIANT[event.career360.eventType]} className="shrink-0">
                    {CALENDAR_EVENT_TYPE_LABELS[event.career360.eventType]}
                  </Badge>
                )}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
