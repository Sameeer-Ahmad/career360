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

/** Deletes every dependent row (notes, progress, resources) for a set of topic ids before the caller deletes the topics themselves — Mongo doesn't enforce onDelete: Cascade, so this must be explicit. No-op for an empty array. */
async function deleteTopicsAndDependents(topicIds: string[]): Promise<void> {
  if (topicIds.length === 0) return;
  await prisma.learningNote.deleteMany({ where: { learningTopicId: { in: topicIds } } });
  await prisma.learningProgress.deleteMany({ where: { learningTopicId: { in: topicIds } } });
  await prisma.learningResource.deleteMany({ where: { learningTopicId: { in: topicIds } } });
  await prisma.learningTopic.deleteMany({ where: { id: { in: topicIds } } });
}

/** Verifies `applicationId` ownership before writing. If source is RECOMMENDED, replaces any existing RECOMMENDED path for that application first — APPLICATION and PERSONAL paths are never replaced this way. */
export async function createLearningPath(userId: string, input: SaveLearningPathInput) {
  // Propagates applications.ts's NotFoundError as-is so callers can tell "no such application" apart from "no such learning path".
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

/** Deletes any existing RECOMMENDED path for this user+application (and its dependents) so a regenerated path starts clean. Never touches APPLICATION or PERSONAL paths. */
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

/** Ownership-checked. Includes each topic's progress and a computed progressSummary; notes are lazy-loaded per-topic instead (see /api/learning/topics/[id]/notes). */
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

/** Adds a manually-entered topic to an existing PERSONAL path the user owns, appended after its current topics. Throws NotFoundError (not found/owned) or NotPersonalPathError (not a PERSONAL path). No AI call. */
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
// Path-level aggregation — Resources/Notes across every topic, one query
// each. Read-only; mutations go through the per-topic endpoints. Never calls YouTube.
// ---------------------------------------------------------------------------

/** Ownership-checked. Returns every topic's resources grouped by topic, with the same fetchedAt/stale computation as the per-topic endpoint (one batched query, not N+1). */
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

/** Ownership-checked. Returns only topics that actually have a note, in one query. Editing still goes through the per-topic GET/PUT endpoints — this is read-only aggregation for the workspace's Notes view. */
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
