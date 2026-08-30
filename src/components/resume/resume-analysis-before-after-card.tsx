import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ResumeJdMatch } from "@/lib/resume/resume-analysis";

function ScoreDeltaRow({ label, before, after }: { label: string; before: number; after: number }) {
  const delta = after - before;
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="flex items-center gap-1.5">
        <span className="text-muted-foreground">{before}</span>
        <span className="text-muted-foreground" aria-hidden="true">
          →
        </span>
        <span className="font-medium text-foreground">{after}</span>
        {delta !== 0 && (
          <Badge variant={delta > 0 ? "success" : "destructive"}>
            {delta > 0 ? "+" : ""}
            {delta}
          </Badge>
        )}
      </span>
    </div>
  );
}

export function BeforeAfterCard({
  before,
  after,
  appliedTitles,
  round,
  bestScore,
  tailoringComplete,
  canRestoreBest,
  restoringBest,
  onImproveAgain,
  onRestoreBest,
  onDismiss,
}: {
  before: ResumeJdMatch;
  after: ResumeJdMatch;
  appliedTitles: string[];
  round: number;
  bestScore: number;
  tailoringComplete: boolean;
  canRestoreBest: boolean;
  restoringBest: boolean;
  onImproveAgain: () => void;
  onRestoreBest: () => void;
  onDismiss: () => void;
}) {
  const stillWeak = after.requirementMatches.filter((r) => r.status === "WEAK");
  const stillMissing = after.requirementMatches.filter((r) => r.status === "MISSING");
  const isRegression = after.overallScore < bestScore;
  const isBest = after.overallScore >= bestScore;

  return (
    <Card className="border-primary/30">
      <CardHeader>
        <CardTitle>
          Before / After
          <span className="ml-2 font-normal text-muted-foreground">— Tailoring round {round} of 3</span>
        </CardTitle>
        <CardDescription>
          Automatically re-analyzed against the same job right after saving. This is Career360&apos;s
          own estimate — not a guarantee of any company&apos;s real ATS result.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-3 rounded-md border border-border px-3 py-2 text-sm">
          <span className="text-muted-foreground">Best score</span>
          <span className="font-semibold text-foreground">{bestScore} / 100</span>
          {isBest ? (
            <Badge variant="success">This is your best version</Badge>
          ) : (
            <Badge variant="destructive">
              ↓ {bestScore - after.overallScore} below best
            </Badge>
          )}
        </div>

        <ScoreDeltaRow label="Overall score" before={before.overallScore} after={after.overallScore} />
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <ScoreDeltaRow
            label="Keyword alignment"
            before={before.scoreCategories.keywordAlignment}
            after={after.scoreCategories.keywordAlignment}
          />
          <ScoreDeltaRow
            label="Required skills"
            before={before.scoreCategories.requiredSkillCoverage}
            after={after.scoreCategories.requiredSkillCoverage}
          />
          <ScoreDeltaRow
            label="Experience relevance"
            before={before.scoreCategories.experienceRelevance}
            after={after.scoreCategories.experienceRelevance}
          />
          <ScoreDeltaRow
            label="Project relevance"
            before={before.scoreCategories.projectRelevance}
            after={after.scoreCategories.projectRelevance}
          />
          <ScoreDeltaRow label="Structure" before={before.scoreCategories.structure} after={after.scoreCategories.structure} />
        </div>

        {isRegression && (
          <div className="rounded-md border border-status-rejected-fg/30 bg-status-rejected-bg/20 px-3 py-2 text-sm text-foreground">
            Your previous version scored higher, so Career360 kept your best version
            {canRestoreBest ? " — you can restore it below." : "."}
          </div>
        )}

        {appliedTitles.length > 0 && (
          <div>
            <p className="text-sm font-medium text-foreground">Applied this round</p>
            <ul className="mt-1 list-inside list-disc text-sm text-muted-foreground">
              {appliedTitles.map((title) => (
                <li key={title}>{title}</li>
              ))}
            </ul>
          </div>
        )}

        {(stillWeak.length > 0 || stillMissing.length > 0) && (
          <div>
            <p className="text-sm font-medium text-foreground">Remaining meaningful gaps</p>
            <ul className="mt-1 list-inside list-disc text-sm text-muted-foreground">
              {stillMissing.map((r) => (
                <li key={`missing-${r.requirement}`}>Missing evidence: {r.requirement}</li>
              ))}
              {stillWeak.map((r) => (
                <li key={`weak-${r.requirement}`}>Weak evidence: {r.requirement}</li>
              ))}
            </ul>
          </div>
        )}

        {tailoringComplete && (
          <div className="rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm text-foreground">
            Tailoring complete — Career360 has generated and reviewed up to the maximum of 3 refinement
            rounds. You can save your best version, or keep manually editing the resume.
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          {!tailoringComplete && (
            <Button type="button" onClick={onImproveAgain}>
              <Sparkles className="size-4" />
              Improve Again
            </Button>
          )}
          {canRestoreBest && (
            <Button type="button" variant="outline" disabled={restoringBest} onClick={onRestoreBest}>
              {restoringBest ? "Restoring…" : "Restore Best Version"}
            </Button>
          )}
          <Button type="button" variant="outline" onClick={onDismiss}>
            Done for now
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
