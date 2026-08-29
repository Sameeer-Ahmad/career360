"use client";

import Link from "next/link";
import { useState } from "react";
import { CalendarPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog } from "@/components/ui/dialog";
import { ReminderPicker } from "@/components/calendar/reminder-picker";
import {
  calendarEventHref,
  formatEventWhen,
  isFutureDateTime,
  parseLocalDateTime,
  PAST_DATETIME_MESSAGE,
} from "@/lib/google-calendar/calendar-date";
import { DEFAULT_REMINDER_MINUTES, REMINDER_OPTIONS } from "@/lib/google-calendar/mapping";
import { useToast } from "@/components/ui/toast";

export type FollowUpItem = {
  id: string;
  title: string;
  description: string | null;
  start: string | null;
  reminderMinutes: number[];
};

/** "1 day · 1 hour · 10 min" — a compact variant of the full reminder-picker labels, for the follow-up list where space is tight. */
function reminderSummary(reminderMinutes: number[]): string {
  if (reminderMinutes.length === 0) return "No reminders";
  return [...reminderMinutes]
    .sort((a, b) => b - a)
    .map((minutes) => {
      const label = REMINDER_OPTIONS.find((o) => o.minutes === minutes)?.label ?? `${minutes} minutes before`;
      return label.replace(" minutes before", " min").replace(" before", "");
    })
    .join(" · ");
}

function emptyFollowUpForm(companyName: string) {
  return {
    title: `Follow up with ${companyName}`,
    description: "",
    date: "",
    time: "10:00",
    reminderMinutes: DEFAULT_REMINDER_MINUTES.FOLLOW_UP,
  };
}

export function ApplicationFollowUps({
  applicationId,
  companyName,
  calendarConnected,
  initialFollowUps,
}: {
  applicationId: string;
  companyName: string;
  calendarConnected: boolean;
  initialFollowUps: FollowUpItem[];
}) {
  const [followUps, setFollowUps] = useState(initialFollowUps);
  const [showForm, setShowForm] = useState(false);
  const [values, setValues] = useState(() => emptyFollowUpForm(companyName));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  if (!calendarConnected) return null;

  const isPastStart = Boolean(values.date) && Boolean(values.time) && !isFutureDateTime(parseLocalDateTime(values.date, values.time));

  function update<K extends keyof ReturnType<typeof emptyFollowUpForm>>(key: K, value: ReturnType<typeof emptyFollowUpForm>[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function openForm() {
    setValues(emptyFollowUpForm(companyName));
    setError(null);
    setShowForm(true);
  }

  async function submit() {
    if (!values.title.trim() || !values.date || !values.time || saving || isPastStart) return;
    setSaving(true);
    setError(null);
    try {
      const start = parseLocalDateTime(values.date, values.time);
      const end = new Date(start.getTime() + 30 * 60 * 1000);
      const response = await fetch("/api/calendar/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventType: "FOLLOW_UP",
          title: values.title.trim(),
          description: values.description.trim() || undefined,
          startIso: start.toISOString(),
          endIso: end.toISOString(),
          reminderMinutes: values.reminderMinutes,
          applicationId,
        }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        const message = body?.error ?? "Could not add this follow-up. Please try again.";
        setError(message);
        toast.error(message);
        return;
      }
      const created: FollowUpItem = { id: body.id, title: body.title, description: body.description, start: body.start, reminderMinutes: body.reminderMinutes };
      setFollowUps((prev) =>
        [...prev, created].sort((a, b) => (a.start ?? "").localeCompare(b.start ?? "")),
      );
      setShowForm(false);
      toast.success("Follow-up added");
    } catch {
      setError("Network error — please check your connection and try again.");
      toast.error("Network error — please check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground">Follow-ups</h3>

      {followUps.length === 0 ? (
        <p className="text-sm text-muted-foreground">No follow-ups scheduled yet.</p>
      ) : (
        <ul className="space-y-2">
          {followUps.map((followUp) => (
            <li key={followUp.id} className="rounded-md border border-border p-3">
              <p className="text-sm font-medium text-foreground">{followUp.title}</p>
              {followUp.start && <p className="text-xs text-muted-foreground">{formatEventWhen(new Date(followUp.start), " · ")}</p>}
              {followUp.description && <p className="mt-1 text-xs text-foreground">{followUp.description}</p>}
              <p className="mt-1 text-xs text-muted-foreground">Reminders: {reminderSummary(followUp.reminderMinutes)}</p>
              <Link href={calendarEventHref(followUp.id)} className="mt-1 inline-block text-xs font-medium text-primary hover:underline">
                Open in Calendar
              </Link>
            </li>
          ))}
        </ul>
      )}

      <Button type="button" variant="outline" size="sm" onClick={openForm}>
        <CalendarPlus className="size-4" aria-hidden="true" />
        Add Follow-up
      </Button>

      <Dialog open={showForm} onClose={() => !saving && setShowForm(false)} title="Add Follow-up">
        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="followUpTitle">Title</Label>
            <Input id="followUpTitle" value={values.title} onChange={(e) => update("title", e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="followUpDescription">Description</Label>
            <Textarea
              id="followUpDescription"
              value={values.description}
              onChange={(e) => update("description", e.target.value)}
              placeholder="Ask about interview feedback and next steps"
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="followUpDate">Date</Label>
              <Input id="followUpDate" type="date" value={values.date} onChange={(e) => update("date", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="followUpTime">Time</Label>
              <Input id="followUpTime" type="time" value={values.time} onChange={(e) => update("time", e.target.value)} />
            </div>
          </div>
          {isPastStart && (
            <p role="alert" className="text-sm text-status-rejected-fg">
              {PAST_DATETIME_MESSAGE}
            </p>
          )}
          <div className="space-y-1">
            <Label>Reminders</Label>
            <ReminderPicker value={values.reminderMinutes} onChange={(next) => update("reminderMinutes", next)} />
          </div>
          {error && (
            <p role="alert" className="text-sm text-status-rejected-fg">
              {error}
            </p>
          )}
          <div className="flex items-center gap-2 pt-1">
            <Button
              type="button"
              onClick={submit}
              disabled={saving || !values.title.trim() || !values.date || !values.time || isPastStart}
            >
              {saving ? "Adding…" : "Add Follow-up"}
            </Button>
            <Button type="button" variant="outline" onClick={() => setShowForm(false)} disabled={saving}>
              Cancel
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
