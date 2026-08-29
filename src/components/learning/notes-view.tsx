"use client";

import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate } from "@/lib/format";
import type { PathNoteRow } from "@/components/learning/learning-types";

// ---------------------------------------------------------------------------
// Notes view — aggregated across every topic, via a single request. Empty
// notes are never shown; the whole view has a dedicated empty state.
// ---------------------------------------------------------------------------

export function NotesView({
  notes,
  loading,
  error,
  onRetry,
  onOpenTopic,
}: {
  notes: PathNoteRow[] | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onOpenTopic: (topicId: string) => void;
}) {
  if (loading) return <p className="text-sm text-muted-foreground">Loading notes…</p>;
  if (error) return <ErrorState description={error} onRetry={onRetry} />;
  if (!notes || notes.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title="No notes yet"
        description="Start adding notes while studying your topics."
        action={
          <Button type="button" variant="outline" size="sm" onClick={() => onOpenTopic("")}>
            View Topics
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">My Learning Notes</p>
      <div className="divide-y divide-border/60">
        {notes.map((note) => (
          <div key={note.topicId} className="flex flex-wrap items-start justify-between gap-3 py-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground">{note.topicName}</p>
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                &ldquo;{note.content.length > 140 ? `${note.content.slice(0, 140)}…` : note.content}&rdquo;
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Updated {formatDate(note.updatedAt)}</p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenTopic(note.topicId)}>
              Open Topic
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
