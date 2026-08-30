import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import type { ReadinessCategory } from "@/lib/resume/ats-scoring";
import type { ResumeReadiness } from "@/lib/resume/resume-analysis";

function scoreBarColor(score: number) {
  if (score >= 80) return "bg-status-offer-fg";
  if (score >= 55) return "bg-status-screening-fg";
  return "bg-status-rejected-fg";
}

export function ScoreBar({ label, score }: { label: string; score: number }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium text-foreground">{score}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full", scoreBarColor(score))}
          style={{ width: `${Math.max(0, Math.min(100, score))}%` }}
        />
      </div>
    </div>
  );
}

const PRIORITY_VARIANT = { HIGH: "destructive", MEDIUM: "warning", LOW: "neutral" } as const;

/** One fully-explained ATS category: score, what was detected, why it matters, and what to do about it. */
export function CategoryDetailCard({ category }: { category: ReadinessCategory }) {
  return (
    <div className="rounded-md border border-border px-3 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-foreground">{category.label}</p>
        <div className="flex items-center gap-2">
          {category.priority ? (
            <Badge variant={PRIORITY_VARIANT[category.priority]}>{category.priority} priority</Badge>
          ) : (
            <Badge variant="success">No action needed</Badge>
          )}
          <span className="text-sm font-semibold text-foreground">{category.score}</span>
        </div>
      </div>
      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full", scoreBarColor(category.score))}
          style={{ width: `${Math.max(0, Math.min(100, category.score))}%` }}
        />
      </div>
      <dl className="mt-2.5 space-y-1.5 text-sm">
        <div>
          <dt className="text-xs font-medium text-muted-foreground">Detected</dt>
          <dd className="text-foreground">{category.detected}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-muted-foreground">Why it matters</dt>
          <dd className="text-muted-foreground">{category.whyItMatters}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-muted-foreground">Recommendation</dt>
          <dd className="text-foreground">{category.recommendation}</dd>
        </div>
      </dl>
    </div>
  );
}

export function ReadinessResult({ readiness }: { readiness: ResumeReadiness }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">ATS Readiness</CardTitle>
        <CardDescription>
          A heuristic estimate based on resume structure — not a guarantee of how any specific
          company&apos;s ATS will parse or score this resume.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-semibold text-foreground">{readiness.overallScore}</span>
          <span className="text-sm text-muted-foreground">/ 100</span>
        </div>
        <div className="space-y-3">
          {readiness.categories.map((category) => (
            <CategoryDetailCard key={category.key} category={category} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
