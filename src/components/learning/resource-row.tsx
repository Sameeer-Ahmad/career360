"use client";

import { useState } from "react";
import {
  BookOpen,
  ChevronRight,
  Code2,
  ExternalLink,
  FileText,
  GraduationCap,
  Link2,
  ListVideo,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { IconButton } from "@/components/ui/icon-button";
import { LEARNING_RESOURCE_TYPE_LABELS } from "@/lib/format";
import { cn } from "@/lib/cn";
import {
  EMPTY_RESOURCE_FORM,
  RESOURCE_TYPES,
  type Resource,
  type ResourceFormState,
  type ResourceType,
  type TopicResourceState,
} from "@/components/learning/learning-types";

const RESOURCE_TYPE_ICON: Record<ResourceType, LucideIcon> = {
  VIDEO: Play,
  PLAYLIST: ListVideo,
  DOCUMENTATION: BookOpen,
  ARTICLE: FileText,
  COURSE: GraduationCap,
  GITHUB: Code2,
  OTHER: Link2,
};

function formatDuration(seconds: number | null): string | null {
  if (seconds === null) return null;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  return `${minutes}:${String(secs).padStart(2, "0")}`;
}

function formatViewCount(count: number | null): string | null {
  if (count === null) return null;
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M views`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K views`;
  return `${count} view${count === 1 ? "" : "s"}`;
}

function formatCacheAge(fetchedAt: string | null): string | null {
  if (!fetchedAt) return null;
  const days = Math.floor((Date.now() - new Date(fetchedAt).getTime()) / (24 * 60 * 60 * 1000));
  if (days <= 0) return "Cached today";
  if (days === 1) return "Cached 1 day ago";
  return `Cached ${days} days ago`;
}

function resourceMetaLine(resource: Resource): string {
  if (resource.provider === "YOUTUBE") {
    const isPlaylist = resource.type === "PLAYLIST";
    const parts = isPlaylist
      ? [resource.channelName, resource.itemCount !== null ? `${resource.itemCount} videos` : null]
      : [resource.channelName, formatDuration(resource.durationSeconds), formatViewCount(resource.viewCount)];
    return [isPlaylist ? "YouTube Playlist" : "YouTube", ...parts.filter(Boolean)].join(" · ");
  }
  if (resource.provider === "OFFICIAL_DOCS") return "Official Documentation";
  return LEARNING_RESOURCE_TYPE_LABELS[resource.type];
}

/** A single compact list row — no per-resource bordered card. Rows are separated with a divider on their container, not their own border. */
export function ResourceRow({
  resource,
  onEdit,
  onDelete,
}: {
  resource: Resource;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const isUserAdded = resource.discoveryMethod === "USER_ADDED";
  const actionLabel = resource.provider === "YOUTUBE" ? "Watch" : "Open";
  const Icon: LucideIcon =
    resource.provider === "YOUTUBE"
      ? resource.type === "PLAYLIST"
        ? ListVideo
        : Play
      : resource.provider === "OFFICIAL_DOCS"
        ? BookOpen
        : RESOURCE_TYPE_ICON[resource.type];

  return (
    <div className="flex items-center gap-3 py-2.5">
      <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <p className="min-w-0 truncate text-sm text-foreground">{resource.title}</p>
          {resource.isOfficial && (
            <Badge variant="primary" className="shrink-0">
              Official
            </Badge>
          )}
        </div>
        <p className="truncate text-xs text-muted-foreground">{resourceMetaLine(resource)}</p>
        {resource.description && <p className="mt-0.5 truncate text-xs text-foreground">{resource.description}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-0.5">
        {isUserAdded && (
          <>
            <IconButton size="sm" onClick={onEdit} aria-label={`Edit ${resource.title}`}>
              <Pencil className="size-3.5" aria-hidden="true" />
            </IconButton>
            <IconButton size="sm" onClick={onDelete} aria-label={`Delete ${resource.title}`}>
              <Trash2 className="size-3.5" aria-hidden="true" />
            </IconButton>
          </>
        )}
        <a
          href={resource.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 whitespace-nowrap px-1.5 py-1 text-xs font-medium text-primary hover:underline"
        >
          {actionLabel}
          <ExternalLink className="size-3" aria-hidden="true" />
          <span className="sr-only">(opens in a new tab)</span>
        </a>
      </div>
    </div>
  );
}

export function AddResourceForm({
  initial,
  submitLabel,
  onCancel,
  onSubmit,
}: {
  initial: ResourceFormState;
  submitLabel: string;
  onCancel: () => void;
  onSubmit: (form: ResourceFormState) => Promise<string | null>;
}) {
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setSaving(true);
    setError(null);
    const result = await onSubmit(form);
    setSaving(false);
    if (result) setError(result);
  }

  return (
    <div className="space-y-2 rounded-md border border-dashed border-border p-3">
      <div className="space-y-1">
        <Label htmlFor="resourceTitle">Resource title</Label>
        <Input
          id="resourceTitle"
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          placeholder="PostgreSQL Indexing Guide"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="resourceUrl">URL</Label>
        <Input
          id="resourceUrl"
          value={form.url}
          onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
          placeholder="https://…"
          inputMode="url"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="resourceType">Resource type</Label>
        <Select
          id="resourceType"
          value={form.type}
          onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as ResourceType }))}
        >
          {RESOURCE_TYPES.map((type) => (
            <option key={type} value={type}>
              {LEARNING_RESOURCE_TYPE_LABELS[type]}
            </option>
          ))}
        </Select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="resourceDescription">Optional description</Label>
        <Textarea
          id="resourceDescription"
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          placeholder="Useful explanation of B-tree indexes…"
          rows={2}
        />
      </div>
      {error && (
        <p role="alert" className="text-xs text-status-rejected-fg">
          {error}
        </p>
      )}
      <div className="flex items-center gap-2 pt-1">
        <Button type="button" size="sm" onClick={submit} disabled={saving}>
          {saving ? "Saving…" : submitLabel}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

const COMPACT_RESOURCE_LIMIT = 4;

/**
 * A single topic's Resources section, as shown inside its expanded row in
 * the Topics view. Fully controlled — reads from the shared
 * resourcesByTopic state (populated once via the path-level aggregate
 * fetch) and reports mutations back up to PathWorkspace rather than
 * fetching or storing anything itself. Shows the first 4 resources with an
 * inline "View all N" expansion — never navigates away.
 */
export function TopicResourcesSection({
  state,
  loading,
  onRefresh,
  onAdd,
  onEdit,
  onDelete,
}: {
  state: TopicResourceState | undefined;
  loading: boolean;
  onRefresh: () => Promise<string | null>;
  onAdd: (form: ResourceFormState) => Promise<string | null>;
  onEdit: (resourceId: string, form: ResourceFormState) => Promise<string | null>;
  onDelete: (resourceId: string) => void;
}) {
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [addingResource, setAddingResource] = useState(false);
  const [editingResourceId, setEditingResourceId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  async function handleRefresh() {
    setRefreshing(true);
    setRefreshError(null);
    const error = await onRefresh();
    setRefreshing(false);
    if (error) setRefreshError(error);
  }

  const resources = state?.resources ?? [];
  const visible = showAll ? resources : resources.slice(0, COMPACT_RESOURCE_LIMIT);
  const remaining = resources.length - visible.length;

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading resources…</p>;
  }

  return (
    <div className="space-y-3">
      {resources.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>
            {formatCacheAge(state?.fetchedAt ?? null)}
            {state?.stale && " · may be out of date"}
          </span>
          <Button type="button" variant="ghost" size="sm" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={cn("size-3.5", refreshing && "animate-spin")} aria-hidden="true" />
            {refreshing ? "Refreshing…" : "Refresh"}
          </Button>
        </div>
      )}

      {(refreshError ?? state?.warning) && (
        <p
          role="alert"
          className="rounded-md border border-status-screening-fg/40 bg-status-screening-bg/30 px-3 py-2 text-xs text-foreground"
        >
          {refreshError ?? state?.warning}
        </p>
      )}

      {resources.length === 0 && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            No resources yet. Search YouTube and official docs, or add your own link below.
          </p>
          <Button type="button" variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
            <Sparkles className="size-4" aria-hidden="true" />
            {refreshing ? "Searching…" : "Find Resources"}
          </Button>
        </div>
      )}

      {resources.length > 0 && (
        <div className="divide-y divide-border/60">
          {visible.map((resource) =>
            editingResourceId === resource.id ? (
              <div key={resource.id} className="py-2.5">
                <AddResourceForm
                  initial={{
                    title: resource.title,
                    url: resource.url,
                    type: resource.type,
                    description: resource.description ?? "",
                  }}
                  submitLabel="Save Changes"
                  onCancel={() => setEditingResourceId(null)}
                  onSubmit={async (form) => {
                    const error = await onEdit(resource.id, form);
                    if (!error) setEditingResourceId(null);
                    return error;
                  }}
                />
              </div>
            ) : (
              <ResourceRow
                key={resource.id}
                resource={resource}
                onEdit={() => setEditingResourceId(resource.id)}
                onDelete={() => onDelete(resource.id)}
              />
            ),
          )}
        </div>
      )}

      {remaining > 0 && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          View all {resources.length} resources
          <ChevronRight className="size-3" aria-hidden="true" />
        </button>
      )}
      {showAll && resources.length > COMPACT_RESOURCE_LIMIT && (
        <button
          type="button"
          onClick={() => setShowAll(false)}
          className="text-xs font-medium text-muted-foreground hover:underline"
        >
          Show fewer
        </button>
      )}

      {addingResource ? (
        <AddResourceForm
          initial={EMPTY_RESOURCE_FORM}
          submitLabel="Add Resource"
          onCancel={() => setAddingResource(false)}
          onSubmit={async (form) => {
            const error = await onAdd(form);
            if (!error) setAddingResource(false);
            return error;
          }}
        />
      ) : (
        <Button type="button" variant="outline" size="sm" onClick={() => setAddingResource(true)}>
          <Plus className="size-4" aria-hidden="true" />
          Add Resource
        </Button>
      )}
    </div>
  );
}
