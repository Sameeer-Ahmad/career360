"use client";

import { X } from "lucide-react";
import { Select } from "@/components/ui/select";
import { REMINDER_OPTIONS } from "@/lib/google-calendar/mapping";

/** Multi-select reminder editor — presets only (see mapping.ts's REMINDER_OPTIONS), no duplicates, shown sorted chronologically (largest lead time first). Shared by the Calendar workspace's create/edit form and the Application detail page's Interview/Follow-up quick-add forms. */
export function ReminderPicker({ value, onChange }: { value: number[]; onChange: (next: number[]) => void }) {
  const sorted = [...value].sort((a, b) => b - a);
  const available = REMINDER_OPTIONS.filter((option) => !value.includes(option.minutes));

  function remove(minutes: number) {
    onChange(value.filter((m) => m !== minutes));
  }

  function add(minutes: number) {
    if (value.includes(minutes)) return;
    onChange([...value, minutes]);
  }

  return (
    <div className="space-y-2">
      {sorted.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {sorted.map((minutes) => {
            const label = REMINDER_OPTIONS.find((o) => o.minutes === minutes)?.label ?? `${minutes} minutes before`;
            return (
              <span
                key={minutes}
                className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs font-medium text-foreground"
              >
                {label}
                <button
                  type="button"
                  onClick={() => remove(minutes)}
                  aria-label={`Remove reminder: ${label}`}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3" aria-hidden="true" />
                </button>
              </span>
            );
          })}
        </div>
      )}
      {available.length > 0 && (
        <Select
          value=""
          onChange={(e) => {
            if (e.target.value) add(Number(e.target.value));
          }}
          aria-label="Add reminder"
        >
          <option value="">+ Add reminder…</option>
          {available.map((option) => (
            <option key={option.minutes} value={option.minutes}>
              {option.label}
            </option>
          ))}
        </Select>
      )}
      {sorted.length === 0 && available.length === REMINDER_OPTIONS.length && (
        <p className="text-xs text-muted-foreground">No reminders selected — Google Calendar won&apos;t notify you for this event.</p>
      )}
    </div>
  );
}
