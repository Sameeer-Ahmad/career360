import { prisma } from "@/lib/prisma";

/** Thrown for both "no such LearningTopic" and "belongs to someone else" — existence is never leaked, matching every other ownership check in this codebase. */
export class NotFoundError extends Error {
  constructor() {
    super("Learning topic not found");
  }
}

/**
 * Verifies the LearningTopic → LearningPath → userId ownership chain.
 * Throws NotFoundError for both "doesn't exist" and "belongs to someone
 * else" — the same check learning-resources.ts's getOwnedTopic performs,
 * duplicated locally rather than imported since this module has no other
 * reason to depend on the resources module.
 */
async function assertTopicOwnership(userId: string, topicId: string): Promise<void> {
  const topic = await prisma.learningTopic.findFirst({
    where: { id: topicId, learningPath: { userId } },
    select: { id: true },
  });
  if (!topic) throw new NotFoundError();
}

export type LearningNoteData = { content: string; updatedAt: Date };

/** Ownership-checked. Returns null when no note has been saved yet — a valid state, not an error. */
export async function getNote(userId: string, topicId: string): Promise<LearningNoteData | null> {
  await assertTopicOwnership(userId, topicId);
  const note = await prisma.learningNote.findUnique({
    where: { learningTopicId: topicId },
    select: { content: true, updatedAt: true },
  });
  return note;
}

/**
 * Ownership-checked upsert. Whitespace-only or empty content deletes the
 * underlying row instead of persisting an empty string — "no note" and
 * "cleared note" are the same state, so getNote's null response
 * unambiguously means "nothing to show." Returns the saved note, or null
 * when the content was empty and the row was deleted (or never existed).
 */
export async function saveNote(userId: string, topicId: string, content: string): Promise<LearningNoteData | null> {
  await assertTopicOwnership(userId, topicId);

  const trimmed = content.trim();
  if (!trimmed) {
    await prisma.learningNote.deleteMany({ where: { learningTopicId: topicId } });
    return null;
  }

  return prisma.learningNote.upsert({
    where: { learningTopicId: topicId },
    create: { learningTopicId: topicId, content },
    update: { content },
    select: { content: true, updatedAt: true },
  });
}
