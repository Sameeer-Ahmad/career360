"use client";

import { useState } from "react";
import { BookOpen } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/cn";
import { AddResourceForm, ResourceRow } from "@/components/learning/resource-row";
import type { ResourceHandlers, ResourcesByTopic, SavedPathDetail } from "@/components/learning/learning-types";

// Only USER_ADDED resources get Edit/Delete — curated ones stay read-only.
type ResourceFilter = "ALL" | "YOUTUBE" | "OFFICIAL_DOCS" | "USER_LINK";
const RESOURCE_FILTERS: { value: ResourceFilter; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "YOUTUBE", label: "YouTube" },
  { value: "OFFICIAL_DOCS", label: "Documentation" },
  { value: "USER_LINK", label: "Personal" },
];

export function ResourcesView({
  detail,
  resourcesByTopic,
  loading,
  error,
  onRetry,
  resourceHandlers,
}: {
  detail: SavedPathDetail;
  resourcesByTopic: ResourcesByTopic | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  resourceHandlers: Pick<ResourceHandlers, "add" | "edit" | "delete">;
}) {
  const [filter, setFilter] = useState<ResourceFilter>("ALL");
  const [topicFilter, setTopicFilter] = useState<string>("ALL");
  const [editing, setEditing] = useState<{ topicId: string; resourceId: string } | null>(null);

  if (loading) return <p className="text-sm text-muted-foreground">Loading resources…</p>;
  if (error) return <ErrorState description={error} onRetry={onRetry} />;
  if (!resourcesByTopic) return null;

  const totalCount = Object.values(resourcesByTopic).reduce((sum, s) => sum + s.resources.length, 0);

  if (totalCount === 0) {
    return (
      <EmptyState
        icon={BookOpen}
        title="No resources yet"
        description="Open a topic to search YouTube and official docs, or add your own link."
      />
    );
  }

  const groups = detail.topics
    .filter((t) => topicFilter === "ALL" || t.id === topicFilter)
    .map((t) => ({
      topic: t,
      resources: (resourcesByTopic[t.id]?.resources ?? []).filter((r) => filter === "ALL" || r.provider === filter),
    }))
    .filter((g) => g.resources.length > 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Resources · {totalCount}</p>
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex flex-wrap gap-1 rounded-md border border-border bg-muted/40 p-1">
            {RESOURCE_FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setFilter(f.value)}
                aria-pressed={filter === f.value}
                className={cn(
                  "rounded px-2.5 py-1 text-xs font-medium transition-colors",
                  filter === f.value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            <Label htmlFor="resourceTopicFilter" className="sr-only">
              Filter by topic
            </Label>
            <Select
              id="resourceTopicFilter"
              value={topicFilter}
              onChange={(e) => setTopicFilter(e.target.value)}
              className="h-8 w-auto text-xs"
            >
              <option value="ALL">All Topics</option>
              {detail.topics.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.topic}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </div>

      {groups.length === 0 && (
        <p className="text-sm text-muted-foreground">No resources match the current filters.</p>
      )}

      <div className="space-y-5">
        {groups.map((group) => (
          <div key={group.topic.id}>
            <h3 className="text-sm font-medium text-foreground">{group.topic.topic}</h3>
            <div className="divide-y divide-border/60">
              {group.resources.map((resource) =>
                editing?.topicId === group.topic.id && editing.resourceId === resource.id ? (
                  <div key={resource.id} className="py-2.5">
                    <AddResourceForm
                      initial={{
                        title: resource.title,
                        url: resource.url,
                        type: resource.type,
                        description: resource.description ?? "",
                      }}
                      submitLabel="Save Changes"
                      onCancel={() => setEditing(null)}
                      onSubmit={async (form) => {
                        const err = await resourceHandlers.edit(group.topic.id, resource.id, form);
                        if (!err) setEditing(null);
                        return err;
                      }}
                    />
                  </div>
                ) : (
                  <ResourceRow
                    key={resource.id}
                    resource={resource}
                    onEdit={() => setEditing({ topicId: group.topic.id, resourceId: resource.id })}
                    onDelete={() => resourceHandlers.delete(group.topic.id, resource.id)}
                  />
                ),
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
