"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ExternalLink, Trash2 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { ErrorState } from "@/components/ui/error-state";
import { formatDate } from "@/lib/format";
import { buildApplicationSlug } from "@/lib/applications/application-slug";
import { EventFormDialog } from "@/components/calendar/event-form-dialog";
import { eventTime, type CalendarEventDetail } from "@/components/calendar/calendar-event-types";
import {
  CALENDAR_EVENT_TYPE_BADGE_VARIANT as EVENT_TYPE_BADGE_VARIANT,
  CALENDAR_EVENT_TYPE_LABELS,
  REMINDER_OPTIONS,
} from "@/lib/google-calendar/mapping";

// ---------------------------------------------------------------------------
// Event detail dialog — the primary way to inspect/edit/delete an event.
// "Open in Google Calendar" is present only as a secondary, optional link.
// ---------------------------------------------------------------------------

export function EventDetailDialog({
  eventId,
  onClose,
  onChanged,
}: {
  eventId: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [detail, setDetail] = useState<CalendarEventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/calendar/events/${eventId}`)
      .then(async (response) => {
        const body = await response.json().catch(() => null);
        if (!response.ok) throw new Error(body?.error ?? "This event could not be loaded.");
        return body as CalendarEventDetail;
      })
      .then((data) => {
        if (!cancelled) setDetail(data);
      })
      .catch((error: Error) => {
        if (!cancelled) setLoadError(error.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  async function handleDelete() {
    if (deleting) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const response = await fetch(`/api/calendar/events/${eventId}`, { method: "DELETE" });
      if (!response.ok && response.status !== 404) {
        const body = await response.json().catch(() => null);
        setDeleteError(body?.error ?? "Could not delete this event. Please try again.");
        return;
      }
      onChanged();
      onClose();
    } finally {
      setDeleting(false);
    }
  }

  if (editing && detail) {
    return (
      <EventFormDialog
        mode="edit"
        initial={detail}
        onClose={() => setEditing(false)}
        onSaved={() => {
          setEditing(false);
          onChanged();
          onClose();
        }}
      />
    );
  }

  return (
    <Dialog open onClose={onClose} title="Event">
      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {!loading && loadError && <ErrorState description={loadError} />}
      {!loading && !loadError && detail && (
        <div className="space-y-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-semibold text-foreground">{detail.title}</h3>
              {detail.career360 && (
                <Badge variant={EVENT_TYPE_BADGE_VARIANT[detail.career360.eventType]}>
                  {CALENDAR_EVENT_TYPE_LABELS[detail.career360.eventType]}
                </Badge>
              )}
            </div>
            {detail.description && <p className="mt-1.5 whitespace-pre-wrap text-sm text-foreground">{detail.description}</p>}
          </div>

          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">Date</dt>
              <dd className="text-foreground">{detail.start ? formatDate(detail.start) : "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Time</dt>
              <dd className="text-foreground">{eventTime(detail)}</dd>
            </div>
            <div className="col-span-2">
              <dt className="text-xs text-muted-foreground">Reminder{detail.reminderMinutes.length === 1 ? "" : "s"}</dt>
              <dd className="text-foreground">
                {detail.reminderMinutes.length === 0
                  ? "None"
                  : [...detail.reminderMinutes]
                      .sort((a, b) => b - a)
                      .map((m) => REMINDER_OPTIONS.find((o) => o.minutes === m)?.label ?? `${m} minutes before`)
                      .join(", ")}
              </dd>
            </div>
            {detail.linkedApplication && (
              <div className="col-span-2">
                <dt className="text-xs text-muted-foreground">Linked application</dt>
                <dd className="text-foreground">
                  {detail.linkedApplication.jobTitle} at {detail.linkedApplication.companyName}
                </dd>
              </div>
            )}
            {detail.linkedLearningPath && (
              <div className="col-span-2">
                <dt className="text-xs text-muted-foreground">Linked learning path</dt>
                <dd className="text-foreground">{detail.linkedLearningPath.title}</dd>
              </div>
            )}
          </dl>

          {deleteError && (
            <p role="alert" className="text-sm text-status-rejected-fg">
              {deleteError}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2 pt-1">
            {detail.linkedApplication && (
              <Link
                href={`/applications/${buildApplicationSlug({
                  id: detail.linkedApplication.id,
                  jobTitle: detail.linkedApplication.jobTitle,
                  company: { name: detail.linkedApplication.companyName },
                })}`}
                className={buttonVariants("outline", "sm")}
              >
                Open Application
              </Link>
            )}
            {detail.career360 && (
              <>
                <Button type="button" variant="outline" size="sm" onClick={() => setEditing(true)}>
                  Edit
                </Button>
                <Button type="button" variant="destructive" size="sm" onClick={() => setConfirmDeleteOpen(true)}>
                  <Trash2 className="size-4" aria-hidden="true" />
                  Remove from Google Calendar
                </Button>
              </>
            )}
            {detail.htmlLink && (
              <a
                href={detail.htmlLink}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                Open in Google Calendar
                <ExternalLink className="size-3" aria-hidden="true" />
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            )}
          </div>
        </div>
      )}

      <Dialog
        open={confirmDeleteOpen}
        onClose={() => !deleting && setConfirmDeleteOpen(false)}
        title="Delete this event?"
        description="This will remove the event from your Google Calendar."
      >
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" disabled={deleting} onClick={() => setConfirmDeleteOpen(false)}>
            Cancel
          </Button>
          <Button variant="destructive" size="sm" disabled={deleting} onClick={handleDelete}>
            {deleting ? "Deleting…" : "Delete Event"}
          </Button>
        </div>
      </Dialog>
    </Dialog>
  );
}
