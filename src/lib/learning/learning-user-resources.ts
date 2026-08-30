import { randomUUID } from "node:crypto";
import { LearningResourceType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getOwnedTopic, ValidationError } from "@/lib/learning/learning-resources";

/** Thrown when editing/deleting a resource that exists and belongs to the user, but isn't USER_ADDED — not an ownership problem (so not NotFoundError), just a capability the resource doesn't have. Safe to surface as-is since it never leaks another user's data. */
export class NotEditableError extends Error {
  constructor() {
    super("Only resources you added yourself can be edited or deleted.");
  }
}

/** Thrown when the topic itself is owned and valid, but no resource with the given id exists under it — distinct from NotFoundError (which means the topic itself is missing/not-yours) so routes can report an accurate, still-non-leaking message either way. */
export class ResourceNotFoundError extends Error {
  constructor() {
    super("Resource not found");
  }
}

export const LEARNING_RESOURCE_TYPES = Object.values(LearningResourceType);

const MAX_TITLE_LENGTH = 200;
const MAX_DESCRIPTION_LENGTH = 2000;

/** http(s)-only, well-formed URL — rejects javascript:, data:, and anything malformed. The URL is only ever stored and opened externally, never fetched server-side. */
export function isSafeResourceUrl(value: unknown): value is string {
  if (typeof value !== "string" || !value.trim()) return false;
  let parsed: URL;
  try {
    parsed = new URL(value.trim());
  } catch {
    return false;
  }
  return parsed.protocol === "http:" || parsed.protocol === "https:";
}

export type UserResourceInput = { title: string; url: string; type: LearningResourceType; description: string | null };

/** Never trusts the client — every field is independently validated regardless of what the request claims. */
export function validateUserResourceInput(body: unknown): UserResourceInput {
  if (typeof body !== "object" || body === null) {
    throw new ValidationError(["Request body must be a JSON object"]);
  }
  const raw = body as Record<string, unknown>;
  const issues: string[] = [];

  const title = typeof raw.title === "string" ? raw.title.trim() : "";
  if (!title) issues.push("title is required");
  if (title.length > MAX_TITLE_LENGTH) issues.push(`title must be ${MAX_TITLE_LENGTH} characters or fewer`);

  if (!isSafeResourceUrl(raw.url)) {
    issues.push("url must be a valid http:// or https:// URL");
  }

  if (!(LEARNING_RESOURCE_TYPES as readonly string[]).includes(raw.type as string)) {
    issues.push(`type must be one of ${LEARNING_RESOURCE_TYPES.join(", ")}`);
  }

  let description: string | null = null;
  if (raw.description !== undefined && raw.description !== null) {
    if (typeof raw.description !== "string") {
      issues.push("description must be a string or null");
    } else if (raw.description.length > MAX_DESCRIPTION_LENGTH) {
      issues.push(`description must be ${MAX_DESCRIPTION_LENGTH} characters or fewer`);
    } else {
      description = raw.description.trim() || null;
    }
  }

  if (issues.length > 0) throw new ValidationError(issues);

  return { title, url: (raw.url as string).trim(), type: raw.type as LearningResourceType, description };
}

/** Ownership-checked. Creates a USER_ADDED resource — the URL is stored as given and opened externally; no provider is ever called for it. */
export async function createUserResource(userId: string, topicId: string, body: unknown) {
  await getOwnedTopic(userId, topicId);
  const input = validateUserResourceInput(body);

  return prisma.learningResource.create({
    data: {
      learningTopicId: topicId,
      type: input.type,
      provider: "USER_LINK",
      discoveryMethod: "USER_ADDED",
      title: input.title,
      whyRecommended: "",
      description: input.description,
      url: input.url,
      providerResourceId: randomUUID(),
      isOfficial: false,
      relevanceScore: 1,
    },
  });
}

/**
 * Ownership-checked at both the topic and the resource level. Throws
 * NotFoundError if the topic itself doesn't exist/isn't owned,
 * ResourceNotFoundError if the topic is fine but no such resource exists
 * under it, and NotEditableError if the resource exists and is the user's
 * own topic's, but isn't USER_ADDED (a curated YOUTUBE/OFFICIAL_DOCS row
 * can never be mutated this way).
 */
async function getOwnedUserResource(userId: string, topicId: string, resourceId: string) {
  await getOwnedTopic(userId, topicId);
  const resource = await prisma.learningResource.findFirst({ where: { id: resourceId, learningTopicId: topicId } });
  if (!resource) throw new ResourceNotFoundError();
  if (resource.discoveryMethod !== "USER_ADDED") throw new NotEditableError();
  return resource;
}

export async function updateUserResource(userId: string, topicId: string, resourceId: string, body: unknown) {
  await getOwnedUserResource(userId, topicId, resourceId);
  const input = validateUserResourceInput(body);

  return prisma.learningResource.update({
    where: { id: resourceId },
    data: { title: input.title, url: input.url, type: input.type, description: input.description },
  });
}

export async function deleteUserResource(userId: string, topicId: string, resourceId: string): Promise<void> {
  await getOwnedUserResource(userId, topicId, resourceId);
  await prisma.learningResource.delete({ where: { id: resourceId } });
}
