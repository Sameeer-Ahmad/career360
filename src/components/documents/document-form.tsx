"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { DocumentContentFormat, DocumentType, ResumeRole } from "@prisma/client";
import { AlertCircle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { DOCUMENT_CONTENT_FORMAT_LABELS, DOCUMENT_TYPE_LABELS, RESUME_ROLE_LABELS } from "@/lib/format";
import { MAX_DOCUMENT_CONTENT_LENGTH, MAX_TITLE_LENGTH } from "@/lib/documents/document-limits";
import { approximateLatexPreview } from "@/lib/documents/latex-preview";
import { ResumeUpload } from "@/components/documents/resume-upload";
import { useToast } from "@/components/ui/toast";

const DOCUMENT_TYPES = Object.keys(DOCUMENT_TYPE_LABELS) as DocumentType[];
const CONTENT_FORMATS = Object.keys(DOCUMENT_CONTENT_FORMAT_LABELS) as DocumentContentFormat[];
const RESUME_ROLES = Object.keys(RESUME_ROLE_LABELS) as ResumeRole[];

type FormValues = {
  title: string;
  type: DocumentType;
  contentFormat: DocumentContentFormat;
  resumeRole: ResumeRole;
  content: string;
};

export type DocumentFormInitialValues = {
  title: string;
  type: DocumentType;
  contentFormat: DocumentContentFormat;
  resumeRole: ResumeRole | null;
  content: string;
  /** True for a tailored version — its role is implicit (neither Main nor Master), so the selector is hidden. */
  isTailoredVersion?: boolean;
};

function toFormValues(initial?: DocumentFormInitialValues): FormValues {
  return {
    title: initial?.title ?? "",
    type: initial?.type ?? "RESUME",
    contentFormat: initial?.contentFormat ?? "PLAIN",
    resumeRole: initial?.resumeRole ?? "MAIN",
    content: initial?.content ?? "",
  };
}

function validate(values: FormValues): string[] {
  const issues: string[] = [];
  if (!values.title.trim()) issues.push("Title is required.");
  if (values.title.trim().length > MAX_TITLE_LENGTH) {
    issues.push(`Title must be ${MAX_TITLE_LENGTH} characters or fewer.`);
  }
  if (!values.content.trim()) issues.push("Content is required.");
  if (values.content.trim().length > MAX_DOCUMENT_CONTENT_LENGTH) {
    issues.push(`Content must be ${MAX_DOCUMENT_CONTENT_LENGTH.toLocaleString()} characters or fewer.`);
  }
  return issues;
}

function toRequestBody(values: FormValues, showResumeRole: boolean) {
  return {
    title: values.title.trim(),
    type: values.type,
    contentFormat: values.contentFormat,
    content: values.content.trim(),
    ...(showResumeRole && values.type === "RESUME" ? { resumeRole: values.resumeRole } : {}),
  };
}

export function DocumentForm({
  mode,
  documentId,
  initialValues,
}: {
  mode: "create" | "edit";
  documentId?: string;
  initialValues?: DocumentFormInitialValues;
}) {
  const showResumeRole = !initialValues?.isTailoredVersion;
  const router = useRouter();
  const toast = useToast();
  const [values, setValues] = useState<FormValues>(() => toFormValues(initialValues));
  const [issues, setIssues] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [importedFrom, setImportedFrom] = useState<string | null>(null);

  const latexPreview = useMemo(
    () => (values.contentFormat === "LATEX" ? approximateLatexPreview(values.content) : null),
    [values.contentFormat, values.content],
  );

  function update<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function handleExtracted(content: string, filename: string, contentFormat: DocumentContentFormat) {
    setValues((prev) => ({
      ...prev,
      content,
      contentFormat,
      title: prev.title.trim() || filename.replace(/\.(pdf|docx|tex)$/i, ""),
    }));
    setImportedFrom(filename);
    setIssues([]);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (submitting) return;

    const clientIssues = validate(values);
    if (clientIssues.length > 0) {
      setIssues(clientIssues);
      return;
    }

    setIssues([]);
    setSubmitting(true);
    try {
      const url = mode === "create" ? "/api/documents" : `/api/documents/${documentId}`;
      const method = mode === "create" ? "POST" : "PATCH";
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toRequestBody(values, showResumeRole)),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        const messages: string[] =
          body?.issues && Array.isArray(body.issues)
            ? body.issues
            : [body?.error ?? "Something went wrong. Please try again."];
        setIssues(messages);
        toast.error(messages[0]);
        setSubmitting(false);
        return;
      }

      const document = await response.json();
      toast.success(mode === "create" ? "Document created" : "Document saved");
      router.push(`/documents/${document.id}`);
      router.refresh();
    } catch {
      setIssues(["Network error — please check your connection and try again."]);
      toast.error("Network error — please check your connection and try again.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      {issues.length > 0 && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-md border border-status-rejected-fg/30 bg-status-rejected-bg px-3 py-2.5 text-sm text-status-rejected-fg"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <ul className="list-inside list-disc space-y-0.5">
            {issues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        </div>
      )}

      <Card>
        <CardContent className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="title">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              placeholder="Master Resume"
              required
              maxLength={MAX_TITLE_LENGTH}
              value={values.title}
              onChange={(e) => update("title", e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="type">Type</Label>
            <Select
              id="type"
              value={values.type}
              onChange={(e) => update("type", e.target.value as DocumentType)}
            >
              {DOCUMENT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {DOCUMENT_TYPE_LABELS[type]}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="contentFormat">Content format</Label>
            <Select
              id="contentFormat"
              value={values.contentFormat}
              onChange={(e) => update("contentFormat", e.target.value as DocumentContentFormat)}
              className="max-w-xs"
            >
              {CONTENT_FORMATS.map((format) => (
                <option key={format} value={format}>
                  {DOCUMENT_CONTENT_FORMAT_LABELS[format]}
                </option>
              ))}
            </Select>
          </div>

          {showResumeRole && values.type === "RESUME" && (
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="resumeRole">Resume role</Label>
              <Select
                id="resumeRole"
                value={values.resumeRole}
                onChange={(e) => update("resumeRole", e.target.value as ResumeRole)}
                className="max-w-xs"
              >
                {RESUME_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {RESUME_ROLE_LABELS[role]}
                  </option>
                ))}
              </Select>
              <p className="text-xs text-muted-foreground">
                {values.resumeRole === "MAIN"
                  ? "Your normal, default resume — what you'd typically submit to a job."
                  : "An optional, longer career-content library used as a reference when tailoring your Main Resume — not itself submitted to employers."}
              </p>
            </div>
          )}

          {mode === "create" && (
            <div className="space-y-1.5 md:col-span-2">
              <Label>Import from a file</Label>
              <ResumeUpload onExtracted={handleExtracted} />
            </div>
          )}

          {importedFrom && (
            <div className="flex items-start gap-2 rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-xs text-foreground md:col-span-2">
              <Info className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden="true" />
              <span>
                {values.contentFormat === "LATEX" ? (
                  <>
                    Loaded from <span className="font-medium">{importedFrom}</span> — your LaTeX source is
                    shown exactly as uploaded, unmodified. Review and edit below before saving.
                  </>
                ) : (
                  <>
                    Extracted from <span className="font-medium">{importedFrom}</span>. PDF/DOCX extraction
                    isn&apos;t always perfect — review and edit the text below before saving.
                  </>
                )}
              </span>
            </div>
          )}

          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="content">
              Content <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="content"
              placeholder={
                values.contentFormat === "LATEX"
                  ? "Paste your LaTeX resume source (e.g. resume.tex)…"
                  : "Paste your resume text…"
              }
              rows={16}
              maxLength={MAX_DOCUMENT_CONTENT_LENGTH}
              value={values.content}
              onChange={(e) => update("content", e.target.value)}
              className="font-mono text-xs"
            />
            <p className="text-xs text-muted-foreground">
              {values.content.trim().length.toLocaleString()}/{MAX_DOCUMENT_CONTENT_LENGTH.toLocaleString()}
            </p>
          </div>

          {latexPreview !== null && (
            <div className="space-y-1.5 md:col-span-2">
              <div className="flex items-center gap-1.5">
                <Label>Plain-text approximation</Label>
              </div>
              <div className="flex items-start gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                <span>
                  This strips common LaTeX commands so the text is readable — it is not a compiled
                  preview and won&apos;t reflect the actual PDF layout. Full LaTeX compilation isn&apos;t
                  available yet.
                </span>
              </div>
              <div className="max-h-64 overflow-y-auto rounded-md border border-border bg-background p-3 text-sm text-foreground">
                <p className="whitespace-pre-wrap">{latexPreview || "—"}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={submitting}>
          {submitting
            ? mode === "create"
              ? "Adding…"
              : "Saving…"
            : mode === "create"
              ? "Add Document"
              : "Save Changes"}
        </Button>
        <Button type="button" variant="outline" disabled={submitting} onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
