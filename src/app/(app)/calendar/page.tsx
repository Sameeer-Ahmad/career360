import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Header } from "@/components/shell/header";
import { getConnectionSummary } from "@/lib/google-calendar/connection";
import { listEventsInRange } from "@/lib/google-calendar/events";
import { CalendarWorkspace, type CalendarEventItem } from "@/components/calendar/calendar-workspace";
import { startOfWeek } from "@/lib/google-calendar/calendar-date";

const CALENDAR_GRID_WEEKS = 6;
const CALENDAR_GRID_DAYS = CALENDAR_GRID_WEEKS * 7;

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const resolved = await searchParams;
  const justConnected = resolved.connected === "1";
  const oauthErrorParam = resolved.error;
  const oauthError = typeof oauthErrorParam === "string" ? oauthErrorParam : null;
  // Set by the internal "Open in Calendar" link after creating an event
  // elsewhere in the app (e.g. an Application's Follow-up/Interview
  // quick-add) — focuses that event's detail dialog on load.
  const eventParam = resolved.event;
  const initialSelectedEventId = typeof eventParam === "string" ? eventParam : null;

  const { connected, email: connectedEmail } = await getConnectionSummary(session.user.id);

  let initialEvents: CalendarEventItem[] | null = null;
  let initialError: string | null = null;

  // Initial paint covers the 6-week grid for the current month (the same
  // window the client itself will request on navigation) — one Calendar
  // API call on page load, not a poll.
  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const gridStart = startOfWeek(firstOfMonth);
  const gridEnd = new Date(gridStart);
  gridEnd.setDate(gridStart.getDate() + CALENDAR_GRID_DAYS);

  if (connected) {
    try {
      initialEvents = await listEventsInRange(session.user.id, gridStart.toISOString(), gridEnd.toISOString());
    } catch {
      initialError = "Could not load your calendar events. Please try refreshing.";
    }
  }

  return (
    <>
      <Header title="Calendar" />
      <main className="flex-1 p-4 md:p-6">
        <CalendarWorkspace
          initialConnected={connected}
          initialEvents={initialEvents}
          initialError={initialError}
          initialReferenceDateIso={today.toISOString()}
          initialSelectedEventId={initialSelectedEventId}
          initialConnectedEmail={connectedEmail}
          justConnected={justConnected}
          oauthError={oauthError}
        />
      </main>
    </>
  );
}
