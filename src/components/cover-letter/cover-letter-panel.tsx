"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Briefcase, Check, Copy, FileText, Mail, RotateCcw, Sparkles } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { CyclingLoadingState } from "@/components/ui/cycling-loading-state";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { formatDateTime } from "@/lib/format";

export type CoverLetterResumeOption = {
  id: string;
  title: string;
  resumeRole: "MAIN" | "MASTER" | null;
  isTailored: boolean;
};

export type CoverLetterInitial = {
  content: string;
  updatedAt: string;
} | null;

const LOADING_MESSAGES = [
  "Reading the job details…",
  "Reviewing your resume…",
  "Finding relevant experience to highlight…",
  "Drafting your cover letter…",
];

export function CoverLetterPanel({
  applicationId,
  jobTitle,
  companyName,
  hasJobDescription,
  resumes,
  initialCoverLetter,
}: {
  applicationId: string;
  jobTitle: string;
  companyName: string;
  hasJobDescription: boolean;
  resumes: CoverLetterResumeOption[];
  initialCoverLetter: CoverLetterInitial;
}) {
  const preferredResumeId = resumes.find((r) => r.resumeRole === "MAIN")?.id ?? resumes[0]?.id ?? "";
  const [documentId, setDocumentId] = useState(preferredResumeId);
  const [content, setContent] = useState(initialCoverLetter?.content ?? "");
  const [savedAt, setSavedAt] = useState<string | null>(initialCoverLetter?.updatedAt ?? null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const generateInFlight = useRef(false);
  const saveInFlight = useRef(false);
  const toast = useToast();

  const canGenerate = !loading && !saving && hasJobDescription && documentId !== "";

  async function generate() {
    if (generateInFlight.current) return;
    generateInFlight.current = true;
    setLoading(true);
    setError(null);
    setCopied(false);

    try {
      const response = await fetch("/api/ai/cover-letter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId, documentId }),
      });

      const body = await response.json().catch(() => null);

      if (!response.ok) {
        setError(body?.error ?? "Something went wrong. Please try again.");
        return;
      }

      setContent(body.coverLetter as string);
      setSavedAt(null);
      toast.success("New draft generated");
    } catch {
      setError("Network error — please check your connection and try again.");
    } finally {
      setLoading(false);
      generateInFlight.current = false;
    }
  }

  async function save() {
    if (saveInFlight.current || !content.trim()) return;
    saveInFlight.current = true;
    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/applications/${applicationId}/cover-letter`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });

      const body = await response.json().catch(() => null);

      if (!response.ok) {
        // A save failure is a transient, one-click-to-retry situation — a
        // toast is enough. It deliberately does NOT set `error` here: that
        // state also drives the ErrorState card below, whose Retry button
        // re-runs `generate`, not `save` — reusing it for a save failure
        // would show a "Retry" that regenerates the draft instead of
        // re-saving it.
        toast.error(body?.error ?? "Couldn't save the cover letter. Please try again.");
        return;
      }

      setSavedAt(body.coverLetter?.updatedAt ?? null);
      toast.success("Cover letter saved");
    } catch {
      toast.error("Network error — please check your connection and try again.");
    } finally {
      setSaving(false);
      saveInFlight.current = false;
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Same reasoning as the save-failure path above — a toast avoids
      // misusing the generate-only ErrorState/Retry block for an unrelated
      // failure.
      toast.error("Couldn't copy to the clipboard.");
    }
  }

  function clear() {
    setContent("");
    setSavedAt(null);
    setError(null);
    setCopied(false);
  }

  if (resumes.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title="No resumes yet"
        description="Add a resume in Documents before generating a cover letter."
        action={
          <Link href="/documents" className={buttonVariants("outline", "sm")}>
            Go to Documents
          </Link>
        }
        className="py-16"
      />
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Mail className="size-4 text-primary" aria-hidden="true" />
            <CardTitle>Cover Letter</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
            <span className="flex min-w-0 items-center gap-2">
              <Briefcase className="size-4 shrink-0 text-primary" aria-hidden="true" />
              <span className="min-w-0 truncate">
                <span className="font-medium">{jobTitle}</span> at <span className="font-medium">{companyName}</span>
              </span>
            </span>
            <Link
              href={`/applications/${applicationId}`}
              className="inline-flex shrink-0 items-center gap-1 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="size-3.5" aria-hidden="true" />
              Back to application
            </Link>
          </div>
          {!hasJobDescription && (
            <p className="rounded-md border border-status-screening-fg/30 bg-status-screening-bg px-3 py-2 text-sm text-status-screening-fg">
              This application doesn&apos;t have a job description saved, so a cover letter can&apos;t be grounded in
              the role&apos;s requirements yet. Add one from the application&apos;s edit page first.
            </p>
          )}
          <div>
            <Label htmlFor="cover-letter-resume">Source resume</Label>
            <Select
              id="cover-letter-resume"
              value={documentId}
              onChange={(event) => setDocumentId(event.target.value)}
              disabled={loading}
              className="mt-1.5"
            >
              {resumes.map((resume) => (
                <option key={resume.id} value={resume.id}>
                  {resume.title}
                  {resume.resumeRole === "MAIN" ? " (Main)" : resume.isTailored ? " (Tailored)" : ""}
                </option>
              ))}
            </Select>
          </div>
          <Button onClick={generate} disabled={!canGenerate}>
            <Sparkles className="size-4" />
            {content ? "Regenerate draft" : "Generate draft"}
          </Button>
        </CardContent>
      </Card>

      {loading && (
        <Card>
          <CardContent className="py-10">
            <CyclingLoadingState messages={LOADING_MESSAGES} />
          </CardContent>
        </Card>
      )}

      {error && !loading && <ErrorState description={error} onRetry={canGenerate ? generate : undefined} />}

      {!loading && content && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Draft</CardTitle>
            <CardDescription>
              Review AI-generated content for accuracy and personalize it before sending.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              value={content}
              onChange={(event) => setContent(event.target.value)}
              rows={16}
              className="min-h-80 leading-relaxed"
              aria-label="Cover letter draft"
            />
            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={save} disabled={saving || loading || !content.trim()}>
                {saving ? "Saving…" : "Save"}
              </Button>
              <Button variant="outline" onClick={generate} disabled={!canGenerate}>
                <Sparkles className="size-4" />
                Regenerate
              </Button>
              <Button variant="outline" onClick={copy} disabled={!content.trim()}>
                {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                {copied ? "Copied" : "Copy"}
              </Button>
              <Button variant="ghost" onClick={clear} disabled={loading || saving}>
                <RotateCcw className="size-4" />
                Clear
              </Button>
              {savedAt && <span className="ml-auto text-xs text-muted-foreground">Saved {formatDateTime(savedAt)}</span>}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
