import { prisma } from "@/lib/prisma";
import { assertApplicationOwnership } from "@/lib/applications/applications";
import { isStale } from "@/lib/learning/learning-resources";
import {
  asPriority,
  asSkillLevel,
  asString,
  NotFoundError,
  ValidationError,
  type LearningPathSource,
  type LearningPriority,
  type SaveLearningPathInput,
  type SkillLevel,
} from "@/lib/learning/learning";

const LEARNING_PATH_INCLUDE = {
  topics: { orderBy: { order: "asc" as const }, include: { progress: true } },
  application: { include: { company: true } },
} as const;

export type ProgressSummary = { completed: number; total: number; percentage: number };

/** completed / total * 100, computed on read — IN_PROGRESS does not count toward the numerator. Never persisted. */
function computeProgressSummary(topics: { progress: { status: string } | null }[]): ProgressSummary {
  const total = topics.length;
  const completed = topics.filter((t) => t.progress?.status === "COMPLETED").length;
  const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);
  return { completed, total, percentage };
}

/**
 * Explicitly deletes every dependent collection for a set of LearningTopic
 * ids, in the correct order (children of children first), before the
 * topics themselves are deleted by the caller. Never relies on the
 * schema's declared onDelete: Cascade actually firing at runtime — same
 * defensive convention already used throughout this file and for
 * Document's self-relations. Shared by deleteLearningPath and
 * replaceExistingRecommendedPath so both paths clean up LearningResource,
 * LearningNote, and LearningProgress identically; a no-op for an empty
 * topicIds array.
 */
async function deleteTopicsAndDependents(topicIds: string[]): Promise<void> {
  if (topicIds.length === 0) return;
  await prisma.learningNote.deleteMany({ where: { learningTopicId: { in: topicIds } } });
  await prisma.learningProgress.deleteMany({ where: { learningTopicId: { in: topicIds } } });
  await prisma.learningResource.deleteMany({ where: { learningTopicId: { in: topicIds } } });
  await prisma.learningTopic.deleteMany({ where: { id: { in: topicIds } } });
}

/**
 * Saves a validated learning path (personal or AI-generated-and-reviewed).
 * Ownership of `applicationId` (if given) is verified before anything is
 * written. When source is RECOMMENDED and an applicationId is given, any
 * existing RECOMMENDED path for that same application is replaced — its
 * topics deleted, then the path itself — before the new one is created.
 * APPLICATION and PERSONAL paths are never replaced this way.
 */
export async function createLearningPath(userId: string, input: SaveLearningPathInput) {
  // Deliberately NOT translated into this module's own NotFoundError — the
  // caller needs to be able to tell "no such application" (this) apart
  // from "no such learning path" (thrown elsewhere in this file), so
  // applications.ts's NotFoundError propagates as-is.
  if (input.applicationId) {
    await assertApplicationOwnership(userId, input.applicationId);
  }

  if (input.source === "RECOMMENDED" && input.applicationId) {
    await replaceExistingRecommendedPath(userId, input.applicationId);
  }

  const path = await prisma.learningPath.create({
    data: {
      userId,
      source: input.source,
      applicationId: input.applicationId ?? null,
      title: input.title,
      summary: input.summary ?? null,
    },
  });

  await prisma.learningTopic.createMany({
    data: input.topics.map((topic, index) => ({
      learningPathId: path.id,
      topic: topic.topic,
      reason: topic.reason ?? "",
      priority: topic.priority ?? "MEDIUM",
      currentLevel: topic.currentLevel ?? null,
      recommendedLevel: topic.recommendedLevel ?? null,
      prerequisites: topic.prerequisites ?? [],
      order: index,
    })),
  });

  return getLearningPathDetail(userId, path.id);
}

/**
 * Deletes any existing RECOMMENDED path for this user+application — its
 * topics and every dependent (resources, notes, progress) first, then the
 * path itself — so the new RECOMMENDED path always starts completely
 * clean. Never touches APPLICATION or PERSONAL paths.
 */
async function replaceExistingRecommendedPath(userId: string, applicationId: string): Promise<void> {
  const existing = await prisma.learningPath.findFirst({
    where: { userId, applicationId, source: "RECOMMENDED" },
    select: { id: true, topics: { select: { id: true } } },
  });
  if (!existing) return;

  await deleteTopicsAndDependents(existing.topics.map((t) => t.id));
  await prisma.learningPath.delete({ where: { id: existing.id } });
}

export type LearningPathListFilters = {
  source?: LearningPathSource;
  applicationId?: string;
};

export async function listLearningPaths(userId: string, filters: LearningPathListFilters = {}) {
  return prisma.learningPath.findMany({
    where: {
      userId,
      ...(filters.source ? { source: filters.source } : {}),
      ...(filters.applicationId ? { applicationId: filters.applicationId } : {}),
    },
    include: {
      _count: { select: { topics: true } },
      application: { include: { company: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
}

/**
 * Ownership-checked — throws NotFoundError for both "doesn't exist" and
 * "belongs to someone else." Includes each topic's progress (cheap, always
 * relevant the instant a path is opened) and a computed progressSummary —
 * notes are deliberately NOT included here, they're lazy-loaded per-topic
 * only when that topic's Notes section is opened (see /api/learning/topics/[id]/notes).
 */
export async function getLearningPathDetail(userId: string, id: string) {
  const path = await prisma.learningPath.findFirst({
    where: { id, userId },
    include: LEARNING_PATH_INCLUDE,
  });
  if (!path) throw new NotFoundError();
  return { ...path, progressSummary: computeProgressSummary(path.topics) };
}

export async function deleteLearningPath(userId: string, id: string): Promise<void> {
  const existing = await prisma.learningPath.findFirst({
    where: { id, userId },
    select: { id: true, topics: { select: { id: true } } },
  });
  if (!existing) throw new NotFoundError();

  await deleteTopicsAndDependents(existing.topics.map((t) => t.id));
  await prisma.learningPath.delete({ where: { id } });
}

// ---------------------------------------------------------------------------
// Manual (Personal) topic addition — the only way a topic set is ever
// mutated outside of AI generation/replacement. Never calls AI.
// ---------------------------------------------------------------------------

/** Thrown when trying to add a topic to a non-PERSONAL path — RECOMMENDED/APPLICATION paths get their entire topic set exclusively from generation/replacement, never from manual addition. */
export class NotPersonalPathError extends Error {
  constructor() {
    super("Only Personal learning paths support adding topics directly.");
  }
}

export type AddPersonalTopicInput = {
  topic: string;
  reason: string | null;
  priority: LearningPriority;
  currentLevel: SkillLevel | null;
  recommendedLevel: SkillLevel | null;
};

function validateAddPersonalTopicInput(body: unknown): AddPersonalTopicInput {
  if (typeof body !== "object" || body === null) {
    throw new ValidationError(["Request body must be a JSON object"]);
  }
  const raw = body as Record<string, unknown>;
  const issues: string[] = [];

  const topic = asString(raw.topic).trim();
  if (!topic) issues.push("topic is required and must be a non-empty string");

  if (issues.length > 0) throw new ValidationError(issues);

  return {
    topic,
    reason: asString(raw.reason).trim() || null,
    priority: asPriority(raw.priority),
    currentLevel: asSkillLevel(raw.currentLevel),
    recommendedLevel: asSkillLevel(raw.recommendedLevel),
  };
}

/**
 * Adds a single manually-entered topic to an existing PERSONAL path the
 * user owns, appended after the path's current topics. Throws
 * NotFoundError if the path doesn't exist/isn't owned, NotPersonalPathError
 * if it exists but isn't a PERSONAL path. No AI call — topic/goal/
 * priority/levels are exactly what the caller provides, with the same
 * PERSONAL defaults (reason -> "Added by you.", priority -> MEDIUM) that
 * validateSaveInput already applies for personal paths created at once.
 */
export async function addPersonalTopic(userId: string, pathId: string, body: unknown) {
  const path = await prisma.learningPath.findFirst({
    where: { id: pathId, userId },
    select: { id: true, source: true, _count: { select: { topics: true } } },
  });
  if (!path) throw new NotFoundError();
  if (path.source !== "PERSONAL") throw new NotPersonalPathError();

  const input = validateAddPersonalTopicInput(body);

  return prisma.learningTopic.create({
    data: {
      learningPathId: path.id,
      topic: input.topic,
      reason: input.reason ?? "Added by you.",
      priority: input.priority,
      currentLevel: input.currentLevel,
      recommendedLevel: input.recommendedLevel,
      prerequisites: [],
      order: path._count.topics,
    },
  });
}

// ---------------------------------------------------------------------------
// Path-level aggregation — Resources and Notes across every topic in a
// path, in one query each (not one request per topic). Read-only: all
// mutations still go through the existing per-topic endpoints
// (/api/learning/topics/[id]/resources, /notes); these just power the
// Learning Path workspace's Resources/Notes/Overview views without forcing
// the client to fetch per-topic. Never calls YouTube — reads whatever is
// already cached, exactly like the per-topic resources GET.
// ---------------------------------------------------------------------------

/**
 * Ownership-checked. Returns every topic's resources, grouped by topic,
 * with the same fetchedAt/stale freshness computation the per-topic
 * endpoint uses (discovered — non-USER_ADDED — rows only; a user-added
 * resource never affects freshness). One Prisma query (topics + their
 * resources, batched — not N+1).
 */
export async function getPathResources(userId: string, pathId: string) {
  const path = await prisma.learningPath.findFirst({
    where: { id: pathId, userId },
    select: {
      id: true,
      topics: {
        orderBy: { order: "asc" },
        select: { id: true, topic: true, resources: { orderBy: { relevanceScore: "desc" } } },
      },
    },
  });
  if (!path) throw new NotFoundError();

  return path.topics.map((t) => {
    const discovered = t.resources.filter((r) => r.discoveryMethod !== "USER_ADDED");
    const fetchedAt = discovered.length
      ? discovered.reduce((max, r) => (r.createdAt > max ? r.createdAt : max), discovered[0].createdAt)
      : null;
    return {
      topicId: t.id,
      topicName: t.topic,
      fetchedAt,
      stale: isStale(fetchedAt),
      resources: t.resources,
    };
  });
}

/**
 * Ownership-checked. Returns only topics that actually have a note
 * (empty/never-written notes are excluded, not returned as empty
 * strings) — one Prisma query, not one per topic. The per-topic note
 * *editing* UI still uses the existing single-topic GET/PUT endpoints and
 * its own lazy-load — this is a separate, read-only aggregate solely for
 * the Learning Path workspace's Notes view.
 */
export async function getPathNotes(userId: string, pathId: string) {
  const path = await prisma.learningPath.findFirst({
    where: { id: pathId, userId },
    select: {
      id: true,
      topics: {
        orderBy: { order: "asc" },
        select: { id: true, topic: true, note: { select: { content: true, updatedAt: true } } },
      },
    },
  });
  if (!path) throw new NotFoundError();

  return path.topics
    .filter((t) => t.note !== null)
    .map((t) => ({ topicId: t.id, topicName: t.topic, content: t.note!.content, updatedAt: t.note!.updatedAt }));
}
