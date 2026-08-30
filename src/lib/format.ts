import type {
  ApplicationStatus,
  DocumentContentFormat,
  DocumentType,
  EmploymentType,
  LearningPathSource,
  LearningResourceType,
  Priority,
  ResumeRole,
  SkillLevel,
} from "@prisma/client";

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

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  RESUME: "Resume",
  COVER_LETTER: "Cover Letter",
  OTHER: "Other",
};

export const DOCUMENT_CONTENT_FORMAT_LABELS: Record<DocumentContentFormat, string> = {
  PLAIN: "Plain text",
  LATEX: "LaTeX source",
};

export const RESUME_ROLE_LABELS: Record<ResumeRole, string> = {
  MAIN: "Main Resume",
  MASTER: "Master Resume",
};

export const LEARNING_SOURCE_LABELS: Record<LearningPathSource, string> = {
  PERSONAL: "Personal",
  APPLICATION: "Application",
  RECOMMENDED: "Recommended",
};

export const SKILL_LEVEL_LABELS: Record<SkillLevel, string> = {
  NONE: "None",
  FAMILIAR: "Familiar",
  PROFICIENT: "Proficient",
};

export const LEARNING_RESOURCE_TYPE_LABELS: Record<LearningResourceType, string> = {
  VIDEO: "Video",
  PLAYLIST: "Playlist",
  DOCUMENTATION: "Documentation",
  ARTICLE: "Article",
  COURSE: "Course",
  GITHUB: "GitHub",
  OTHER: "Other",
};

export function formatDate(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export function formatDateTime(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toLocaleString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
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
