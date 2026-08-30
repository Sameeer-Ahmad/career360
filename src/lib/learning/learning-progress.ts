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

/** Ownership-checked upsert. Transitions are unrestricted (matches ApplicationStatus's convention). completedAt is set on entering COMPLETED and cleared on leaving it. Setting NOT_STARTED deletes the row rather than persisting a redundant default. */
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

  // completedAt only changes on an actual transition into/out of COMPLETED — a redundant re-click is a no-op.
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
