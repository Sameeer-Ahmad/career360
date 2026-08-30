"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Badge, PriorityBadge } from "@/components/ui/badge";
import { Collapsible } from "@/components/ui/collapsible";
import { Divider } from "@/components/ui/divider";
import { cn } from "@/lib/cn";
import { SKILL_LEVEL_LABELS } from "@/lib/format";
import { LevelArrow, PROGRESS_LABELS, PROGRESS_OPTIONS } from "@/components/learning/learning-shared";
import { TopicResourcesSection } from "@/components/learning/resource-row";
import { TopicNotesSection } from "@/components/learning/topic-notes-section";
import {
  EMPTY_PERSONAL_TOPIC_FORM,
  PRIORITY_OPTIONS,
  SKILL_LEVEL_OPTIONS,
  type Priority,
  type PersonalTopicForm,
  type ResourceFormState,
  type ResourceHandlers,
  type ResourcesByTopic,
  type SavedPathDetail,
  type SavedTopic,
  type SkillLevel,
  type TopicProgressData,
  type TopicProgressStatus,
  type TopicResourceState,
} from "@/components/learning/learning-types";

// Unrestricted transitions between states, same convention as ApplicationStatus.
function TopicProgress({
  topicId,
  status,
  onChange,
}: {
  topicId: string;
  status: TopicProgressStatus;
  onChange: (progress: TopicProgressData) => void;
}) {
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function setStatus(next: TopicProgressStatus) {
    if (next === status || updating) return;
    setUpdating(true);
    setError(null);
    try {
      const response = await fetch(`/api/learning/topics/${topicId}/progress`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        setError(body?.error ?? "Could not update progress. Please try again.");
        return;
      }
      onChange(body as TopicProgressData);
    } catch {
      setError("Network error — please check your connection and try again.");
    } finally {
      setUpdating(false);
    }
  }

  return (
    <div className="space-y-1">
      <div
        role="group"
        aria-label="Topic progress"
        className="inline-flex flex-wrap gap-1 rounded-md border border-border bg-muted/40 p-1"
      >
        {PROGRESS_OPTIONS.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setStatus(option)}
            disabled={updating}
            aria-pressed={status === option}
            className={cn(
              "rounded px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-50",
              status === option
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {status === option && <span className="sr-only">Current: </span>}
            {PROGRESS_LABELS[option]}
          </button>
        ))}
      </div>
      {error && (
        <p role="alert" className="text-xs text-status-rejected-fg">
          {error}
        </p>
      )}
    </div>
  );
}

// Sections are separated by dividers and typography, not nested cards.
function TopicDetail({
  topic,
  resourceState,
  resourcesLoading,
  onProgressChange,
  onRefreshResources,
  onAddResource,
  onEditResource,
  onDeleteResource,
}: {
  topic: SavedTopic;
  resourceState: TopicResourceState | undefined;
  resourcesLoading: boolean;
  onProgressChange: (progress: TopicProgressData) => void;
  onRefreshResources: () => Promise<string | null>;
  onAddResource: (form: ResourceFormState) => Promise<string | null>;
  onEditResource: (resourceId: string, form: ResourceFormState) => Promise<string | null>;
  onDeleteResource: (resourceId: string) => void;
}) {
  const resourceCount = resourceState?.resources.length ?? 0;

  return (
    <div className="space-y-5 pt-1">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Why this matters</p>
        <p className="mt-1 text-sm text-foreground">{topic.reason}</p>
      </div>

      {topic.prerequisites.length > 0 && (
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Helpful to know first</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {topic.prerequisites.map((p) => (
              <Badge key={p} variant="neutral">
                {p}
              </Badge>
            ))}
          </div>
        </div>
      )}

      <Divider />

      <div>
        <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">Progress</p>
        <TopicProgress topicId={topic.id} status={topic.progress?.status ?? "NOT_STARTED"} onChange={onProgressChange} />
      </div>

      <Divider />

      <div>
        <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">My Notes</p>
        <TopicNotesSection topicId={topic.id} />
      </div>

      <Divider />

      <div>
        <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Resources{resourceState ? ` · ${resourceCount}` : ""}
        </p>
        <TopicResourcesSection
          state={resourceState}
          loading={resourcesLoading}
          onRefresh={onRefreshResources}
          onAdd={onAddResource}
          onEdit={onEditResource}
          onDelete={onDeleteResource}
        />
      </div>
    </div>
  );
}

function TopicRow({
  index,
  topic,
  resourceState,
  resourcesLoading,
  open,
  onOpenChange,
  onProgressChange,
  onRefreshResources,
  onAddResource,
  onEditResource,
  onDeleteResource,
}: {
  index: number;
  topic: SavedTopic;
  resourceState: TopicResourceState | undefined;
  resourcesLoading: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProgressChange: (progress: TopicProgressData) => void;
  onRefreshResources: () => Promise<string | null>;
  onAddResource: (form: ResourceFormState) => Promise<string | null>;
  onEditResource: (resourceId: string, form: ResourceFormState) => Promise<string | null>;
  onDeleteResource: (resourceId: string) => void;
}) {
  const number = String(index + 1).padStart(2, "0");
  const resourceCount = resourceState?.resources.length;

  return (
    <Collapsible
      open={open}
      onOpenChange={onOpenChange}
      className="border-border/80"
      title={
        <div className="flex min-w-0 flex-1 items-start gap-3 pr-2 text-left">
          <span className="mt-0.5 shrink-0 font-mono text-xs text-muted-foreground" aria-hidden="true">
            {number}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="truncate text-sm font-medium text-foreground">{topic.topic}</span>
              <PriorityBadge priority={topic.priority} />
            </div>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
              <LevelArrow current={topic.currentLevel} target={topic.recommendedLevel} />
              {resourceCount !== undefined && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>
                    {resourceCount} Resource{resourceCount === 1 ? "" : "s"}
                  </span>
                </>
              )}
            </p>
          </div>
        </div>
      }
    >
      <TopicDetail
        topic={topic}
        resourceState={resourceState}
        resourcesLoading={resourcesLoading}
        onProgressChange={onProgressChange}
        onRefreshResources={onRefreshResources}
        onAddResource={onAddResource}
        onEditResource={onEditResource}
        onDeleteResource={onDeleteResource}
      />
    </Collapsible>
  );
}

function AddTopicForm({ onCancel, onSubmit }: { onCancel: () => void; onSubmit: (form: PersonalTopicForm) => Promise<string | null> }) {
  const [form, setForm] = useState<PersonalTopicForm>(EMPTY_PERSONAL_TOPIC_FORM);
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
        <Label htmlFor="topicName">Topic name</Label>
        <Input
          id="topicName"
          value={form.topic}
          onChange={(e) => setForm((f) => ({ ...f, topic: e.target.value }))}
          placeholder="PostgreSQL Query Optimization"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="topicGoal">Learning goal</Label>
        <Textarea
          id="topicGoal"
          value={form.reason}
          onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
          placeholder="Improve query performance and indexing"
          rows={2}
        />
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <div className="space-y-1">
          <Label htmlFor="topicPriority">Priority</Label>
          <Select
            id="topicPriority"
            value={form.priority}
            onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value as Priority }))}
          >
            {PRIORITY_OPTIONS.map((p) => (
              <option key={p} value={p}>
                {p.charAt(0) + p.slice(1).toLowerCase()}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="topicCurrentLevel">Current level</Label>
          <Select
            id="topicCurrentLevel"
            value={form.currentLevel}
            onChange={(e) => setForm((f) => ({ ...f, currentLevel: e.target.value as SkillLevel }))}
          >
            {SKILL_LEVEL_OPTIONS.map((level) => (
              <option key={level} value={level}>
                {SKILL_LEVEL_LABELS[level]}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="topicTargetLevel">Target level</Label>
          <Select
            id="topicTargetLevel"
            value={form.recommendedLevel}
            onChange={(e) => setForm((f) => ({ ...f, recommendedLevel: e.target.value as SkillLevel }))}
          >
            {SKILL_LEVEL_OPTIONS.map((level) => (
              <option key={level} value={level}>
                {SKILL_LEVEL_LABELS[level]}
              </option>
            ))}
          </Select>
        </div>
      </div>
      {error && (
        <p role="alert" className="text-xs text-status-rejected-fg">
          {error}
        </p>
      )}
      <div className="flex items-center gap-2 pt-1">
        <Button type="button" size="sm" onClick={submit} disabled={saving || !form.topic.trim()}>
          {saving ? "Adding…" : "Add Topic"}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

export function TopicsView({
  detail,
  resourcesByTopic,
  resourcesLoading,
  openTopicIds,
  onOpenChange,
  onProgressChange,
  resourceHandlers,
  allowAddTopic,
  onAddTopic,
}: {
  detail: SavedPathDetail;
  resourcesByTopic: ResourcesByTopic | null;
  resourcesLoading: boolean;
  openTopicIds: Record<string, boolean>;
  onOpenChange: (topicId: string, open: boolean) => void;
  onProgressChange: (topicId: string, progress: TopicProgressData) => void;
  resourceHandlers: ResourceHandlers;
  allowAddTopic: boolean;
  onAddTopic: (form: PersonalTopicForm) => Promise<string | null>;
}) {
  const [addingTopic, setAddingTopic] = useState(false);

  return (
    <div className="space-y-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Topics · {detail.topics.length}</p>
      <div className="space-y-2">
        {detail.topics.map((topic, index) => (
          <TopicRow
            key={topic.id}
            index={index}
            topic={topic}
            resourceState={resourcesByTopic?.[topic.id]}
            resourcesLoading={resourcesLoading}
            open={openTopicIds[topic.id] ?? false}
            onOpenChange={(open) => onOpenChange(topic.id, open)}
            onProgressChange={(progress) => onProgressChange(topic.id, progress)}
            onRefreshResources={() => resourceHandlers.refresh(topic.id)}
            onAddResource={(form) => resourceHandlers.add(topic.id, form)}
            onEditResource={(resourceId, form) => resourceHandlers.edit(topic.id, resourceId, form)}
            onDeleteResource={(resourceId) => resourceHandlers.delete(topic.id, resourceId)}
          />
        ))}
      </div>

      {allowAddTopic && (
        <div>
          {addingTopic ? (
            <AddTopicForm
              onCancel={() => setAddingTopic(false)}
              onSubmit={async (form) => {
                const error = await onAddTopic(form);
                if (!error) setAddingTopic(false);
                return error;
              }}
            />
          ) : (
            <Button type="button" variant="outline" size="sm" onClick={() => setAddingTopic(true)}>
              <Plus className="size-4" aria-hidden="true" />
              Add Topic
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
