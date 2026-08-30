import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/auth/password";

export class ValidationError extends Error {
  issues: string[];
  constructor(issues: string[]) {
    super("Invalid input");
    this.issues = issues;
  }
}

export class GoogleAccountPasswordError extends Error {
  constructor() {
    super("This account signs in with Google and has no password to change.");
  }
}

export class IncorrectPasswordError extends Error {
  constructor() {
    super("Current password is incorrect.");
  }
}

const MIN_PASSWORD_LENGTH = 8;
const MAX_NAME_LENGTH = 100;

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export async function updateProfile(userId: string, body: unknown) {
  if (typeof body !== "object" || body === null) {
    throw new ValidationError(["Request body must be a JSON object"]);
  }
  const raw = body as Record<string, unknown>;

  if (!isNonEmptyString(raw.name)) {
    throw new ValidationError(["Name is required."]);
  }
  const name = raw.name.trim();
  if (name.length > MAX_NAME_LENGTH) {
    throw new ValidationError([`Name must be ${MAX_NAME_LENGTH} characters or fewer.`]);
  }

  return prisma.user.update({
    where: { id: userId },
    data: { name },
    select: { id: true, name: true, email: true, avatarUrl: true },
  });
}

export async function changePassword(userId: string, body: unknown) {
  if (typeof body !== "object" || body === null) {
    throw new ValidationError(["Request body must be a JSON object"]);
  }
  const raw = body as Record<string, unknown>;
  const issues: string[] = [];

  if (!isNonEmptyString(raw.currentPassword)) issues.push("Current password is required.");
  if (!isNonEmptyString(raw.newPassword) || raw.newPassword.length < MIN_PASSWORD_LENGTH) {
    issues.push(`New password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
  }
  if (raw.newPassword !== raw.confirmNewPassword) {
    issues.push("New passwords do not match.");
  }
  if (issues.length > 0) throw new ValidationError(issues);

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { password: true } });
  if (!user?.password) throw new GoogleAccountPasswordError();

  const currentPassword = raw.currentPassword as string;
  const valid = await verifyPassword(currentPassword, user.password);
  if (!valid) throw new IncorrectPasswordError();

  const passwordHash = await hashPassword(raw.newPassword as string);
  await prisma.user.update({ where: { id: userId }, data: { password: passwordHash } });
}

/**
 * Deletes the account and everything it owns. Relies on the schema's own
 * `onDelete: Cascade` declarations (Account, Session, Application,
 * Document, LearningPath → LearningTopic → progress/notes/resources,
 * GoogleCalendarConnection) — Prisma's MongoDB connector emulates these in
 * a transaction, so one call here removes the full graph. Company rows are
 * untouched: they're shared, not user-owned, and Application's own
 * relation to Company is Restrict, not Cascade.
 */
export async function deleteAccount(userId: string): Promise<void> {
  await prisma.user.delete({ where: { id: userId } });
}
