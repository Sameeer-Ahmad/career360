"use client";

import { useEffect, useState } from "react";
import { BookOpen, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { SKILL_LEVEL_LABELS } from "@/lib/format";
import { PathListRow } from "@/components/learning/learning-shared";
import { PathWorkspace } from "@/components/learning/path-workspace";
import {
  EMPTY_PERSONAL_TOPIC_FORM,
  PRIORITY_OPTIONS,
  SKILL_LEVEL_OPTIONS,
  type PersonalTopicForm,
  type Priority,
  type SavedPathListItem,
  type SkillLevel,
} from "@/components/learning/learning-types";

// ---------------------------------------------------------------------------
// Personal tab — a real personal workspace: create topics manually, attach
// your own resources, take notes, track progress. Reuses the same
// PathWorkspace (Overview/Topics/Resources/Notes) as My Learning — no
// separate visual system for Personal.
// ---------------------------------------------------------------------------

function CreatePersonalPathForm({ onCancel, onCreated }: { onCancel: () => void; onCreated: () => void }) {
  const [title, setTitle] = useState("");
  const [topicForm, setTopicForm] = useState<PersonalTopicForm>(EMPTY_PERSONAL_TOPIC_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSave = title.trim().length > 0 && topicForm.topic.trim().length > 0 && !saving;

  async function save() {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/learning", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "PERSONAL",
          title: title.trim(),
          topics: [
            {
              topic: topicForm.topic.trim(),
              reason: topicForm.reason.trim() || undefined,
              priority: topicForm.priority,
              currentLevel: topicForm.currentLevel,
              recommendedLevel: topicForm.recommendedLevel,
            },
          ],
        }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        setError(body?.error ?? "Could not create this learning plan. Please try again.");
        return;
      }
      onCreated();
    } catch {
      setError("Network error — please check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Start Your Personal Learning Plan</CardTitle>
        <CardDescription>Give your plan a name and add its first topic — you can add more anytime.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        <div className="space-y-1">
          <Label htmlFor="personalPlanTitle">Plan title</Label>
          <Input
            id="personalPlanTitle"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="My Backend Learning Plan"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="personalPlanTopic">Topic name</Label>
          <Input
            id="personalPlanTopic"
            value={topicForm.topic}
            onChange={(e) => setTopicForm((f) => ({ ...f, topic: e.target.value }))}
            placeholder="PostgreSQL Query Optimization"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="personalPlanGoal">Learning goal</Label>
          <Textarea
            id="personalPlanGoal"
            value={topicForm.reason}
            onChange={(e) => setTopicForm((f) => ({ ...f, reason: e.target.value }))}
            placeholder="Improve query performance and indexing"
            rows={2}
          />
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <div className="space-y-1">
            <Label htmlFor="personalPlanPriority">Priority</Label>
            <Select
              id="personalPlanPriority"
              value={topicForm.priority}
              onChange={(e) => setTopicForm((f) => ({ ...f, priority: e.target.value as Priority }))}
            >
              {PRIORITY_OPTIONS.map((p) => (
                <option key={p} value={p}>
                  {p.charAt(0) + p.slice(1).toLowerCase()}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="personalPlanCurrentLevel">Current level</Label>
            <Select
              id="personalPlanCurrentLevel"
              value={topicForm.currentLevel}
              onChange={(e) => setTopicForm((f) => ({ ...f, currentLevel: e.target.value as SkillLevel }))}
            >
              {SKILL_LEVEL_OPTIONS.map((level) => (
                <option key={level} value={level}>
                  {SKILL_LEVEL_LABELS[level]}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="personalPlanTargetLevel">Target level</Label>
            <Select
              id="personalPlanTargetLevel"
              value={topicForm.recommendedLevel}
              onChange={(e) => setTopicForm((f) => ({ ...f, recommendedLevel: e.target.value as SkillLevel }))}
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
          <p role="alert" className="text-sm text-status-rejected-fg">
            {error}
          </p>
        )}
        <div className="flex items-center gap-2 pt-1">
          <Button type="button" onClick={save} disabled={!canSave}>
            {saving ? "Creating…" : "Create Personal Plan"}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function PersonalTab({
  reloadKey,
  calendarConnected,
  onSaved,
}: {
  reloadKey: number;
  calendarConnected: boolean;
  onSaved: () => void;
}) {
  const [paths, setPaths] = useState<SavedPathListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshIndex, setRefreshIndex] = useState(0);
  const [creating, setCreating] = useState(false);
  const [selectedPathId, setSelectedPathId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/learning?source=PERSONAL")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("failed"))))
      .then((data) => {
        if (cancelled) return;
        setPaths(data);
        setError(null);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load your personal learning plans. Please try again.");
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey, refreshIndex]);

  function handleCreated() {
    setCreating(false);
    setRefreshIndex((i) => i + 1);
    onSaved();
  }

  if (selectedPathId) {
    return (
      <PathWorkspace
        pathId={selectedPathId}
        backLabel="Personal"
        allowAddTopic
        calendarConnected={calendarConnected}
        onBack={() => setSelectedPathId(null)}
        onDeleted={() => setRefreshIndex((i) => i + 1)}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold tracking-tight">Personal Learning</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Build your own learning plan. Create topics, save useful resources, take notes and track your progress.
        </p>
      </div>

      {error && <ErrorState description={error} onRetry={() => setRefreshIndex((i) => i + 1)} />}

      {!error && paths === null && <p className="text-sm text-muted-foreground">Loading…</p>}

      {!error && paths && paths.length > 0 && (
        <div className="space-y-2">
          {paths.map((path) => (
            <PathListRow key={path.id} path={path} onSelect={() => setSelectedPathId(path.id)} />
          ))}
        </div>
      )}

      {!error && paths && paths.length === 0 && !creating && (
        <EmptyState
          icon={BookOpen}
          title="No personal plans yet"
          description="Start a plan to add your own topics, resources, and notes — no AI involved."
        />
      )}

      {creating ? (
        <CreatePersonalPathForm onCancel={() => setCreating(false)} onCreated={handleCreated} />
      ) : (
        <Button type="button" variant="outline" onClick={() => setCreating(true)}>
          <Plus className="size-4" aria-hidden="true" />
          New Personal Path
        </Button>
      )}
    </div>
  );
}
