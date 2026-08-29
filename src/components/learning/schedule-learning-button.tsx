"use client";

import Link from "next/link";
import { useState } from "react";
import { CalendarPlus } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ReminderPicker } from "@/components/calendar/reminder-picker";
import { calendarEventHref } from "@/lib/google-calendar/calendar-date";
import { DEFAULT_REMINDER_MINUTES } from "@/lib/google-calendar/mapping";

const WEEKDAY_OPTIONS = [
  { code: "MO", label: "Mon" },
  { code: "TU", label: "Tue" },
  { code: "WE", label: "Wed" },
  { code: "TH", label: "Thu" },
  { code: "FR", label: "Fri" },
  { code: "SA", label: "Sat" },
  { code: "SU", label: "Sun" },
];

function todayInputValue(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Explicit, user-driven scheduling only — never called automatically for
 * every topic or path (see the Learning Safety requirement this
 * implements: no calendar spam). Creates one Google Calendar recurring
 * event (a weekly RRULE, built server-side from the selected days) —
 * Google Calendar owns the resulting occurrences and their reminders.
 */
export function ScheduleLearningButton({
  learningPathId,
  pathTitle,
  calendarConnected,
}: {
  learningPathId: string;
  pathTitle: string;
  calendarConnected: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [days, setDays] = useState<string[]>(["MO", "WE", "FR"]);
  const [time, setTime] = useState("19:00");
  const [duration, setDuration] = useState(60);
  const [startDate, setStartDate] = useState(todayInputValue);
  const [reminders, setReminders] = useState<number[]>(DEFAULT_REMINDER_MINUTES.LEARNING_SESSION);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedEvent, setSavedEvent] = useState<{ id: string } | null>(null);

  if (!calendarConnected) {
    return (
      <Link href="/calendar" className={buttonVariants("outline", "sm")}>
        <CalendarPlus className="size-4" aria-hidden="true" />
        Connect Google Calendar
      </Link>
    );
  }

  if (savedEvent) {
    return (
      <span className="inline-flex items-center gap-2 text-sm text-status-offer-fg">
        ✓ Learning schedule added
        <Link href={calendarEventHref(savedEvent.id)} className="text-xs font-medium text-primary hover:underline">
          Open in Calendar
        </Link>
      </span>
    );
  }

  if (!open) {
    return (
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        <CalendarPlus className="size-4" aria-hidden="true" />
        Schedule Learning
      </Button>
    );
  }

  function toggleDay(code: string) {
    setDays((prev) => (prev.includes(code) ? prev.filter((d) => d !== code) : [...prev, code]));
  }

  async function submit() {
    if (days.length === 0 || !startDate || saving) return;
    setSaving(true);
    setError(null);
    try {
      const start = new Date(`${startDate}T${time}`);
      const end = new Date(start.getTime() + duration * 60 * 1000);
      const response = await fetch("/api/calendar/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventType: "LEARNING_SESSION",
          title: `Learning: ${pathTitle}`,
          startIso: start.toISOString(),
          endIso: end.toISOString(),
          reminderMinutes: reminders,
          learningPathId,
          recurrenceDays: days,
        }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        setError(body?.error ?? "Could not create the learning schedule. Please try again.");
        return;
      }
      setSavedEvent({ id: body.id });
    } catch {
      setError("Network error — please check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3 rounded-md border border-dashed border-border p-3">
      <p className="text-sm font-medium text-foreground">Schedule Learning</p>
      <p className="text-xs text-muted-foreground">{pathTitle}</p>

      <div className="space-y-1">
        <Label className="text-xs">Days of week</Label>
        <div className="flex flex-wrap gap-1">
          {WEEKDAY_OPTIONS.map((d) => (
            <button
              key={d.code}
              type="button"
              onClick={() => toggleDay(d.code)}
              aria-pressed={days.includes(d.code)}
              className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
                days.includes(d.code)
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <div className="space-y-1">
          <Label htmlFor="scheduleTime" className="text-xs">
            Time
          </Label>
          <Input id="scheduleTime" type="time" value={time} onChange={(e) => setTime(e.target.value)} className="h-8 text-xs" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="scheduleDuration" className="text-xs">
            Duration (min)
          </Label>
          <Input
            id="scheduleDuration"
            type="number"
            min={15}
            step={15}
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className="h-8 text-xs"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="scheduleStart" className="text-xs">
            Start
          </Label>
          <Input
            id="scheduleStart"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="h-8 text-xs"
          />
        </div>
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Reminders</Label>
        <ReminderPicker value={reminders} onChange={setReminders} />
      </div>

      {error && (
        <p role="alert" className="text-xs text-status-rejected-fg">
          {error}
        </p>
      )}

      <div className="flex items-center gap-2">
        <Button type="button" size="sm" onClick={submit} disabled={saving || days.length === 0 || !startDate}>
          {saving ? "Creating…" : "Create Learning Schedule"}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)} disabled={saving}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
