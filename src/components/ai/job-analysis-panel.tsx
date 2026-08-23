"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft, Briefcase, FileSearch, ListChecks, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge, PriorityBadge } from "@/components/ui/badge";
import { LoadingState } from "@/components/ui/loading-state";
import { ErrorState } from "@/components/ui/error-state";
import { Collapsible } from "@/components/ui/collapsible";
import { Divider } from "@/components/ui/divider";
import { MAX_JOB_DESCRIPTION_LENGTH, type JobAnalysis } from "@/lib/job-analysis";

export type JobAnalysisApplicationContext = {
  id: number;
  jobTitle: string;
  companyName: string;
  jobDescription: string;
};

const LOADING_MESSAGES = [
  "Analyzing job description…",
  "Extracting skills and technologies…",
  "Identifying interview focus areas…",
  "Building your preparation plan…",
];

/**
 * Mounted only while a request is in flight (see usage below), so its index
 * naturally starts fresh at 0 every time — no effect-based reset needed.
 */
function CyclingLoadingState() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((i) => Math.min(i + 1, LOADING_MESSAGES.length - 1));
    }, 2200);
    return () => clearInterval(interval);
  }, []);

  return <LoadingState label={LOADING_MESSAGES[index]} />;
}

function SkillGroup({ label, items }: { label: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="mb-1.5 text-xs font-medium text-muted-foreground">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item) => (
          <Badge key={item} variant="neutral">
            {item}
          </Badge>
        ))}
      </div>
    </div>
  );
}

function QuestionList({ label, questions }: { label: string; questions: string[] }) {
  if (questions.length === 0) return null;
  return (
    <Collapsible title={`${label} (${questions.length})`}>
      <ol className="list-inside list-decimal space-y-2 text-sm text-foreground">
        {questions.map((question) => (
          <li key={question}>{question}</li>
        ))}
      </ol>
    </Collapsible>
  );
}

function AnalysisResult({ analysis }: { analysis: JobAnalysis }) {
  const hasSkills = Object.values(analysis.skills).some((group) => group.length > 0);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-base">{analysis.overview.roleTitle}</CardTitle>
            {analysis.overview.seniority && <Badge variant="info">{analysis.overview.seniority}</Badge>}
          </div>
          {analysis.overview.summary && <CardDescription>{analysis.overview.summary}</CardDescription>}
        </CardHeader>
        {analysis.responsibilities.length > 0 && (
          <CardContent>
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">Key responsibilities</p>
            <ul className="list-inside list-disc space-y-1 text-sm text-foreground">
              {analysis.responsibilities.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </CardContent>
        )}
      </Card>

      {hasSkills && (
        <Card>
          <CardHeader>
            <CardTitle>Required skills</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <SkillGroup label="Technical" items={analysis.skills.technical} />
            <SkillGroup label="Frameworks & libraries" items={analysis.skills.frameworksAndLibraries} />
            <SkillGroup label="Languages" items={analysis.skills.languages} />
            <SkillGroup label="Tools & platforms" items={analysis.skills.toolsAndPlatforms} />
            <SkillGroup label="Soft skills" items={analysis.skills.softSkills} />
            <SkillGroup label="Domain knowledge" items={analysis.skills.domainKnowledge} />
          </CardContent>
        </Card>
      )}

      {analysis.technologies.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Important technologies</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-1.5">
            {analysis.technologies.map((tech) => (
              <Badge key={tech} variant="primary">
                {tech}
              </Badge>
            ))}
          </CardContent>
        </Card>
      )}

      {analysis.interviewFocus.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Interview focus areas</CardTitle>
            <CardDescription>Areas this posting suggests you should be ready to discuss.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-1.5">
            {analysis.interviewFocus.map((area) => (
              <Badge key={area} variant="info">
                {area}
              </Badge>
            ))}
          </CardContent>
        </Card>
      )}

      {analysis.preparationPriorities.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Preparation priorities</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {analysis.preparationPriorities.map((item) => (
              <div key={item.topic} className="flex items-start gap-3">
                <PriorityBadge priority={item.priority} className="mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{item.topic}</p>
                  {item.reason && <p className="text-sm text-muted-foreground">{item.reason}</p>}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {analysis.preparationPlan.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Preparation plan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {analysis.preparationPlan.map((item, index) => (
              <div key={item.topic}>
                <p className="text-sm font-semibold text-foreground">
                  {index + 1}. {item.topic}
                </p>
                <dl className="mt-1.5 space-y-1 text-sm">
                  {item.whyItMatters && (
                    <div className="flex gap-1.5">
                      <dt className="shrink-0 font-medium text-muted-foreground">Why it matters:</dt>
                      <dd className="text-foreground">{item.whyItMatters}</dd>
                    </div>
                  )}
                  {item.whatToStudy && (
                    <div className="flex gap-1.5">
                      <dt className="shrink-0 font-medium text-muted-foreground">What to study:</dt>
                      <dd className="text-foreground">{item.whatToStudy}</dd>
                    </div>
                  )}
                  {item.practiceRecommendation && (
                    <div className="flex gap-1.5">
                      <dt className="shrink-0 font-medium text-muted-foreground">Practice:</dt>
                      <dd className="text-foreground">{item.practiceRecommendation}</dd>
                    </div>
                  )}
                </dl>
                {index < analysis.preparationPlan.length - 1 && <Divider className="mt-4" />}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {(analysis.likelyQuestions.technical.length > 0 ||
        analysis.likelyQuestions.behavioral.length > 0 ||
        analysis.likelyQuestions.roleSpecific.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle>Likely interview questions</CardTitle>
            <CardDescription>Preparation material — not an interactive mock interview.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <QuestionList label="Technical" questions={analysis.likelyQuestions.technical} />
            <QuestionList label="Behavioral" questions={analysis.likelyQuestions.behavioral} />
            <QuestionList label="Role-specific" questions={analysis.likelyQuestions.roleSpecific} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export function JobAnalysisPanel({
  applicationContext,
}: {
  applicationContext?: JobAnalysisApplicationContext;
}) {
  const [standaloneDescription, setStandaloneDescription] = useState("");
  const [analysis, setAnalysis] = useState<JobAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const requestInFlight = useRef(false);

  const descriptionLength = applicationContext
    ? applicationContext.jobDescription.length
    : standaloneDescription.trim().length;
  const canAnalyze =
    !loading &&
    descriptionLength > 0 &&
    (applicationContext ? true : descriptionLength <= MAX_JOB_DESCRIPTION_LENGTH);

  async function analyze() {
    if (requestInFlight.current) return;
    requestInFlight.current = true;
    setLoading(true);
    setError(null);
    setAnalysis(null);

    try {
      const response = await fetch("/api/ai/job-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          applicationContext
            ? { applicationId: applicationContext.id }
            : { jobDescription: standaloneDescription.trim() },
        ),
      });

      const body = await response.json().catch(() => null);

      if (!response.ok) {
        setError(body?.error ?? "Something went wrong. Please try again.");
        return;
      }

      setAnalysis(body.analysis as JobAnalysis);
    } catch {
      setError("Network error — please check your connection and try again.");
    } finally {
      setLoading(false);
      requestInFlight.current = false;
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (canAnalyze) analyze();
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10">
          <FileSearch className="size-5 text-primary" aria-hidden="true" />
        </div>
        <div>
          <h2 className="text-base font-semibold tracking-tight">Career360 Job Analysis</h2>
          <p className="text-sm text-muted-foreground">
            Get a structured breakdown of what a role requires and a personalized preparation plan.
          </p>
        </div>
      </div>

      {applicationContext ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
            <span className="flex min-w-0 items-center gap-2">
              <Briefcase className="size-4 shrink-0 text-primary" aria-hidden="true" />
              <span className="min-w-0 truncate">
                Analyzing <span className="font-medium">{applicationContext.jobTitle}</span> at{" "}
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

          <Collapsible title="Job description" defaultOpen={!analysis && !loading}>
            <p className="whitespace-pre-wrap text-sm text-foreground">{applicationContext.jobDescription}</p>
          </Collapsible>

          <Button type="button" onClick={analyze} disabled={!canAnalyze}>
            <Sparkles className="size-4" />
            {loading ? "Analyzing…" : analysis ? "Re-analyze Job" : "Analyze Job"}
          </Button>
        </>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-2">
          <Textarea
            placeholder="Paste a job description to analyze…"
            rows={8}
            value={standaloneDescription}
            maxLength={MAX_JOB_DESCRIPTION_LENGTH}
            onChange={(e) => setStandaloneDescription(e.target.value)}
            aria-label="Job description"
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {standaloneDescription.trim().length.toLocaleString()}/{MAX_JOB_DESCRIPTION_LENGTH.toLocaleString()}
            </span>
            <Button type="submit" disabled={!canAnalyze}>
              <Sparkles className="size-4" />
              {loading ? "Analyzing…" : "Analyze Job"}
            </Button>
          </div>
        </form>
      )}

      {loading && <CyclingLoadingState />}

      {!loading && error && <ErrorState description={error} onRetry={analyze} />}

      {!loading && !error && analysis && <AnalysisResult analysis={analysis} />}

      {!loading && !error && !analysis && (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
            <ListChecks className="size-5 text-muted-foreground" aria-hidden="true" />
            <CardDescription>
              {applicationContext
                ? "Click “Analyze Job” to get a structured breakdown and preparation plan."
                : "Paste a job description above to get started."}
            </CardDescription>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
