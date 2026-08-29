import { useState } from "react";
import { Check, Pencil, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge, PriorityBadge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import type { RequirementMatch, ResumeJdMatch, ResumeSuggestion, SuggestionType } from "@/lib/resume/resume-analysis";
import { CategoryDetailCard, ScoreBar } from "@/components/resume/resume-analysis-readiness-result";
import type { SuggestionState } from "@/components/resume/resume-analysis-types";

const REQUIREMENT_GROUPS: { status: RequirementMatch["status"]; title: string; description: string }[] = [
  { status: "MATCHED", title: "Matched", description: "Requirements your resume clearly demonstrates." },
  { status: "WEAK", title: "Weak / partial match", description: "Related or vague evidence — worth strengthening." },
  { status: "MISSING", title: "Missing / no evidence", description: "Not found in your resume. Career360 will not invent this." },
];

function RequirementGroup({ title, description, items }: { title: string; description: string; items: RequirementMatch[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="text-sm font-semibold text-foreground">
        {title} ({items.length})
      </p>
      <p className="mb-2 text-xs text-muted-foreground">{description}</p>
      <div className="space-y-2">
        {items.map((requirement, index) => (
          <div key={index} className="rounded-md border border-border px-3 py-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-foreground">{requirement.requirement}</span>
              <PriorityBadge priority={requirement.importance} />
              {requirement.evidenceSource && (
                <Badge variant="neutral">via {requirement.evidenceSource === "MAIN" ? "Main" : "Master"}</Badge>
              )}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{requirement.reason}</p>
            {requirement.evidence && (
              <p className="mt-1 text-xs italic text-foreground">&ldquo;{requirement.evidence}&rdquo;</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

const SUGGESTION_TYPE_LABELS = {
  KEYWORD: "Keyword",
  BULLET: "Bullet",
  PROJECT_PRIORITY: "Project priority",
  MASTER_CONTENT: "From Master Resume",
} as const;

// Groups the flat suggestion list into the categories a user can review as
// one complete plan, rather than one suggestion type at a time — see
// SUGGESTION_TYPES for the underlying classification (ATS/Structure has its
// own always-visible, deterministic card above and isn't repeated here;
// "Cannot address without evidence" surfaces separately via the Requirement
// match card's MISSING group).
const SUGGESTION_GROUPS: { type: SuggestionType; title: string; description: string }[] = [
  { type: "MASTER_CONTENT", title: "Add from Master Resume", description: "Relevant career content pulled in from your Master Resume." },
  { type: "BULLET", title: "Improve existing content", description: "Rewordings of bullets that already exist in this resume." },
  { type: "PROJECT_PRIORITY", title: "Project & experience emphasis", description: "Reordering or emphasis changes — nothing new is added." },
  { type: "KEYWORD", title: "Technical skills / keywords", description: "Surfacing terminology the job description uses, from content that's already there." },
];

function SuggestionCard({
  suggestion,
  state,
  onAccept,
  onReject,
  onChangeText,
}: {
  suggestion: ResumeSuggestion;
  state: SuggestionState;
  onAccept: () => void;
  onReject: () => void;
  onChangeText: (text: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const canAutoApply =
    suggestion.type === "BULLET"
      ? suggestion.current !== null
      : suggestion.type === "MASTER_CONTENT"
        ? suggestion.masterExcerpt !== null
        : true;

  return (
    <div
      className={cn(
        "rounded-md border px-3 py-3 transition-colors",
        state.status === "accepted" && "border-status-offer-fg/40 bg-status-offer-bg/30",
        state.status === "rejected" && "opacity-50",
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={suggestion.type === "MASTER_CONTENT" ? "success" : "info"}>
          {SUGGESTION_TYPE_LABELS[suggestion.type]}
        </Badge>
        <p className="text-sm font-medium text-foreground">{suggestion.title}</p>
      </div>

      {suggestion.current && (
        <p className="mt-2 text-xs text-muted-foreground line-through">{suggestion.current}</p>
      )}
      {suggestion.type === "MASTER_CONTENT" && suggestion.masterExcerpt && (
        <p className="mt-2 text-xs text-muted-foreground">
          From your Master Resume: &ldquo;{suggestion.masterExcerpt}&rdquo;
        </p>
      )}

      {editing ? (
        <Textarea
          rows={3}
          value={state.text}
          onChange={(e) => onChangeText(e.target.value)}
          className="mt-1 text-sm"
        />
      ) : (
        <p className="mt-1 text-sm text-foreground">{state.text}</p>
      )}

      <p className="mt-2 text-xs text-muted-foreground">{suggestion.rationale}</p>

      {!canAutoApply && (
        <p className="mt-1 text-xs text-status-screening-fg">
          Couldn&apos;t locate this exact text in your resume to auto-apply — accepting only marks it
          as reviewed; edit your resume content manually if you want to use it.
        </p>
      )}

      <div className="mt-3 flex items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant={state.status === "accepted" ? "primary" : "outline"}
          onClick={onAccept}
        >
          <Check className="size-4" />
          Accept
        </Button>
        <Button
          type="button"
          size="sm"
          variant={state.status === "rejected" ? "destructive" : "outline"}
          onClick={onReject}
        >
          <XCircle className="size-4" />
          Reject
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setEditing((e) => !e)}>
          <Pencil className="size-4" />
          {editing ? "Done editing" : "Edit"}
        </Button>
      </div>
    </div>
  );
}

export function MatchResult({
  match,
  suggestionStates,
  onAccept,
  onReject,
  onChangeText,
}: {
  match: ResumeJdMatch;
  suggestionStates: Record<string, SuggestionState>;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
  onChangeText: (id: string, text: string) => void;
}) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Estimated ATS Readiness for this job</CardTitle>
          <CardDescription>
            A transparent estimate computed by Career360 from evidence classification — Gemini
            classifies matches, Career360 computes the score. Not a guarantee of any specific
            company&apos;s real ATS result.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-semibold text-foreground">{match.overallScore}</span>
            <span className="text-sm text-muted-foreground">/ 100</span>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <ScoreBar label="Keyword alignment" score={match.scoreCategories.keywordAlignment} />
            <ScoreBar label="Required skills" score={match.scoreCategories.requiredSkillCoverage} />
            <ScoreBar label="Experience relevance" score={match.scoreCategories.experienceRelevance} />
            <ScoreBar label="Project relevance" score={match.scoreCategories.projectRelevance} />
            <ScoreBar label="Structure" score={match.scoreCategories.structure} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Resume structure detail</CardTitle>
          <CardDescription>
            Clearly separate from JD match — this reflects how parser-friendly the resume itself is,
            regardless of which job it&apos;s compared against.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {match.structureCategories.map((category) => (
            <CategoryDetailCard key={category.key} category={category} />
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Requirement match</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {REQUIREMENT_GROUPS.map((group) => (
            <RequirementGroup
              key={group.status}
              title={group.title}
              description={group.description}
              items={match.requirementMatches.filter((r) => r.status === group.status)}
            />
          ))}
        </CardContent>
      </Card>

      {match.strengthsToHighlight.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Strengths to highlight</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-inside list-disc space-y-1 text-sm text-foreground">
              {match.strengthsToHighlight.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {match.suggestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Tailoring plan</CardTitle>
            <CardDescription>
              Every suggestion rewrites or pulls in something that already exists — review the complete
              plan below, edit if needed, then accept or reject each one.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {SUGGESTION_GROUPS.map((group) => {
              const items = match.suggestions.filter((s) => s.type === group.type);
              if (items.length === 0) return null;
              return (
                <div key={group.type}>
                  <p className="text-sm font-semibold text-foreground">
                    {group.title} ({items.length})
                  </p>
                  <p className="mb-2 text-xs text-muted-foreground">{group.description}</p>
                  <div className="space-y-3">
                    {items.map((suggestion) => (
                      <SuggestionCard
                        key={suggestion.id}
                        suggestion={suggestion}
                        state={suggestionStates[suggestion.id] ?? { status: "pending", text: suggestion.suggested }}
                        onAccept={() => onAccept(suggestion.id)}
                        onReject={() => onReject(suggestion.id)}
                        onChangeText={(text) => onChangeText(suggestion.id, text)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
