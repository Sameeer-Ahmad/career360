import type { ApplicationStatus, EmploymentType, Priority, ResumeRole } from "@prisma/client";

export type BadgeVariant = "neutral" | "primary" | "success" | "warning" | "destructive" | "info";

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  WISHLIST: "Wishlist",
  APPLIED: "Applied",
  SCREENING: "Screening",
  INTERVIEW: "Interview",
  OFFER: "Offer",
  ACCEPTED: "Accepted",
  REJECTED: "Rejected",
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
};

export const EMPLOYMENT_TYPE_LABELS: Record<EmploymentType, string> = {
  FULL_TIME: "Full-time",
  PART_TIME: "Part-time",
  CONTRACT: "Contract",
  INTERNSHIP: "Internship",
  FREELANCE: "Freelance",
};

export const RESUME_ROLE_LABELS: Record<ResumeRole, string> = {
  MAIN: "Main Resume",
  MASTER: "Master Resume",
};

export function formatDate(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

/** Salaries are tracked in rupees only — no per-application currency choice. */
export function formatSalaryRange(min: number | null | undefined, max: number | null | undefined): string {
  if (min == null && max == null) return "—";
  const fmt = (n: number) => `₹${n.toLocaleString("en-US")}`;
  if (min != null && max != null) return `${fmt(min)} – ${fmt(max)}`;
  if (min != null) return `${fmt(min)}+`;
  return `Up to ${fmt(max!)}`;
}

/** Formats a Date (or null) into the yyyy-MM-dd shape <input type="date"> expects. */
export function toDateInputValue(value: Date | string | null | undefined): string {
  if (!value) return "";
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toISOString().slice(0, 10);
}
