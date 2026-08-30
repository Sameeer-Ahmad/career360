// Pure date/grid/link helpers shared across the Calendar UI — Monday-start
// weeks throughout.

export function startOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  d.setDate(d.getDate() + diff);
  return d;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function isToday(date: Date): boolean {
  return isSameDay(date, new Date());
}

/** The 42 days (6 full weeks) covering the reference date's month, including the leading/trailing days of adjacent months needed to fill the grid. */
export function buildMonthGridDays(reference: Date): Date[] {
  const firstOfMonth = new Date(reference.getFullYear(), reference.getMonth(), 1);
  const gridStart = startOfWeek(firstOfMonth);
  return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
}

export function buildWeekDays(reference: Date): Date[] {
  const start = startOfWeek(reference);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function monthLabel(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

/**
 * "Aug 24 – 30, 2026" within a month; "Aug 31 – Sep 6, 2026" across months;
 * "Dec 29, 2025 – Jan 4, 2026" across years. Built from single-field
 * `toLocaleDateString` calls composed manually — a combined day+year call
 * with no month isn't a format Intl guarantees a sane result for.
 */
export function weekRangeLabel(days: Date[]): string {
  const start = days[0];
  const end = days[days.length - 1];
  const startMonth = start.toLocaleDateString("en-US", { month: "short" });
  const endMonth = end.toLocaleDateString("en-US", { month: "short" });
  const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
  if (sameMonth) {
    return `${startMonth} ${start.getDate()} – ${end.getDate()}, ${end.getFullYear()}`;
  }
  const sameYear = start.getFullYear() === end.getFullYear();
  const startPart = sameYear ? `${startMonth} ${start.getDate()}` : `${startMonth} ${start.getDate()}, ${start.getFullYear()}`;
  return `${startPart} – ${endMonth} ${end.getDate()}, ${end.getFullYear()}`;
}

export function eventTimeLabel(date: Date): string {
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

/** "Today, 11:30 PM" / "Tomorrow, 9:00 AM" / "Aug 26, 3:00 PM" (or with a custom separator, e.g. " · ") — used anywhere an event's date/time needs a natural, compact label without a full date. */
export function formatEventWhen(date: Date, separator = ", "): string {
  const now = new Date();
  const tomorrow = addDays(now, 1);
  const dayLabel = isSameDay(date, now)
    ? "Today"
    : isSameDay(date, tomorrow)
      ? "Tomorrow"
      : date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${dayLabel}${separator}${eventTimeLabel(date)}`;
}

export function previousMonthReference(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() - 1, 1);
}

export function nextMonthReference(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 1);
}

export function previousWeekReference(date: Date): Date {
  return addDays(date, -7);
}

export function nextWeekReference(date: Date): Date {
  return addDays(date, 7);
}

/** Combines a `<input type="date">` value ("YYYY-MM-DD") and `<input type="time">` value ("HH:MM") into a local Date — the same parsing every event-creation form in the app uses, so they all validate consistently. */
export function parseLocalDateTime(date: string, time: string): Date {
  return new Date(`${date}T${time}`);
}

/** True when the date/time is strictly after now — used to block creating events in the past, both client-side and (authoritatively) in createCalendarEvent's validateCreateInput. */
export function isFutureDateTime(date: Date): boolean {
  return date.getTime() > Date.now();
}

export const PAST_DATETIME_MESSAGE = "This time has already passed. Please choose a future date and time.";

/** The internal Career360 destination for "Open in Calendar" — always `/calendar`, optionally focused on one event. Not the Google Calendar URL (see htmlLink for that). */
export function calendarEventHref(eventId?: string): string {
  return eventId ? `/calendar?event=${encodeURIComponent(eventId)}` : "/calendar";
}
