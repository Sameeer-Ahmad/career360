"use client";

import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LevelArrow, PROGRESS_LABELS } from "@/components/learning/learning-shared";
import type { ResourcesByTopic, SavedPathDetail } from "@/components/learning/learning-types";

// Deliberately doesn't list every topic/resource — those live in their own tabs.
export function OverviewView({
  detail,
  resourcesByTopic,
  resourcesLoading,
  onOpenTopic,
  onGoToResources,
}: {
  detail: SavedPathDetail;
  resourcesByTopic: ResourcesByTopic | null;
  resourcesLoading: boolean;
  onOpenTopic: (topicId: string) => void;
  onGoToResources: () => void;
}) {
  const highPriority = detail.topics.filter((t) => t.priority === "HIGH").slice(0, 5);

  const continueTopic =
    detail.topics.find((t) => t.progress?.status === "IN_PROGRESS") ??
    detail.topics.find((t) => (t.progress?.status ?? "NOT_STARTED") === "NOT_STARTED") ??
    null;

  const allResources = resourcesByTopic ? Object.values(resourcesByTopic).flatMap((s) => s.resources) : [];
  const resourceCounts = {
    total: allResources.length,
    youtube: allResources.filter((r) => r.provider === "YOUTUBE").length,
    docs: allResources.filter((r) => r.provider === "OFFICIAL_DOCS").length,
    personal: allResources.filter((r) => r.provider === "USER_LINK").length,
  };

  return (
    <div className="space-y-6">
      {highPriority.length > 0 && (
        <div>
          <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Priority areas</h3>
          <div className="mt-2 divide-y divide-border/60">
            {highPriority.map((topic) => {
              const index = detail.topics.findIndex((t) => t.id === topic.id);
              return (
                <button
                  key={topic.id}
                  type="button"
                  onClick={() => onOpenTopic(topic.id)}
                  className="flex w-full items-start gap-3 py-2.5 text-left hover:bg-muted/40"
                >
                  <span className="mt-0.5 shrink-0 font-mono text-xs text-muted-foreground" aria-hidden="true">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{topic.topic}</p>
                    <p className="text-xs text-muted-foreground">
                      <LevelArrow current={topic.currentLevel} target={topic.recommendedLevel} />
                    </p>
                  </div>
                  <ChevronRight className="mt-1 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {continueTopic && (
        <div>
          <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Continue Learning</h3>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3 rounded-md bg-muted/40 px-3 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">{continueTopic.topic}</p>
              <Badge variant={continueTopic.progress?.status === "IN_PROGRESS" ? "info" : "neutral"} className="mt-1">
                {PROGRESS_LABELS[continueTopic.progress?.status ?? "NOT_STARTED"]}
              </Badge>
            </div>
            <Button type="button" size="sm" onClick={() => onOpenTopic(continueTopic.id)}>
              Continue
            </Button>
          </div>
        </div>
      )}

      <div>
        <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Resource summary</h3>
        {resourcesLoading && <p className="mt-2 text-sm text-muted-foreground">Loading…</p>}
        {!resourcesLoading && (
          <div className="mt-2 space-y-2">
            <p className="text-sm text-foreground">
              {resourceCounts.total} resource{resourceCounts.total === 1 ? "" : "s"}
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span>{resourceCounts.youtube} YouTube</span>
              <span>{resourceCounts.docs} Official Documentation</span>
              <span>{resourceCounts.personal} Personal</span>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={onGoToResources}>
              Explore Resources
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
