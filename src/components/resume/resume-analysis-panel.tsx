"use client";

import type { FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft, Briefcase, FileSearch, FileText, Sparkles, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { CyclingLoadingState } from "@/components/ui/cycling-loading-state";
import { ErrorState } from "@/components/ui/error-state";
import { Collapsible } from "@/components/ui/collapsible";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MAX_JOB_DESCRIPTION_LENGTH } from "@/lib/job-analysis/job-analysis";
import { useResumeAnalysis } from "@/components/resume/use-resume-analysis";
import { ReadinessResult } from "@/components/resume/resume-analysis-readiness-result";
import { MatchResult } from "@/components/resume/resume-analysis-match-result";
import { BeforeAfterCard } from "@/components/resume/resume-analysis-before-after-card";
import { SaveVersionDialog } from "@/components/resume/resume-analysis-save-version-dialog";

export type {
  ApplicationOption,
  MasterOption,
  ResumeAnalysisApplicationContext,
  ResumeOption,
} from "@/components/resume/resume-analysis-types";
import type {
  ApplicationOption,
  MasterOption,
  ResumeAnalysisApplicationContext,
  ResumeOption,
} from "@/components/resume/resume-analysis-types";

const READINESS_LOADING = ["Analyzing resume structure…"];
const MATCH_LOADING = [
  "Reading your resume…",
  "Comparing it against the job description…",
  "Classifying matched, weak, and missing evidence…",
  "Drafting tailoring suggestions…",
];

export function ResumeAnalysisPanel({
  resumes,
  masterOptions,
  applicationOptions,
  initialDocumentId,
  applicationContext,
}: {
  resumes: ResumeOption[];
  masterOptions: MasterOption[];
  applicationOptions: ApplicationOption[];
  initialDocumentId?: string;
  applicationContext?: ResumeAnalysisApplicationContext;
}) {
  const {
    localResumes,
    documentId,
    setDocumentId,
    masterDocumentId,
    setMasterDocumentId,
    analysisMode,
    setAnalysisMode,
    jdSource,
    setJdSource,
    selectedApplicationId,
    setSelectedApplicationId,
    standaloneDescription,
    setStandaloneDescription,
    result,
    error,
    loading,
    suggestionStates,
    saveDialogOpen,
    setSaveDialogOpen,
    saving,
    saveError,
    updatingInPlace,
    beforeMatch,
    appliedTitles,
    session,
    restoringBest,
    selectedResume,
    activeApplicationPreview,
    needsManualDescription,
    canAnalyze,
    acceptedCount,
    contentChanged,
    canRestoreBest,
    analyze,
    handleManualAnalyze,
    handleAccept,
    handleReject,
    handleChangeText,
    handleSaveVersion,
    handleUpdateInPlace,
    handleDismissComparison,
    handleImproveAgain,
    handleRestoreBest,
  } = useResumeAnalysis({ resumes, applicationOptions, initialDocumentId, applicationContext });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (canAnalyze) handleManualAnalyze();
  }

  if (localResumes.length === 0) {
    return (
      <div className="mx-auto max-w-3xl">
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
            <FileText className="size-5 text-muted-foreground" aria-hidden="true" />
            <CardDescription>Add a resume document before running resume analysis.</CardDescription>
            <Link href="/documents/new" className="text-sm text-primary hover:underline">
              Add a resume
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10">
          <TrendingUp className="size-5 text-primary" aria-hidden="true" />
        </div>
        <div>
          <h2 className="text-base font-semibold tracking-tight">Career360 Resume Workspace</h2>
          <p className="text-sm text-muted-foreground">
            Check resume readiness on its own, or compare it against a job to see what matches,
            what&apos;s missing, and how to tailor it.
          </p>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="resumeDocument">Base resume</Label>
        <Select
          id="resumeDocument"
          value={documentId}
          onChange={(e) => setDocumentId(e.target.value)}
        >
          {localResumes.map((resume) => (
            <option key={resume.id} value={resume.id}>
              {resume.title}
              {resume.isTailored
                ? " (tailored)"
                : resume.resumeRole === "MAIN"
                  ? " (Main)"
                  : resume.resumeRole === "MASTER"
                    ? " (Master)"
                    : ""}
            </option>
          ))}
        </Select>
      </div>

      {!applicationContext && (
        <Tabs value={analysisMode} onValueChange={(v) => setAnalysisMode(v as "readiness" | "match")}>
          <TabsList>
            <TabsTrigger value="readiness">Readiness only</TabsTrigger>
            <TabsTrigger value="match">Compare to a job</TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      {analysisMode === "match" && masterOptions.length > 0 && (
        <div className="space-y-1.5">
          <Label htmlFor="masterResume">Master Resume (optional)</Label>
          <Select
            id="masterResume"
            value={masterDocumentId}
            onChange={(e) => setMasterDocumentId(e.target.value)}
            className="max-w-xs"
          >
            <option value="">None</option>
            {masterOptions
              .filter((m) => m.id !== documentId)
              .map((m) => (
                <option key={m.id} value={m.id}>
                  {m.title}
                </option>
              ))}
          </Select>
          <p className="text-xs text-muted-foreground">
            Career360 can suggest relevant content from this Master Resume — you decide what to accept.
          </p>
        </div>
      )}

      {applicationContext ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
            <span className="flex min-w-0 items-center gap-2">
              <Briefcase className="size-4 shrink-0 text-primary" aria-hidden="true" />
              <span className="min-w-0 truncate">
                Comparing against <span className="font-medium">{applicationContext.jobTitle}</span> at{" "}
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

          <Collapsible title="Job description" defaultOpen={!result && !loading}>
            <p className="whitespace-pre-wrap text-sm text-foreground">{applicationContext.jobDescription}</p>
          </Collapsible>

          <Button type="button" onClick={handleManualAnalyze} disabled={!canAnalyze}>
            <Sparkles className="size-4" />
            {loading ? "Analyzing…" : result ? "Re-analyze" : "Analyze"}
          </Button>
        </>
      ) : analysisMode === "match" ? (
        <>
          <Tabs value={jdSource} onValueChange={(v) => setJdSource(v as "application" | "paste")}>
            <TabsList>
              <TabsTrigger value="application">Select an application</TabsTrigger>
              <TabsTrigger value="paste">Paste a job description</TabsTrigger>
            </TabsList>
          </Tabs>

          {jdSource === "application" ? (
            applicationOptions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                None of your applications have a stored job description yet.{" "}
                <Link href="/applications" className="text-primary hover:underline">
                  Add one to an application
                </Link>{" "}
                or paste a job description instead.
              </p>
            ) : (
              <div className="space-y-1.5">
                <Label htmlFor="applicationSelect">Application</Label>
                <Select
                  id="applicationSelect"
                  value={selectedApplicationId}
                  onChange={(e) => setSelectedApplicationId(e.target.value)}
                >
                  <option value="">Select an application…</option>
                  {applicationOptions.map((app) => (
                    <option key={app.id} value={app.id}>
                      {app.jobTitle} at {app.companyName}
                    </option>
                  ))}
                </Select>
              </div>
            )
          ) : (
            <form onSubmit={handleSubmit} className="space-y-2">
              <Textarea
                placeholder="Paste the job description to compare against…"
                rows={8}
                value={standaloneDescription}
                maxLength={MAX_JOB_DESCRIPTION_LENGTH}
                onChange={(e) => setStandaloneDescription(e.target.value)}
                aria-label="Job description"
              />
              <span className="text-xs text-muted-foreground">
                {standaloneDescription.trim().length.toLocaleString()}/{MAX_JOB_DESCRIPTION_LENGTH.toLocaleString()}
              </span>
            </form>
          )}

          {activeApplicationPreview && jdSource === "application" && (
            <Collapsible title="Job description" defaultOpen={false}>
              <p className="whitespace-pre-wrap text-sm text-foreground">
                {activeApplicationPreview.jobDescription}
              </p>
            </Collapsible>
          )}

          <Button type="button" onClick={handleManualAnalyze} disabled={!canAnalyze}>
            <Sparkles className="size-4" />
            {loading ? "Analyzing…" : result ? "Re-analyze" : "Analyze"}
          </Button>
        </>
      ) : (
        <Button type="button" onClick={handleManualAnalyze} disabled={!canAnalyze}>
          <Sparkles className="size-4" />
          {loading ? "Analyzing…" : result ? "Re-analyze" : "Analyze Readiness"}
        </Button>
      )}

      {loading && <CyclingLoadingState messages={analysisMode === "match" ? MATCH_LOADING : READINESS_LOADING} />}

      {!loading && error && <ErrorState description={error} onRetry={analyze} />}

      {!loading && !error && analysisMode === "match" && session.analysisCount > 0 && session.bestScore !== null && (
        <div className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-muted/30 px-3 py-2 text-sm">
          <span className="text-muted-foreground">
            {session.analysisCount === 1
              ? "Initial analysis"
              : `Tailoring round ${Math.max(1, session.analysisCount - 1)} of 3`}
          </span>
          <span className="font-medium text-foreground">Best score: {session.bestScore} / 100</span>
          {canRestoreBest && (
            <Button type="button" size="sm" variant="ghost" disabled={restoringBest} onClick={handleRestoreBest}>
              {restoringBest ? "Restoring…" : "Restore best version"}
            </Button>
          )}
        </div>
      )}

      {!loading && !error && beforeMatch && result?.mode === "match" && (
        <BeforeAfterCard
          before={beforeMatch}
          after={result.match}
          appliedTitles={appliedTitles}
          round={Math.max(1, session.analysisCount - 1)}
          bestScore={session.bestScore ?? result.match.overallScore}
          tailoringComplete={session.tailoringComplete}
          canRestoreBest={canRestoreBest}
          restoringBest={restoringBest}
          onImproveAgain={handleImproveAgain}
          onRestoreBest={handleRestoreBest}
          onDismiss={handleDismissComparison}
        />
      )}

      {!loading && !error && result?.mode === "readiness" && <ReadinessResult readiness={result.readiness} />}

      {!loading && !error && result?.mode === "match" && (
        <>
          <MatchResult
            match={result.match}
            suggestionStates={suggestionStates}
            onAccept={handleAccept}
            onReject={handleReject}
            onChangeText={handleChangeText}
          />

          <Card>
            <CardHeader>
              <CardTitle>Save your changes</CardTitle>
              <CardDescription>
                {acceptedCount > 0
                  ? `${acceptedCount} suggestion${acceptedCount === 1 ? "" : "s"} accepted. Saving creates a separate document — your base and Master resumes stay untouched.`
                  : "Accept a suggestion above to build a tailored draft, or save an unmodified copy for this application."}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center gap-2">
              <Button type="button" onClick={() => setSaveDialogOpen(true)}>
                Save as {selectedResume?.isTailored ? "New" : "Tailored"} Version
              </Button>
              {selectedResume?.isTailored && (
                <Button
                  type="button"
                  variant="outline"
                  disabled={updatingInPlace || !contentChanged}
                  onClick={handleUpdateInPlace}
                >
                  {updatingInPlace ? "Updating…" : "Update This Version"}
                </Button>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {!loading && !error && !result && (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
            <FileSearch className="size-5 text-muted-foreground" aria-hidden="true" />
            <CardDescription>
              {needsManualDescription
                ? "Paste a job description above to get started."
                : "Click the button above to analyze this resume."}
            </CardDescription>
          </CardContent>
        </Card>
      )}

      <SaveVersionDialog
        open={saveDialogOpen}
        defaultTitle={
          activeApplicationPreview
            ? `${selectedResume?.title ?? "Resume"} — ${activeApplicationPreview.jobTitle}`
            : `${selectedResume?.title ?? "Resume"} (tailored)`
        }
        saving={saving}
        error={saveError}
        onClose={() => setSaveDialogOpen(false)}
        onSave={handleSaveVersion}
      />
    </div>
  );
}
