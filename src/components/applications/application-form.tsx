"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { ApplicationStatus, EmploymentType, Priority } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { STATUS_LABELS, PRIORITY_LABELS } from "@/components/ui/badge";
import { EMPLOYMENT_TYPE_LABELS, toDateInputValue } from "@/lib/format";
import { AlertCircle } from "lucide-react";

const STATUSES = Object.keys(STATUS_LABELS) as ApplicationStatus[];
const PRIORITIES = Object.keys(PRIORITY_LABELS) as Priority[];
const EMPLOYMENT_TYPES = Object.keys(EMPLOYMENT_TYPE_LABELS) as EmploymentType[];

type FormValues = {
  companyName: string;
  jobTitle: string;
  jobUrl: string;
  location: string;
  salaryMin: string;
  salaryMax: string;
  employmentType: EmploymentType | "";
  appliedAt: string;
  status: ApplicationStatus;
  priority: Priority | "";
  jobDescription: string;
};

export type ApplicationFormInitialValues = {
  companyName: string;
  jobTitle: string;
  jobUrl?: string | null;
  location?: string | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
  employmentType?: EmploymentType | null;
  appliedAt?: Date | string | null;
  status: ApplicationStatus;
  priority?: Priority | null;
  jobDescription?: string | null;
};

function toFormValues(initial?: ApplicationFormInitialValues): FormValues {
  return {
    companyName: initial?.companyName ?? "",
    jobTitle: initial?.jobTitle ?? "",
    jobUrl: initial?.jobUrl ?? "",
    location: initial?.location ?? "",
    salaryMin: initial?.salaryMin != null ? String(initial.salaryMin) : "",
    salaryMax: initial?.salaryMax != null ? String(initial.salaryMax) : "",
    employmentType: initial?.employmentType ?? "",
    appliedAt: toDateInputValue(initial?.appliedAt),
    status: initial?.status ?? "WISHLIST",
    priority: initial?.priority ?? "",
    jobDescription: initial?.jobDescription ?? "",
  };
}

function validate(values: FormValues): string[] {
  const issues: string[] = [];
  if (!values.companyName.trim()) issues.push("Company is required.");
  if (!values.jobTitle.trim()) issues.push("Job title is required.");

  const min = values.salaryMin.trim() ? Number(values.salaryMin) : undefined;
  const max = values.salaryMax.trim() ? Number(values.salaryMax) : undefined;
  if (values.salaryMin.trim() && Number.isNaN(min)) issues.push("Salary minimum must be a number.");
  if (values.salaryMax.trim() && Number.isNaN(max)) issues.push("Salary maximum must be a number.");
  if (
    min !== undefined &&
    max !== undefined &&
    !Number.isNaN(min) &&
    !Number.isNaN(max) &&
    min > max
  ) {
    issues.push("Salary minimum cannot be greater than salary maximum.");
  }

  return issues;
}

function toRequestBody(values: FormValues) {
  return {
    companyName: values.companyName.trim(),
    jobTitle: values.jobTitle.trim(),
    jobUrl: values.jobUrl.trim() || null,
    location: values.location.trim() || null,
    salaryMin: values.salaryMin.trim() ? Number(values.salaryMin) : null,
    salaryMax: values.salaryMax.trim() ? Number(values.salaryMax) : null,
    // Rupee-only product decision — no per-application currency choice in the UI.
    salaryCurrency: "INR",
    employmentType: values.employmentType || null,
    appliedAt: values.appliedAt ? new Date(values.appliedAt).toISOString() : null,
    status: values.status,
    priority: values.priority || null,
    jobDescription: values.jobDescription.trim() || null,
  };
}

export function ApplicationForm({
  mode,
  applicationId,
  initialValues,
}: {
  mode: "create" | "edit";
  applicationId?: number;
  initialValues?: ApplicationFormInitialValues;
}) {
  const router = useRouter();
  const [values, setValues] = useState<FormValues>(() => toFormValues(initialValues));
  const [issues, setIssues] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  function update<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
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
      const url = mode === "create" ? "/api/applications" : `/api/applications/${applicationId}`;
      const method = mode === "create" ? "POST" : "PATCH";
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toRequestBody(values)),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setIssues(
          body?.issues && Array.isArray(body.issues)
            ? body.issues
            : [body?.error ?? "Something went wrong. Please try again."],
        );
        setSubmitting(false);
        return;
      }

      const application = await response.json();
      router.push(`/applications/${application.id}`);
      router.refresh();
    } catch {
      setIssues(["Network error — please check your connection and try again."]);
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
            <Label htmlFor="companyName">
              Company <span className="text-destructive">*</span>
            </Label>
            <Input
              id="companyName"
              placeholder="Acme Corp"
              required
              value={values.companyName}
              onChange={(e) => update("companyName", e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="jobTitle">
              Job title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="jobTitle"
              placeholder="Senior Frontend Engineer"
              required
              value={values.jobTitle}
              onChange={(e) => update("jobTitle", e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="jobUrl">Job URL</Label>
            <Input
              id="jobUrl"
              type="url"
              placeholder="https://company.com/careers/role"
              value={values.jobUrl}
              onChange={(e) => update("jobUrl", e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              placeholder="Remote, or City, Country"
              value={values.location}
              onChange={(e) => update("location", e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="salaryMin">Salary minimum (₹)</Label>
            <Input
              id="salaryMin"
              type="number"
              inputMode="numeric"
              placeholder="90000"
              value={values.salaryMin}
              onChange={(e) => update("salaryMin", e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="salaryMax">Salary maximum (₹)</Label>
            <Input
              id="salaryMax"
              type="number"
              inputMode="numeric"
              placeholder="120000"
              value={values.salaryMax}
              onChange={(e) => update("salaryMax", e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="employmentType">Employment type</Label>
            <Select
              id="employmentType"
              value={values.employmentType}
              onChange={(e) => update("employmentType", e.target.value as EmploymentType | "")}
            >
              <option value="">Not specified</option>
              {EMPLOYMENT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {EMPLOYMENT_TYPE_LABELS[type]}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="appliedAt">Applied date</Label>
            <Input
              id="appliedAt"
              type="date"
              value={values.appliedAt}
              onChange={(e) => update("appliedAt", e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="status">Status</Label>
            <Select
              id="status"
              value={values.status}
              onChange={(e) => update("status", e.target.value as ApplicationStatus)}
            >
              {STATUSES.map((status) => (
                <option key={status} value={status}>
                  {STATUS_LABELS[status]}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="priority">Priority</Label>
            <Select
              id="priority"
              value={values.priority}
              onChange={(e) => update("priority", e.target.value as Priority | "")}
            >
              <option value="">Not set</option>
              {PRIORITIES.map((priority) => (
                <option key={priority} value={priority}>
                  {PRIORITY_LABELS[priority]}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="jobDescription">Job description</Label>
            <Textarea
              id="jobDescription"
              placeholder="Paste the job description…"
              rows={6}
              value={values.jobDescription}
              onChange={(e) => update("jobDescription", e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={submitting}>
          {submitting
            ? mode === "create"
              ? "Adding…"
              : "Saving…"
            : mode === "create"
              ? "Add Application"
              : "Save Changes"}
        </Button>
        <Button type="button" variant="outline" disabled={submitting} onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
