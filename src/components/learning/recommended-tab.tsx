"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Briefcase, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge, PriorityBadge } from "@/components/ui/badge";
import { CyclingLoadingState } from "@/components/ui/cycling-loading-state";
import { ErrorState } from "@/components/ui/error-state";
import { SkillLevelLabel } from "@/components/learning/learning-shared";
import type { LearningApplicationContext, Priority, SkillLevel } from "@/components/learning/learning-types";

type GeneratedTopic = {
  topic: string;
  reason: string;
  priority: Priority;
  currentLevel: SkillLevel | null;
  recommendedLevel: SkillLevel | null;
  prerequisites: string[];
};

type GeneratedPlan = {
  pathTitle: string;
  pathSummary: string;
  topics: GeneratedTopic[];
};

type ApplicationOption = { id: string; jobTitle: string; company: { name: string }; jobDescription: string | null };

const GENERATE_LOADING = [
  "Reading your resume…",
  "Weighing strengths against gaps…",
  "Prioritizing what's actually worth learning…",
  "Building your learning path…",
];

/** Used only for the AI-generated preview, before it's saved (no id, no progress/notes/resources yet). */
function TopicCard({ topic }: { topic: GeneratedTopic }) {
  return (
    <div className="rounded-md border border-border px-3 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-foreground">{topic.topic}</p>
        <PriorityBadge priority={topic.priority} />
      </div>
      <p className="mt-1.5 text-sm text-foreground">{topic.reason}</p>
      <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-3">
        <div>
          <dt className="text-muted-foreground">Current level</dt>
          <dd className="text-foreground">
            <SkillLevelLabel level={topic.currentLevel} />
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Target level</dt>
          <dd className="text-foreground">
            <SkillLevelLabel level={topic.recommendedLevel} />
          </dd>
        </div>
      </dl>
      {topic.prerequisites.length > 0 && (
        <div className="mt-2">
          <p className="text-xs text-muted-foreground">Helpful to know first</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {topic.prerequisites.map((p) => (
              <Badge key={p} variant="neutral">
                {p}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Recommended tab — two clear modes, both always visible: general growth
// (no application required) and role-specific (an application selected,
// either from the dropdown or preselected via ?applicationId=).
// ---------------------------------------------------------------------------

function ModeCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="pt-0">{children}</CardContent>
    </Card>
  );
}

export function RecommendedTab({
  applicationContext,
  onSaved,
}: {
  applicationContext?: LearningApplicationContext;
  onSaved: () => void;
}) {
  const [applications, setApplications] = useState<ApplicationOption[] | null>(null);
  const [applicationsError, setApplicationsError] = useState<string | null>(null);
  const [selectedApplicationId, setSelectedApplicationId] = useState<string | null>(applicationContext?.id ?? null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<GeneratedPlan | null>(null);
  const [previewApplicationId, setPreviewApplicationId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/applications")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("failed"))))
      .then((data) => {
        if (!cancelled) setApplications(data);
      })
      .catch(() => {
        if (!cancelled) setApplicationsError("Could not load your applications. Please try again.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const contextHasNoJobDescription =
    applicationContext && selectedApplicationId === applicationContext.id && !applicationContext.hasJobDescription;

  async function generate(forApplicationId: string | null) {
    setLoading(true);
    setError(null);
    setPreview(null);
    setSaved(false);
    setSaveError(null);
    setPreviewApplicationId(forApplicationId);
    try {
      const response = await fetch("/api/learning/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(forApplicationId ? { applicationId: forApplicationId } : {}),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        setError(body?.error ?? "Something went wrong. Please try again.");
        return;
      }
      setPreview(body.preview as GeneratedPlan);
    } catch {
      setError("Network error — please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  function discard() {
    setPreview(null);
    setSaveError(null);
    setSaved(false);
  }

  async function save() {
    if (!preview || saving) return;
    setSaving(true);
    setSaveError(null);
    try {
      const response = await fetch("/api/learning", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "RECOMMENDED",
          applicationId: previewApplicationId,
          title: preview.pathTitle,
          summary: preview.pathSummary,
          topics: preview.topics,
        }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        setSaveError(body?.error ?? "Could not save this learning path. Please try again.");
        return;
      }
      setSaved(true);
      onSaved();
    } catch {
      setSaveError("Network error — please check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-base font-semibold tracking-tight">Build a Learning Path</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Choose whether you want to improve your overall profile or prepare for a specific role.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <ModeCard title="Overall Career Growth" description="Identify high-value skills to deepen based on your resume.">
          <Button type="button" className="w-full" onClick={() => generate(null)} disabled={loading}>
            <Sparkles className="size-4" aria-hidden="true" />
            {loading && previewApplicationId === null ? "Generating…" : "Generate General Learning Path"}
          </Button>
        </ModeCard>

        <ModeCard title="Prepare for a Role" description="Build a focused learning path for a specific job.">
          <div className="space-y-2">
            <Label htmlFor="applicationSelect" className="sr-only">
              Select an application
            </Label>
            <Select
              id="applicationSelect"
              value={selectedApplicationId ?? ""}
              onChange={(e) => setSelectedApplicationId(e.target.value || null)}
            >
              <option value="">Select an application…</option>
              {applicationContext &&
                !applications?.some((app) => app.id === applicationContext.id) && (
                  <option value={applicationContext.id}>
                    {applicationContext.jobTitle} at {applicationContext.companyName}
                  </option>
                )}
              {(applications ?? []).map((app) => (
                <option key={app.id} value={app.id}>
                  {app.jobTitle} at {app.company.name}
                </option>
              ))}
            </Select>
            {applicationsError && <p className="text-xs text-status-rejected-fg">{applicationsError}</p>}
            {contextHasNoJobDescription && (
              <p className="text-xs text-muted-foreground">
                This application doesn&apos;t have a job description, so a path can&apos;t be scoped to it yet.
              </p>
            )}
            <Button
              type="button"
              className="w-full"
              onClick={() => generate(selectedApplicationId)}
              disabled={loading || !selectedApplicationId || Boolean(contextHasNoJobDescription)}
            >
              <Sparkles className="size-4" aria-hidden="true" />
              {loading && previewApplicationId ? "Generating…" : "Generate Role-Specific Path"}
            </Button>
          </div>
        </ModeCard>
      </div>

      {applicationContext && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
          <span className="flex min-w-0 items-center gap-2">
            <Briefcase className="size-4 shrink-0 text-primary" aria-hidden="true" />
            <span className="min-w-0 truncate">
              Opened from <span className="font-medium">{applicationContext.jobTitle}</span> at{" "}
              <span className="font-medium">{applicationContext.companyName}</span>
            </span>
          </span>
          <Link
            href={`/applications/${applicationContext.id}`}
            className="inline-flex shrink-0 items-center gap-1 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" aria-hidden="true" />
            Back to application
          </Link>
        </div>
      )}

      {loading && <CyclingLoadingState messages={GENERATE_LOADING} />}

      {!loading && error && <ErrorState description={error} onRetry={() => generate(previewApplicationId)} />}

      {!loading && !error && preview && !saved && (
        <Card className="border-primary/30">
          <CardHeader>
            <CardTitle>{preview.pathTitle}</CardTitle>
            {preview.pathSummary && <CardDescription>{preview.pathSummary}</CardDescription>}
          </CardHeader>
          <CardContent className="space-y-3">
            {preview.topics.map((topic) => (
              <TopicCard key={topic.topic} topic={topic} />
            ))}

            {saveError && (
              <p role="alert" className="text-sm text-status-rejected-fg">
                {saveError}
              </p>
            )}

            <div className="flex items-center gap-2 pt-1">
              <Button type="button" onClick={save} disabled={saving}>
                {saving ? "Saving…" : "Save Learning Path"}
              </Button>
              <Button type="button" variant="outline" onClick={discard} disabled={saving}>
                <X className="size-4" />
                Discard
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {!loading && !error && saved && (
        <div className="rounded-md border border-status-offer-fg/40 bg-status-offer-bg/30 px-3 py-2 text-sm text-foreground">
          Saved — find it under &ldquo;My Learning&rdquo;.
        </div>
      )}
    </div>
  );
}
