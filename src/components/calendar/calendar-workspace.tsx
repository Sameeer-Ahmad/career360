"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { cn } from "@/lib/cn";
import {
  addDays,
  buildMonthGridDays,
  buildWeekDays,
  monthLabel,
  nextMonthReference,
  nextWeekReference,
  previousMonthReference,
  previousWeekReference,
  weekRangeLabel,
} from "@/lib/google-calendar/calendar-date";
import { MonthGrid, AgendaList } from "@/components/calendar/calendar-views";
import { EventFormDialog } from "@/components/calendar/event-form-dialog";
import { EventDetailDialog } from "@/components/calendar/event-detail-dialog";
import type { CalendarEventItem } from "@/components/calendar/calendar-event-types";

export type { CalendarEventItem } from "@/components/calendar/calendar-event-types";

const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  denied: "Google Calendar connection was not completed.",
  invalid_state: "That connection attempt could not be verified. Please try again.",
  connection_failed: "Could not finish connecting Google Calendar. Please try again.",
};

type CalendarView = "month" | "week";

export function CalendarWorkspace({
  initialConnected,
  initialEvents,
  initialError,
  initialReferenceDateIso,
  initialSelectedEventId,
  initialConnectedEmail,
  justConnected,
  oauthError,
}: {
  initialConnected: boolean;
  initialEvents: CalendarEventItem[] | null;
  initialError: string | null;
  initialReferenceDateIso: string;
  /** Focuses the given event's detail dialog on load — e.g. `/calendar?event=<id>`, the internal "Open in Calendar" destination from a just-created event elsewhere in the app (see application-calendar-actions.tsx). */
  initialSelectedEventId?: string | null;
  /** The connected Google account's email, display-only — independent of the Career360 login account. Null if not connected, or if the lookup failed at connect time. */
  initialConnectedEmail: string | null;
  justConnected: boolean;
  oauthError: string | null;
}) {
  const router = useRouter();
  const [connected, setConnected] = useState(initialConnected);
  const [connectedEmail, setConnectedEmail] = useState(initialConnectedEmail);
  const [disconnecting, setDisconnecting] = useState(false);
  const [disconnectError, setDisconnectError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [referenceDate, setReferenceDate] = useState(() => new Date(initialReferenceDateIso));
  const [view, setView] = useState<CalendarView>("month");
  const [events, setEvents] = useState<CalendarEventItem[] | null>(initialEvents);
  const [error, setError] = useState(initialError);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(initialSelectedEventId ?? null);
  const [showCreate, setShowCreate] = useState(false);
  const [reloadIndex, setReloadIndex] = useState(0);

  const isFirstRun = useRef(true);

  const monthDays = buildMonthGridDays(referenceDate);
  const weekDays = buildWeekDays(referenceDate);
  const visibleDays = view === "month" ? monthDays : weekDays;

  function rangeForView(): { start: Date; end: Date } {
    if (view === "week") {
      const start = weekDays[0];
      return { start, end: addDays(start, 7) };
    }
    return { start: monthDays[0], end: addDays(monthDays[monthDays.length - 1], 1) };
  }

  useEffect(() => {
    if (!connected) return;
    // The server already fetched the matching initial range for the
    // default month view on first paint — skip refetching it immediately.
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }
    const { start, end } = rangeForView();
    const params = new URLSearchParams({ timeMin: start.toISOString(), timeMax: end.toISOString() });
    fetch(`/api/calendar/events?${params.toString()}`)
      .then(async (response) => {
        const body = await response.json().catch(() => null);
        if (!response.ok) {
          if (response.status === 409 && body?.reconnectRequired) {
            setConnected(false);
            setConnectedEmail(null);
            return null;
          }
          throw new Error(body?.error ?? "Could not load your calendar events. Please try again.");
        }
        return body.events as CalendarEventItem[];
      })
      .then((data) => {
        if (data) {
          setEvents(data);
          setError(null);
        }
      })
      .catch((err: Error) => setError(err.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- rangeForView is derived purely from view/referenceDate, already in the dep list
  }, [view, referenceDate, connected, reloadIndex]);

  function goToday() {
    setReferenceDate(new Date());
  }

  function goPrevious() {
    setReferenceDate((prev) => (view === "month" ? previousMonthReference(prev) : previousWeekReference(prev)));
  }

  function goNext() {
    setReferenceDate((prev) => (view === "month" ? nextMonthReference(prev) : nextWeekReference(prev)));
  }

  function closeEventDetail() {
    setSelectedEventId(null);
    if (initialSelectedEventId) router.replace("/calendar", { scroll: false });
  }

  function refetch() {
    setReloadIndex((i) => i + 1);
  }

  async function handleRefresh() {
    if (refreshing) return;
    setRefreshing(true);
    try {
      const response = await fetch("/api/calendar/status");
      if (response.ok) {
        const body = await response.json();
        setConnected(body.connected);
        setConnectedEmail(body.email ?? null);
      }
      refetch();
    } finally {
      setRefreshing(false);
    }
  }

  async function handleDisconnect() {
    if (disconnecting) return;
    setDisconnecting(true);
    setDisconnectError(null);
    try {
      const response = await fetch("/api/calendar/disconnect", { method: "POST" });
      if (!response.ok) {
        setDisconnectError("Could not disconnect Google Calendar. Please try again.");
        return;
      }
      setConnected(false);
      setConnectedEmail(null);
      setEvents(null);
      setError(null);
      setSelectedEventId(null);
    } catch {
      setDisconnectError("Network error — please check your connection and try again.");
    } finally {
      setDisconnecting(false);
    }
  }

  if (!connected) {
    return (
      <div className="mx-auto max-w-lg space-y-4 py-10 text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10">
          <CalendarIcon className="size-6 text-primary" aria-hidden="true" />
        </div>
        <div className="space-y-1.5">
          <h1 className="text-lg font-semibold tracking-tight text-foreground">Google Calendar</h1>
          <p className="text-sm text-muted-foreground">
            Connect your Google Calendar to manage interviews, follow-ups, deadlines and learning sessions.
          </p>
        </div>
        {oauthError && (
          <p role="alert" className="text-sm text-status-rejected-fg">
            {OAUTH_ERROR_MESSAGES[oauthError] ?? "Something went wrong. Please try again."}
          </p>
        )}
        <a href="/api/calendar/connect" className={buttonVariants("primary", "md")}>
          <CalendarIcon className="size-4" aria-hidden="true" />
          Connect Google Calendar
        </a>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-status-offer-fg/40 bg-status-offer-bg/30 px-3 py-2">
        <div>
          <p className="text-sm font-medium text-foreground">✓ Google Calendar connected</p>
          {connectedEmail && <p className="text-xs text-muted-foreground">{connectedEmail}</p>}
        </div>
        <div className="flex items-center gap-2">
          {disconnectError && <p className="text-xs text-status-rejected-fg">{disconnectError}</p>}
          <Button type="button" variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing || disconnecting}>
            {refreshing ? "Refreshing…" : "Refresh"}
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={handleDisconnect} disabled={disconnecting}>
            {disconnecting ? "Disconnecting…" : "Disconnect"}
          </Button>
        </div>
      </div>
      {justConnected && (
        <p className="text-xs text-muted-foreground" role="status">
          Successfully connected.
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-semibold tracking-tight text-foreground">Career Calendar</h1>
        <Button type="button" size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="size-4" aria-hidden="true" />
          Add Event
        </Button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <Button type="button" variant="ghost" size="sm" onClick={goPrevious} aria-label="Previous">
            <ChevronLeft className="size-4" aria-hidden="true" />
          </Button>
          <p className="w-40 text-center text-sm font-medium text-foreground sm:w-48">
            {view === "month" ? monthLabel(referenceDate) : weekRangeLabel(weekDays)}
          </p>
          <Button type="button" variant="ghost" size="sm" onClick={goNext} aria-label="Next">
            <ChevronRight className="size-4" aria-hidden="true" />
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={goToday}>
            Today
          </Button>
        </div>
        <div className="inline-flex gap-1 rounded-md border border-border bg-muted/40 p-1">
          {(["month", "week"] as CalendarView[]).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              aria-pressed={view === v}
              className={cn(
                "rounded px-2.5 py-1 text-xs font-medium capitalize transition-colors",
                view === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {error && <ErrorState description={error} onRetry={refetch} />}

      {!error && events && (
        <>
          {view === "month" && (
            <>
              <MonthGrid referenceDate={referenceDate} events={events} onSelectEvent={setSelectedEventId} />
              <div className="sm:hidden">
                <AgendaList days={visibleDays} events={events} onSelectEvent={setSelectedEventId} emptyMessage="No events this month." />
              </div>
            </>
          )}
          {view === "week" && (
            <AgendaList days={visibleDays} events={events} onSelectEvent={setSelectedEventId} emptyMessage="No events this week." />
          )}
        </>
      )}

      {selectedEventId && (
        <EventDetailDialog eventId={selectedEventId} onClose={closeEventDetail} onChanged={refetch} />
      )}
      {showCreate && <EventFormDialog mode="create" onClose={() => setShowCreate(false)} onSaved={() => { setShowCreate(false); refetch(); }} />}
    </div>
  );
}
