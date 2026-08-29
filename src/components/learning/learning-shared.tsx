import { ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress-bar";
import { SKILL_LEVEL_LABELS } from "@/lib/format";
import type { LearningSource, SavedPathDetail, SavedPathListItem, SkillLevel, TopicProgressStatus } from "@/components/learning/learning-types";

export const PROGRESS_OPTIONS: TopicProgressStatus[] = ["NOT_STARTED", "IN_PROGRESS", "COMPLETED"];

export const PROGRESS_LABELS: Record<TopicProgressStatus, string> = {
  NOT_STARTED: "Not Started",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
};

export function SkillLevelLabel({ level }: { level: SkillLevel | null }) {
  if (!level) return <span className="text-muted-foreground">Not assessed</span>;
  return <>{SKILL_LEVEL_LABELS[level]}</>;
}

export function LevelArrow({ current, target }: { current: SkillLevel | null; target: SkillLevel | null }) {
  return (
    <>
      <SkillLevelLabel level={current} /> <span aria-hidden="true">→</span> <span className="sr-only">to</span>{" "}
      <SkillLevelLabel level={target} />
    </>
  );
}

export function sourceBadge(source: LearningSource, applicationId: string | null): { label: string; variant: "primary" | "info" | "neutral" } {
  if (source === "PERSONAL") return { label: "PERSONAL", variant: "neutral" };
  if (source === "APPLICATION" || applicationId) return { label: "ROLE-SPECIFIC", variant: "info" };
  return { label: "RECOMMENDED", variant: "primary" };
}

export function pathDescription(path: { source: LearningSource; applicationId: string | null; summary: string | null }): string {
  if (path.summary?.trim()) return path.summary.trim();
  if (path.source === "PERSONAL") return "My own learning plan.";
  if (path.source === "APPLICATION" || path.applicationId) return "Based on your resume and this job's requirements.";
  return "Based on your resume and overall career profile.";
}

// No outer card here — kept compact so it reads as a header, not a section.
export function PathHeader({ detail, loading }: { detail: SavedPathDetail | null; loading: boolean }) {
  if (loading || !detail) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }
  const badge = sourceBadge(detail.source, detail.applicationId);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-lg font-semibold tracking-tight text-foreground">{detail.title}</h1>
        <Badge variant={badge.variant}>{badge.label}</Badge>
      </div>
      <p className="text-sm text-muted-foreground">{pathDescription(detail)}</p>
      <p className="text-xs text-muted-foreground">
        {detail.progressSummary.total} topic{detail.progressSummary.total === 1 ? "" : "s"} ·{" "}
        {detail.progressSummary.completed} completed
      </p>
      {detail.progressSummary.total > 0 && (
        <div>
          <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
            <span>Learning Progress</span>
            <span>{detail.progressSummary.percentage}%</span>
          </div>
          <ProgressBar percentage={detail.progressSummary.percentage} />
        </div>
      )}
    </div>
  );
}

// No inline expansion — selecting a path opens the full PathWorkspace instead.
export function PathListRow({ path, onSelect }: { path: SavedPathListItem; onSelect: () => void }) {
  const badge = sourceBadge(path.source, path.applicationId);

  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex w-full items-center justify-between gap-3 rounded-md border border-border px-4 py-3 text-left transition-colors hover:bg-muted/40"
    >
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span className="min-w-0 truncate text-sm font-medium text-foreground">{path.title}</span>
        <Badge variant={badge.variant} className="shrink-0">
          {badge.label}
        </Badge>
      </div>
      <div className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
        <span>
          {path._count.topics} topic{path._count.topics === 1 ? "" : "s"}
        </span>
        <ChevronRight className="size-4" aria-hidden="true" />
      </div>
    </button>
  );
}
