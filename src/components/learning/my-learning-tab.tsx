"use client";

import { useEffect, useState } from "react";
import { BookOpen } from "lucide-react";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { PathListRow } from "@/components/learning/learning-shared";
import { PathWorkspace } from "@/components/learning/path-workspace";
import type { SavedPathListItem } from "@/components/learning/learning-types";

export function MyLearningTab({ reloadKey, calendarConnected }: { reloadKey: number; calendarConnected: boolean }) {
  const [paths, setPaths] = useState<SavedPathListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshIndex, setRefreshIndex] = useState(0);
  const [selectedPathId, setSelectedPathId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/learning")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("failed"))))
      .then((data) => {
        if (cancelled) return;
        setPaths(data);
        setError(null);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load your learning paths. Please try again.");
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey, refreshIndex]);

  if (selectedPathId) {
    return (
      <PathWorkspace
        pathId={selectedPathId}
        backLabel="My Learning"
        allowAddTopic={paths?.find((p) => p.id === selectedPathId)?.source === "PERSONAL"}
        calendarConnected={calendarConnected}
        onBack={() => setSelectedPathId(null)}
        onDeleted={() => setRefreshIndex((i) => i + 1)}
      />
    );
  }

  if (error) return <ErrorState description={error} onRetry={() => setRefreshIndex((i) => i + 1)} />;
  if (paths === null) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (paths.length === 0) {
    return (
      <EmptyState
        icon={BookOpen}
        title="No learning paths yet"
        description="Generate a recommended path or create a personal one to get started."
      />
    );
  }

  return (
    <div className="space-y-2">
      {paths.map((path) => (
        <PathListRow key={path.id} path={path} onSelect={() => setSelectedPathId(path.id)} />
      ))}
    </div>
  );
}
