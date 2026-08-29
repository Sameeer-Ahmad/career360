"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Dialog } from "@/components/ui/dialog";
import { ReminderPicker } from "@/components/calendar/reminder-picker";
import type { CalendarEventDetail } from "@/components/calendar/calendar-event-types";
import { isFutureDateTime, parseLocalDateTime, PAST_DATETIME_MESSAGE } from "@/lib/google-calendar/calendar-date";
import {
  CALENDAR_EVENT_TYPE_LABELS,
  CALENDAR_EVENT_TYPES,
  DEFAULT_REMINDER_MINUTES,
  type CalendarEventType,
} from "@/lib/google-calendar/mapping";

/** Sensible default event length by type — the Add Event form has no separate duration field. */
const DEFAULT_DURATION_MINUTES: Record<CalendarEventType, number> = {
  INTERVIEW: 60,
  FOLLOW_UP: 30,
  APPLICATION_DEADLINE: 30,
  LEARNING_SESSION: 60,
};

type EventFormValues = {
  eventType: CalendarEventType;
  title: string;
  description: string;
  date: string;
  time: string;
  reminderMinutes: number[];
};

function emptyFormValues(): EventFormValues {
  const now = new Date();
  now.setMinutes(0, 0, 0);
  now.setHours(now.getHours() + 1);
  return {
    eventType: "FOLLOW_UP",
    title: "",
    description: "",
    date: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`,
    time: `${String(now.getHours()).padStart(2, "0")}:00`,
    reminderMinutes: DEFAULT_REMINDER_MINUTES.FOLLOW_UP,
  };
}

function formValuesFromEvent(event: CalendarEventDetail): EventFormValues {
  const start = event.start ? new Date(event.start) : new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    eventType: event.career360?.eventType ?? "FOLLOW_UP",
    title: event.title,
    description: event.description ?? "",
    date: `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`,
    time: `${pad(start.getHours())}:${pad(start.getMinutes())}`,
    reminderMinutes: event.reminderMinutes,
  };
}

// Create / edit event form. Event type is only choosable at creation —
// editing never changes classification.
type EventFormDialogProps =
  | { mode: "create"; onClose: () => void; onSaved: () => void }
  | { mode: "edit"; initial: CalendarEventDetail; onClose: () => void; onSaved: () => void };

export function EventFormDialog(props: EventFormDialogProps) {
  const { mode, onClose, onSaved } = props;
  const [values, setValues] = useState<EventFormValues>(() =>
    props.mode === "edit" ? formValuesFromEvent(props.initial) : emptyFormValues(),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof EventFormValues>(key: K, value: EventFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function handleTypeChange(eventType: CalendarEventType) {
    setValues((prev) => ({ ...prev, eventType, reminderMinutes: DEFAULT_REMINDER_MINUTES[eventType] }));
  }

  // Only creating a new event is date-restricted to the future — editing
  // an existing (possibly already-past) event's other fields must stay
  // frictionless, and the server itself only enforces this on create.
  const isPastStart =
    mode === "create" && Boolean(values.date) && Boolean(values.time) && !isFutureDateTime(parseLocalDateTime(values.date, values.time));

  async function submit() {
    if (!values.title.trim() || !values.date || !values.time || saving || isPastStart) return;
    setSaving(true);
    setError(null);
    try {
      const start = parseLocalDateTime(values.date, values.time);
      const end = new Date(start.getTime() + DEFAULT_DURATION_MINUTES[values.eventType] * 60 * 1000);

      const url = props.mode === "create" ? "/api/calendar/events" : `/api/calendar/events/${props.initial.id}`;
      const method = mode === "create" ? "POST" : "PATCH";
      const body =
        mode === "create"
          ? {
              eventType: values.eventType,
              title: values.title.trim(),
              description: values.description.trim() || undefined,
              startIso: start.toISOString(),
              endIso: end.toISOString(),
              reminderMinutes: values.reminderMinutes,
            }
          : {
              title: values.title.trim(),
              description: values.description.trim() || undefined,
              startIso: start.toISOString(),
              endIso: end.toISOString(),
              reminderMinutes: values.reminderMinutes,
            };

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const responseBody = await response.json().catch(() => null);
        setError(responseBody?.error ?? "Could not save this event. Please try again.");
        return;
      }
      onSaved();
    } catch {
      setError("Network error — please check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onClose={() => !saving && onClose()} title={mode === "create" ? "Add Event" : "Edit Event"}>
      <div className="space-y-3">
        {mode === "create" && (
          <div className="space-y-1">
            <Label htmlFor="eventType">Event Type</Label>
            <Select id="eventType" value={values.eventType} onChange={(e) => handleTypeChange(e.target.value as CalendarEventType)}>
              {CALENDAR_EVENT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {CALENDAR_EVENT_TYPE_LABELS[type]}
                </option>
              ))}
            </Select>
          </div>
        )}

        <div className="space-y-1">
          <Label htmlFor="eventTitle">Title</Label>
          <Input id="eventTitle" value={values.title} onChange={(e) => update("title", e.target.value)} placeholder="Follow up with Acme" />
        </div>

        <div className="space-y-1">
          <Label htmlFor="eventDescription">Description</Label>
          <Textarea
            id="eventDescription"
            value={values.description}
            onChange={(e) => update("description", e.target.value)}
            placeholder="What is this about?"
            rows={3}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="eventDate">Date</Label>
            <Input id="eventDate" type="date" value={values.date} onChange={(e) => update("date", e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="eventTime">Time</Label>
            <Input id="eventTime" type="time" value={values.time} onChange={(e) => update("time", e.target.value)} />
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
          <Button type="button" onClick={submit} disabled={saving || !values.title.trim() || !values.date || !values.time || isPastStart}>
            {saving ? "Saving…" : mode === "create" ? "Add Event" : "Save Changes"}
          </Button>
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
