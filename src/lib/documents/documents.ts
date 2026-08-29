import { DocumentContentFormat, DocumentType, ResumeRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { MAX_DOCUMENT_CONTENT_LENGTH, MAX_TITLE_LENGTH } from "@/lib/documents/document-limits";
import { isValidObjectId } from "@/lib/object-id";
import {
  assertApplicationOwnership as assertApplicationOwnershipShared,
  NotFoundError as ApplicationNotFoundError,
} from "@/lib/applications/applications";

export { MAX_DOCUMENT_CONTENT_LENGTH, MAX_TITLE_LENGTH };

const DOCUMENT_TYPES = Object.values(DocumentType);
const CONTENT_FORMATS = Object.values(DocumentContentFormat);
const RESUME_ROLES = Object.values(ResumeRole);

export class ValidationError extends Error {
  issues: string[];

  constructor(issues: string[]) {
    super("Invalid document input");
    this.issues = issues;
  }
}

export class NotFoundError extends Error {
  constructor() {
    super("Document not found");
  }
}

type DocumentInput = {
  title: string;
  type: DocumentType;
  contentFormat: DocumentContentFormat;
  content: string;
  applicationId: string | null;
  resumeRole: ResumeRole | null;
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

// In partial mode, only fields present in `body` are checked/returned.
// Deliberately doesn't accept sourceDocumentId/masterDocumentId — those are
// set only by createTailoredResume, so a caller can't reparent a document
// onto an arbitrary (possibly not-owned) source.
function parseDocumentInput(
  body: unknown,
  { partial }: { partial: boolean },
): Partial<DocumentInput> {
  if (typeof body !== "object" || body === null) {
    throw new ValidationError(["Request body must be a JSON object"]);
  }

  const raw = body as Record<string, unknown>;
  const issues: string[] = [];
  const data: Partial<DocumentInput> = {};

  const hasField = (field: string) => !partial || field in raw;

  if (hasField("title")) {
    if (!isNonEmptyString(raw.title)) {
      issues.push("title is required and must be a non-empty string");
    } else if (raw.title.trim().length > MAX_TITLE_LENGTH) {
      issues.push(`title must be ${MAX_TITLE_LENGTH} characters or fewer`);
    } else {
      data.title = raw.title.trim();
    }
  }

  if (hasField("content")) {
    if (!isNonEmptyString(raw.content)) {
      issues.push("content is required and must be a non-empty string");
    } else if (raw.content.trim().length > MAX_DOCUMENT_CONTENT_LENGTH) {
      issues.push(`content must be ${MAX_DOCUMENT_CONTENT_LENGTH.toLocaleString()} characters or fewer`);
    } else {
      data.content = raw.content.trim();
    }
  }

  if (raw.type !== undefined) {
    if (!DOCUMENT_TYPES.includes(raw.type as DocumentType)) {
      issues.push(`type must be one of ${DOCUMENT_TYPES.join(", ")}`);
    } else {
      data.type = raw.type as DocumentType;
    }
  }

  if (raw.contentFormat !== undefined) {
    if (!CONTENT_FORMATS.includes(raw.contentFormat as DocumentContentFormat)) {
      issues.push(`contentFormat must be one of ${CONTENT_FORMATS.join(", ")}`);
    } else {
      data.contentFormat = raw.contentFormat as DocumentContentFormat;
    }
  }

  if (raw.resumeRole !== undefined) {
    if (raw.resumeRole === null) {
      data.resumeRole = null;
    } else if (!RESUME_ROLES.includes(raw.resumeRole as ResumeRole)) {
      issues.push(`resumeRole must be one of ${RESUME_ROLES.join(", ")} or null`);
    } else {
      data.resumeRole = raw.resumeRole as ResumeRole;
    }
  }

  if (raw.applicationId !== undefined) {
    if (raw.applicationId === null) {
      data.applicationId = null;
    } else if (!isValidObjectId(raw.applicationId)) {
      issues.push("applicationId must be a valid id or null");
    } else {
      data.applicationId = raw.applicationId;
    }
  }

  if (issues.length > 0) {
    throw new ValidationError(issues);
  }

  return data;
}

// Delegates to the shared ownership check in applications.ts and translates
// its NotFoundError into this module's own ("Document not found").
async function assertApplicationOwnership(userId: string, applicationId: string): Promise<void> {
  try {
    await assertApplicationOwnershipShared(userId, applicationId);
  } catch (error) {
    if (error instanceof ApplicationNotFoundError) throw new NotFoundError();
    throw error;
  }
}

/** resumeRole only makes sense for standalone RESUME documents — null it out otherwise. */
function normalizeResumeRole(type: DocumentType, resumeRole: ResumeRole | null | undefined): ResumeRole | null {
  if (type !== DocumentType.RESUME) return null;
  return resumeRole ?? null;
}

export async function createDocument(userId: string, body: unknown) {
  const input = parseDocumentInput(body, { partial: false }) as DocumentInput;

  if (input.applicationId != null) {
    await assertApplicationOwnership(userId, input.applicationId);
  }

  // `type` defaults to RESUME at the schema level when omitted — resolve it
  // here too so the resumeRole default below matches what gets stored.
  const resolvedType = input.type ?? DocumentType.RESUME;

  // New standalone resumes default to MAIN unless the user explicitly picks MASTER.
  const resumeRole =
    resolvedType === DocumentType.RESUME ? (input.resumeRole ?? ResumeRole.MAIN) : null;

  return prisma.document.create({
    data: {
      userId,
      title: input.title,
      type: input.type,
      contentFormat: input.contentFormat,
      resumeRole,
      content: input.content,
      applicationId: input.applicationId ?? null,
      // Explicitly written, not omitted — MongoDB only matches a `field: null`
      // query against a field actually stored as null, not one left unset.
      // Omitting this would break listResumeWorkspace's query for standalone resumes.
      sourceDocumentId: null,
      masterDocumentId: null,
    },
  });
}

export async function listDocuments(userId: string, filters: { type?: DocumentType } = {}) {
  return prisma.document.findMany({
    where: {
      userId,
      ...(filters.type ? { type: filters.type } : {}),
    },
    orderBy: { updatedAt: "desc" },
  });
}

/** Documents tagged to a given application — powers Application Detail's "Documents used for this application" section. Scoped to userId, not just applicationId, so a foreign id can't leak another user's document. */
export async function listDocumentsForApplication(userId: string, applicationId: string) {
  return prisma.document.findMany({
    where: { userId, applicationId },
    orderBy: { updatedAt: "desc" },
  });
}

// The user's standalone (non-tailored) resumes, grouped into Main and
// Master, each with its tailored versions eagerly loaded (avoids N+1s).
export async function listResumeWorkspace(userId: string) {
  const resumes = await prisma.document.findMany({
    where: { userId, type: DocumentType.RESUME, sourceDocumentId: null },
    include: {
      versions: {
        include: { application: { include: { company: true } } },
        orderBy: { updatedAt: "desc" },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return {
    main: resumes.filter((r) => r.resumeRole === ResumeRole.MAIN),
    master: resumes.filter((r) => r.resumeRole === ResumeRole.MASTER),
  };
}

/** Tailored versions derived from `sourceDocumentId` — ownership-checked on the source. */
export async function listResumeVersions(userId: string, sourceDocumentId: string) {
  const source = await prisma.document.findFirst({ where: { id: sourceDocumentId, userId } });
  if (!source) throw new NotFoundError();

  return prisma.document.findMany({
    where: { userId, sourceDocumentId },
    include: { application: { include: { company: true } } },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getDocument(userId: string, id: string) {
  const document = await prisma.document.findFirst({ where: { id, userId } });
  if (!document) throw new NotFoundError();
  return document;
}

/** Like getDocument, but also includes version count and source/master linkage for display. */
export async function getDocumentDetail(userId: string, id: string) {
  const document = await prisma.document.findFirst({
    where: { id, userId },
    include: {
      _count: { select: { versions: true } },
      sourceDocument: { select: { id: true, title: true, resumeRole: true } },
      masterDocument: { select: { id: true, title: true } },
      application: { include: { company: true } },
    },
  });
  if (!document) throw new NotFoundError();
  return document;
}

export async function updateDocument(userId: string, id: string, body: unknown) {
  const existing = await prisma.document.findFirst({ where: { id, userId } });
  if (!existing) throw new NotFoundError();

  const input = parseDocumentInput(body, { partial: true });

  if (input.applicationId != null) {
    await assertApplicationOwnership(userId, input.applicationId);
  }

  // Only touch resumeRole if this update actually mentions the role or the
  // type — otherwise leave it exactly as it was.
  let resumeRoleUpdate: ResumeRole | null | undefined;
  if ("resumeRole" in input || "type" in input) {
    const nextType = input.type ?? existing.type;
    const nextRole = "resumeRole" in input ? (input.resumeRole ?? null) : existing.resumeRole;
    resumeRoleUpdate = normalizeResumeRole(nextType, nextRole);
  }

  return prisma.document.update({
    where: { id },
    data: {
      title: input.title,
      type: input.type,
      contentFormat: input.contentFormat,
      content: input.content,
      ...(resumeRoleUpdate !== undefined ? { resumeRole: resumeRoleUpdate } : {}),
      ...("applicationId" in input ? { applicationId: input.applicationId } : {}),
    },
  });
}

export async function deleteDocument(userId: string, id: string) {
  const existing = await prisma.document.findFirst({ where: { id, userId } });
  if (!existing) throw new NotFoundError();
  await cascadeDeleteDocumentTree(id);
}

// Recursively deletes `id` and every tailored version derived from it,
// leaf-first. Prisma's MongoDB connector requires onDelete: NoAction on
// Document self-relations and blocks deleting a document still referenced
// as a source or master, so cascade/set-null have to be done manually here.
// sourceDocumentId chains can be more than one level deep, hence the recursion.
async function cascadeDeleteDocumentTree(id: string): Promise<void> {
  const children = await prisma.document.findMany({ where: { sourceDocumentId: id }, select: { id: true } });
  for (const child of children) {
    await cascadeDeleteDocumentTree(child.id);
  }
  await prisma.document.updateMany({ where: { masterDocumentId: id }, data: { masterDocumentId: null } });
  await prisma.document.delete({ where: { id } });
}

// Creates a new resume derived from `sourceDocumentId` — typically the Main
// Resume, but any standalone or already-tailored resume is allowed. Never
// modifies the source; tailoring always produces a separate row.
export async function createTailoredResume(
  userId: string,
  sourceDocumentId: string,
  body: unknown,
) {
  const source = await prisma.document.findFirst({ where: { id: sourceDocumentId, userId } });
  if (!source) throw new NotFoundError();
  if (source.type !== DocumentType.RESUME) {
    throw new ValidationError(["Only resume documents can have tailored versions."]);
  }

  if (typeof body !== "object" || body === null) {
    throw new ValidationError(["Request body must be a JSON object"]);
  }
  const raw = body as Record<string, unknown>;

  const issues: string[] = [];
  if (!isNonEmptyString(raw.title)) {
    issues.push("title is required and must be a non-empty string");
  } else if (raw.title.trim().length > MAX_TITLE_LENGTH) {
    issues.push(`title must be ${MAX_TITLE_LENGTH} characters or fewer`);
  }
  if (!isNonEmptyString(raw.content)) {
    issues.push("content is required and must be a non-empty string");
  } else if (raw.content.trim().length > MAX_DOCUMENT_CONTENT_LENGTH) {
    issues.push(`content must be ${MAX_DOCUMENT_CONTENT_LENGTH.toLocaleString()} characters or fewer`);
  }

  let applicationId: string | null = null;
  if (raw.applicationId !== undefined && raw.applicationId !== null) {
    if (!isValidObjectId(raw.applicationId)) {
      issues.push("applicationId must be a valid id or null");
    } else {
      applicationId = raw.applicationId;
    }
  }

  let masterDocumentId: string | null = null;
  if (raw.masterDocumentId !== undefined && raw.masterDocumentId !== null) {
    if (!isValidObjectId(raw.masterDocumentId)) {
      issues.push("masterDocumentId must be a valid id or null");
    } else {
      masterDocumentId = raw.masterDocumentId;
    }
  }

  if (issues.length > 0) {
    throw new ValidationError(issues);
  }

  if (applicationId != null) {
    await assertApplicationOwnership(userId, applicationId);
  }

  // Using the same document as both source and master is meaningless —
  // treat it as "no master" rather than erroring over a harmless input.
  if (masterDocumentId === sourceDocumentId) {
    masterDocumentId = null;
  }
  if (masterDocumentId != null) {
    const master = await prisma.document.findFirst({ where: { id: masterDocumentId, userId } });
    if (!master) throw new NotFoundError();
    if (master.type !== DocumentType.RESUME || master.resumeRole !== ResumeRole.MASTER) {
      throw new ValidationError(["masterDocumentId must reference a Master Resume."]);
    }
  }

  return prisma.document.create({
    data: {
      userId,
      title: (raw.title as string).trim(),
      type: DocumentType.RESUME,
      contentFormat: source.contentFormat,
      content: (raw.content as string).trim(),
      sourceDocumentId: source.id,
      masterDocumentId,
      applicationId,
    },
  });
}
