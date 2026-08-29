import {
  ApplicationStatus,
  EmploymentType,
  Priority,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { APPLICATION_SORTS, type ApplicationSort } from "@/lib/applications/application-sort";
import { extractShortId } from "@/lib/applications/application-slug";
import { isValidObjectId } from "@/lib/object-id";

export { APPLICATION_SORTS, type ApplicationSort };

const APPLICATION_STATUSES = Object.values(ApplicationStatus);
const EMPLOYMENT_TYPES = Object.values(EmploymentType);
const PRIORITIES = Object.values(Priority);

export class ValidationError extends Error {
  issues: string[];

  constructor(issues: string[]) {
    super("Invalid application input");
    this.issues = issues;
  }
}

export class NotFoundError extends Error {
  constructor() {
    super("Application not found");
  }
}

type ApplicationInput = {
  companyName: string;
  companyWebsite?: string | null;
  companyLocation?: string | null;
  jobTitle: string;
  jobUrl?: string | null;
  location?: string | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
  salaryCurrency?: string | null;
  employmentType?: EmploymentType | null;
  appliedAt?: Date | null;
  status?: ApplicationStatus;
  jobDescription?: string | null;
  priority?: Priority | null;
  interviewAt?: Date | null;
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function isNullableNumber(value: unknown): value is number | null {
  return value === null || (typeof value === "number" && Number.isFinite(value));
}

/** Parses and validates application input. In partial mode, only the fields present in `body` are checked/returned. */
function parseApplicationInput(
  body: unknown,
  { partial }: { partial: boolean },
): Partial<ApplicationInput> {
  if (typeof body !== "object" || body === null) {
    throw new ValidationError(["Request body must be a JSON object"]);
  }

  const raw = body as Record<string, unknown>;
  const issues: string[] = [];
  const data: Partial<ApplicationInput> = {};

  const hasField = (field: string) => !partial || field in raw;

  if (hasField("companyName")) {
    if (!isNonEmptyString(raw.companyName)) {
      issues.push("companyName is required and must be a non-empty string");
    } else {
      data.companyName = raw.companyName.trim();
    }
  }

  if (hasField("jobTitle")) {
    if (!isNonEmptyString(raw.jobTitle)) {
      issues.push("jobTitle is required and must be a non-empty string");
    } else {
      data.jobTitle = raw.jobTitle.trim();
    }
  }

  for (const field of [
    "companyWebsite",
    "companyLocation",
    "jobUrl",
    "location",
    "jobDescription",
    "salaryCurrency",
  ] as const) {
    if (raw[field] !== undefined) {
      if (!isNullableString(raw[field])) {
        issues.push(`${field} must be a string or null`);
      } else {
        data[field] = raw[field];
      }
    }
  }

  for (const field of ["salaryMin", "salaryMax"] as const) {
    if (raw[field] !== undefined) {
      if (!isNullableNumber(raw[field])) {
        issues.push(`${field} must be a number or null`);
      } else {
        data[field] = raw[field];
      }
    }
  }

  if (
    typeof data.salaryMin === "number" &&
    typeof data.salaryMax === "number" &&
    data.salaryMin > data.salaryMax
  ) {
    issues.push("salaryMin must not be greater than salaryMax");
  }

  if (raw.status !== undefined) {
    if (!APPLICATION_STATUSES.includes(raw.status as ApplicationStatus)) {
      issues.push(`status must be one of ${APPLICATION_STATUSES.join(", ")}`);
    } else {
      data.status = raw.status as ApplicationStatus;
    }
  }

  if (raw.employmentType !== undefined) {
    if (
      raw.employmentType !== null &&
      !EMPLOYMENT_TYPES.includes(raw.employmentType as EmploymentType)
    ) {
      issues.push(`employmentType must be one of ${EMPLOYMENT_TYPES.join(", ")} or null`);
    } else {
      data.employmentType = raw.employmentType as EmploymentType | null;
    }
  }

  if (raw.priority !== undefined) {
    if (raw.priority !== null && !PRIORITIES.includes(raw.priority as Priority)) {
      issues.push(`priority must be one of ${PRIORITIES.join(", ")} or null`);
    } else {
      data.priority = raw.priority as Priority | null;
    }
  }

  if (raw.appliedAt !== undefined) {
    if (raw.appliedAt === null) {
      data.appliedAt = null;
    } else if (typeof raw.appliedAt !== "string" || Number.isNaN(Date.parse(raw.appliedAt))) {
      issues.push("appliedAt must be an ISO date string or null");
    } else {
      data.appliedAt = new Date(raw.appliedAt);
    }
  }

  if (raw.interviewAt !== undefined) {
    if (raw.interviewAt === null) {
      data.interviewAt = null;
    } else if (typeof raw.interviewAt !== "string" || Number.isNaN(Date.parse(raw.interviewAt))) {
      issues.push("interviewAt must be an ISO date-time string or null");
    } else {
      data.interviewAt = new Date(raw.interviewAt);
    }
  }

  if (issues.length > 0) {
    throw new ValidationError(issues);
  }

  return data;
}

/** Reuses an existing Company by name (case-insensitive, per the DB's collation) or creates one. */
async function resolveCompany(input: {
  companyName: string;
  companyWebsite?: string | null;
  companyLocation?: string | null;
}) {
  const name = input.companyName.trim();
  // MongoDB string equality is case-sensitive by default, unlike MySQL's collation —
  // without mode: "insensitive" this would create a new Company for "Acme" vs "acme".
  const existing = await prisma.company.findFirst({ where: { name: { equals: name, mode: "insensitive" } } });
  if (existing) return existing;

  return prisma.company.create({
    data: {
      name,
      website: input.companyWebsite ?? null,
      location: input.companyLocation ?? null,
    },
  });
}

export async function createApplication(userId: string, body: unknown) {
  const input = parseApplicationInput(body, { partial: false }) as ApplicationInput;
  const company = await resolveCompany(input);

  return prisma.application.create({
    data: {
      userId,
      companyId: company.id,
      jobTitle: input.jobTitle,
      jobUrl: input.jobUrl ?? null,
      location: input.location ?? null,
      salaryMin: input.salaryMin ?? null,
      salaryMax: input.salaryMax ?? null,
      salaryCurrency: input.salaryCurrency ?? null,
      employmentType: input.employmentType ?? null,
      appliedAt: input.appliedAt ?? null,
      status: input.status,
      jobDescription: input.jobDescription ?? null,
      priority: input.priority ?? null,
      interviewAt: input.interviewAt ?? null,
    },
    include: { company: true },
  });
}

export type ApplicationListFilters = {
  q?: string;
  status?: ApplicationStatus;
  priority?: Priority;
  employmentType?: EmploymentType;
  sort?: ApplicationSort;
};

/** Lenient — invalid/unrecognized values are dropped rather than rejected, since this reads from URL search params. */
export function parseApplicationListQuery(
  raw: Record<string, string | string[] | undefined>,
): ApplicationListFilters {
  const get = (key: string): string | undefined => {
    const value = raw[key];
    return Array.isArray(value) ? value[0] : value;
  };

  const q = get("q")?.trim();
  const status = get("status");
  const priority = get("priority");
  const employmentType = get("employmentType");
  const sort = get("sort");

  return {
    q: q || undefined,
    status: status && APPLICATION_STATUSES.includes(status as ApplicationStatus)
      ? (status as ApplicationStatus)
      : undefined,
    priority: priority && PRIORITIES.includes(priority as Priority)
      ? (priority as Priority)
      : undefined,
    employmentType: employmentType && EMPLOYMENT_TYPES.includes(employmentType as EmploymentType)
      ? (employmentType as EmploymentType)
      : undefined,
    sort: sort && (APPLICATION_SORTS as readonly string[]).includes(sort)
      ? (sort as ApplicationSort)
      : undefined,
  };
}

function resolveOrderBy(sort?: ApplicationSort) {
  switch (sort) {
    case "appliedAsc":
      return { appliedAt: "asc" as const };
    case "titleAsc":
      return { jobTitle: "asc" as const };
    case "titleZa":
      return { jobTitle: "desc" as const };
    case "companyAsc":
      return { company: { name: "asc" as const } };
    case "priority":
      // Enum declaration order is LOW, MEDIUM, HIGH — descending puts HIGH first.
      return { priority: "desc" as const };
    case "updatedDesc":
      return { updatedAt: "desc" as const };
    case "appliedDesc":
      return { appliedAt: "desc" as const };
    default:
      return { createdAt: "desc" as const };
  }
}

export async function listApplications(userId: string, filters: ApplicationListFilters = {}) {
  return prisma.application.findMany({
    where: {
      userId,
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.priority ? { priority: filters.priority } : {}),
      ...(filters.employmentType ? { employmentType: filters.employmentType } : {}),
      // mode: "insensitive" preserves the same case-insensitive search
      // behavior MySQL's default collation gave this for free.
      ...(filters.q
        ? {
            OR: [
              { jobTitle: { contains: filters.q, mode: "insensitive" } },
              { company: { name: { contains: filters.q, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    include: { company: true },
    orderBy: resolveOrderBy(filters.sort),
  });
}

/** Cheap existence check — distinguishes "no applications at all" from "no results for the current filters". */
export async function hasApplications(userId: string): Promise<boolean> {
  const existing = await prisma.application.findFirst({ where: { userId }, select: { id: true } });
  return existing !== null;
}

export async function getApplication(userId: string, id: string) {
  const application = await prisma.application.findFirst({
    where: { id, userId },
    include: { company: true },
  });
  if (!application) throw new NotFoundError();
  return application;
}

/**
 * Resolves a route param that may be a raw ObjectId or a slug (see application-slug.ts)
 * into the real id, scoped to the requesting user so it can never resolve to — or leak
 * the existence of — another user's application.
 */
export async function resolveApplicationId(userId: string, idOrSlug: string): Promise<string> {
  if (isValidObjectId(idOrSlug)) return idOrSlug;

  const shortId = extractShortId(idOrSlug);
  if (!shortId) throw new NotFoundError();

  const candidates = await prisma.application.findMany({ where: { userId }, select: { id: true } });
  const match = candidates.find((c) => c.id.toLowerCase().endsWith(shortId));
  if (!match) throw new NotFoundError();
  return match.id;
}

/**
 * Verifies the given application belongs to the user without fetching the full row —
 * throws NotFoundError for both "doesn't exist" and "belongs to someone else".
 */
export async function assertApplicationOwnership(userId: string, applicationId: string): Promise<void> {
  const application = await prisma.application.findFirst({
    where: { id: applicationId, userId },
    select: { id: true },
  });
  if (!application) throw new NotFoundError();
}

export async function updateApplication(userId: string, id: string, body: unknown) {
  const existing = await prisma.application.findFirst({ where: { id, userId } });
  if (!existing) throw new NotFoundError();

  const input = parseApplicationInput(body, { partial: true });

  let companyId: string | undefined;
  if (input.companyName !== undefined) {
    const company = await resolveCompany({
      companyName: input.companyName,
      companyWebsite: input.companyWebsite,
      companyLocation: input.companyLocation,
    });
    companyId = company.id;
  }

  return prisma.application.update({
    where: { id },
    data: {
      companyId,
      jobTitle: input.jobTitle,
      jobUrl: input.jobUrl,
      location: input.location,
      salaryMin: input.salaryMin,
      salaryMax: input.salaryMax,
      salaryCurrency: input.salaryCurrency,
      employmentType: input.employmentType,
      appliedAt: input.appliedAt,
      status: input.status,
      jobDescription: input.jobDescription,
      priority: input.priority,
      interviewAt: input.interviewAt,
    },
    include: { company: true },
  });
}

export async function deleteApplication(userId: string, id: string) {
  const existing = await prisma.application.findFirst({ where: { id, userId } });
  if (!existing) throw new NotFoundError();

  // Explicit SetNull safety net — MongoDB's Prisma connector emulates
  // Document.application's onDelete: SetNull, but this doesn't rely on that alone.
  await prisma.document.updateMany({ where: { applicationId: id }, data: { applicationId: null } });
  await prisma.application.delete({ where: { id } });
}
