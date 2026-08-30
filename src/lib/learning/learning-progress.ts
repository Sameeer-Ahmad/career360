import type { ProgressStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/** Thrown for both "no such LearningTopic" and "belongs to someone else" — existence is never leaked, matching every other ownership check in this codebase. */
export class NotFoundError extends Error {
  constructor() {
    super("Learning topic not found");
  }
}

export class ValidationError extends Error {
  constructor() {
    super("Invalid progress status");
  }
}

export const PROGRESS_STATUSES: readonly ProgressStatus[] = ["NOT_STARTED", "IN_PROGRESS", "COMPLETED"];

async function assertTopicOwnership(userId: string, topicId: string): Promise<void> {
  const topic = await prisma.learningTopic.findFirst({
    where: { id: topicId, learningPath: { userId } },
    select: { id: true },
  });
  if (!topic) throw new NotFoundError();
}

export type LearningProgressData = { status: ProgressStatus; completedAt: Date | null };

const DEFAULT_PROGRESS: LearningProgressData = { status: "NOT_STARTED", completedAt: null };

/** Ownership-checked. No row means NOT_STARTED/null — a valid default state, never an error. */
export async function getProgress(userId: string, topicId: string): Promise<LearningProgressData> {
  await assertTopicOwnership(userId, topicId);
  const progress = await prisma.learningProgress.findUnique({
    where: { learningTopicId: topicId },
    select: { status: true, completedAt: true },
  });
  return progress ?? DEFAULT_PROGRESS;
}

/**
 * Ownership-checked upsert. Transitions are unrestricted — any status can
 * be set directly from any other, matching this codebase's existing
 * ApplicationStatus convention (no transition-guarding logic anywhere).
 * completedAt is set to now() only when entering COMPLETED, and cleared
 * whenever leaving COMPLETED. Setting NOT_STARTED deletes the row
 * entirely, returning to the implicit default rather than persisting a
 * redundant explicit-default row (mirrors LearningResource/LearningNote's
 * "absence is a valid state" convention).
 */
export async function setProgress(userId: string, topicId: string, status: ProgressStatus): Promise<LearningProgressData> {
  if (!PROGRESS_STATUSES.includes(status)) {
    throw new ValidationError();
  }
  await assertTopicOwnership(userId, topicId);

  if (status === "NOT_STARTED") {
    await prisma.learningProgress.deleteMany({ where: { learningTopicId: topicId } });
    return DEFAULT_PROGRESS;
  }

  const current = await prisma.learningProgress.findUnique({
    where: { learningTopicId: topicId },
    select: { status: true, completedAt: true },
  });

  // completedAt only changes on an actual transition into/out of COMPLETED
  // — re-setting the same status (a redundant click) is a no-op for it.
  let completedAt: Date | null;
  if (current?.status === status) {
    completedAt = current.completedAt;
  } else {
    completedAt = status === "COMPLETED" ? new Date() : null;
  }

  return prisma.learningProgress.upsert({
    where: { learningTopicId: topicId },
    create: { learningTopicId: topicId, status, completedAt },
    update: { status, completedAt },
    select: { status: true, completedAt: true },
  });
}
