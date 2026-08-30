"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { ApplicationStatus } from "@prisma/client";
import { STATUS_CLASSES } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import { STATUS_LABELS } from "@/lib/format";

const APPLICATION_STATUSES = Object.keys(STATUS_LABELS) as ApplicationStatus[];

/** Optimistic status <select>: updates immediately, rolls back on a failed PATCH. */
export function ApplicationStatusSelect({
  applicationId,
  initialStatus,
  label,
}: {
  applicationId: string;
  initialStatus: ApplicationStatus;
  label: string;
}) {
  const [status, setStatus] = useState(initialStatus);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  async function handleChange(next: ApplicationStatus) {
    if (next === status || saving) return;
    const previous = status;
    setStatus(next);
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/applications/${applicationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setStatus(previous);
        const message = body?.error ?? "Could not update status. Please try again.";
        setError(message);
        toast.error(message);
        return;
      }
      toast.success("Application updated");
    } catch {
      setStatus(previous);
      setError("Network error — please check your connection and try again.");
      toast.error("Network error — please check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <div className="relative inline-flex">
        <select
          value={status}
          onChange={(e) => handleChange(e.target.value as ApplicationStatus)}
          disabled={saving}
          aria-label={`Status for ${label}`}
          className={cn(
            "cursor-pointer appearance-none rounded-md py-0.5 pl-2 pr-6 text-xs font-medium",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
            "disabled:cursor-not-allowed disabled:opacity-60",
            STATUS_CLASSES[status],
          )}
        >
          {APPLICATION_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 size-3 -translate-y-1/2" aria-hidden="true" />
      </div>
      {error && (
        <p role="alert" className="text-xs text-status-rejected-fg">
          {error}
        </p>
      )}
    </div>
  );
}
