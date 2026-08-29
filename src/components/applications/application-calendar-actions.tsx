"use client";

import Link from "next/link";
import { useState } from "react";
import { CalendarPlus } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ReminderPicker } from "@/components/calendar/reminder-picker";
import { calendarEventHref, formatEventWhen, isFutureDateTime } from "@/lib/google-calendar/calendar-date";
import { DEFAULT_REMINDER_MINUTES } from "@/lib/google-calendar/mapping";
import { buildApplicationSlug } from "@/lib/applications/application-slug";

// The internal Career360 calendar is the primary interaction — "Open in
// Calendar" here always means /calendar (via calendarEventHref), never the
// Google Calendar URL. A secondary "Open in Google Calendar" link, if
// wanted, lives on the event's own detail dialog inside /calendar, not
// duplicated here.
type AddedEvent = { id: string; title: string; start: string | null };

function EventAddedSummary({ label, event }: { label: string; event: AddedEvent }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm">
      <span className="text-status-offer-fg">✓ {label}</span>
      <span className="text-muted-foreground">
        {event.title}
        {event.start ? ` · ${formatEventWhen(new Date(event.start))}` : ""}
      </span>
      <Link href={calendarEventHref(event.id)} className="text-xs font-medium text-primary hover:underline">
        Open in Calendar
      </Link>
    </span>
  );
}

/** Interview-only — Follow-ups live in their own section/component (see ApplicationFollowUps) since an application can have many follow-up events, unlike the single Interview tied to Application.interviewAt. */
export function ApplicationCalendarActions({
  applicationId,
  jobTitle,
  companyName,
  calendarConnected,
  interviewAt,
  initialInterviewEvent,
}: {
  applicationId: string;
  jobTitle: string;
  companyName: string;
  calendarConnected: boolean;
  interviewAt: string | null;
  initialInterviewEvent: AddedEvent | null;
}) {
  const [interviewEvent, setInterviewEvent] = useState<AddedEvent | null>(initialInterviewEvent);
  const [showInterviewForm, setShowInterviewForm] = useState(false);
  const [interviewReminders, setInterviewReminders] = useState<number[]>(DEFAULT_REMINDER_MINUTES.INTERVIEW);
  const [addingInterview, setAddingInterview] = useState(false);
  const [interviewError, setInterviewError] = useState<string | null>(null);

  if (!calendarConnected) {
    return (
      <Link href="/calendar" className={buttonVariants("outline", "sm")}>
        <CalendarPlus className="size-4" aria-hidden="true" />
        Connect Google Calendar
      </Link>
    );
  }

  const interviewIsPast = Boolean(interviewAt) && !isFutureDateTime(new Date(interviewAt as string));

  function applicationUrl(): string | null {
    if (typeof window === "undefined") return null;
    const slug = buildApplicationSlug({ id: applicationId, jobTitle, company: { name: companyName } });
    return `${window.location.origin}/applications/${slug}`;
  }

  async function addInterview() {
    if (!interviewAt || addingInterview || interviewIsPast) return;
    setAddingInterview(true);
    setInterviewError(null);
    try {
      const start = new Date(interviewAt);
      const end = new Date(start.getTime() + 60 * 60 * 1000);
      const url = applicationUrl();
      const description = [`Interview for ${jobTitle} at ${companyName}.`, url ? `View in Career360: ${url}` : null]
        .filter(Boolean)
        .join("\n\n");
      const response = await fetch("/api/calendar/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventType: "INTERVIEW",
          title: `Interview — ${jobTitle} at ${companyName}`,
          description,
          startIso: start.toISOString(),
          endIso: end.toISOString(),
          reminderMinutes: interviewReminders,
          applicationId,
        }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        setInterviewError(body?.error ?? "Could not add to Google Calendar. Please try again.");
        return;
      }
      setInterviewEvent({ id: body.id, title: body.title, start: body.start });
      setShowInterviewForm(false);
    } catch {
      setInterviewError("Network error — please check your connection and try again.");
    } finally {
      setAddingInterview(false);
    }
  }

  if (!interviewAt) return null;

  return (
    <div className="flex flex-wrap items-start gap-2">
      {interviewEvent ? (
        <EventAddedSummary label="Interview added" event={interviewEvent} />
      ) : showInterviewForm ? (
        <div className="w-full max-w-xs space-y-2 rounded-md border border-dashed border-border p-2.5">
          <div className="space-y-1">
            <Label className="text-xs">Reminders</Label>
            <ReminderPicker value={interviewReminders} onChange={setInterviewReminders} />
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" size="sm" onClick={addInterview} disabled={addingInterview || interviewIsPast}>
              {addingInterview ? "Adding…" : "Add to Google Calendar"}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setShowInterviewForm(false)} disabled={addingInterview}>
              Cancel
            </Button>
          </div>
          {interviewIsPast && <p className="text-xs text-status-rejected-fg">This interview date has already passed.</p>}
          {interviewError && <p className="text-xs text-status-rejected-fg">{interviewError}</p>}
        </div>
      ) : (
        <Button type="button" variant="outline" size="sm" onClick={() => setShowInterviewForm(true)} disabled={interviewIsPast}>
          <CalendarPlus className="size-4" aria-hidden="true" />
          Add to Google Calendar
        </Button>
      )}
    </div>
  );
}
