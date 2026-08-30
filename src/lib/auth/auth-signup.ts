// NextAuth's Credentials provider only verifies existing accounts — this
// handles registration for email+password accounts, separate from Google sign-in.
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth/password";

export class ValidationError extends Error {
  issues: string[];
  constructor(issues: string[]) {
    super("Invalid signup input");
    this.issues = issues;
  }
}

export class EmailInUseError extends Error {
  constructor() {
    super("An account with this email already exists.");
  }
}

const MIN_PASSWORD_LENGTH = 8;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export type SignupInput = {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
};

function parseSignupInput(body: unknown): SignupInput {
  if (typeof body !== "object" || body === null) {
    throw new ValidationError(["Request body must be a JSON object"]);
  }
  const raw = body as Record<string, unknown>;
  const issues: string[] = [];

  if (!isNonEmptyString(raw.name)) issues.push("Name is required.");
  if (!isNonEmptyString(raw.email) || !EMAIL_PATTERN.test(raw.email.trim())) {
    issues.push("Enter a valid email address.");
  }
  if (!isNonEmptyString(raw.password) || raw.password.length < MIN_PASSWORD_LENGTH) {
    issues.push(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
  }
  if (raw.password !== raw.confirmPassword) {
    issues.push("Passwords do not match.");
  }

  if (issues.length > 0) throw new ValidationError(issues);

  return {
    name: (raw.name as string).trim(),
    email: (raw.email as string).trim().toLowerCase(),
    password: raw.password as string,
    confirmPassword: raw.confirmPassword as string,
  };
}

/** Creates a new email/password Career360 account. Throws EmailInUseError if the email is already registered — whether by another password account or a Google account, since email is the shared unique key either way. */
export async function createAccountWithPassword(body: unknown) {
  const input = parseSignupInput(body);

  const existing = await prisma.user.findUnique({ where: { email: input.email }, select: { id: true } });
  if (existing) throw new EmailInUseError();

  const passwordHash = await hashPassword(input.password);
  const user = await prisma.user.create({
    data: { name: input.name, email: input.email, password: passwordHash },
    select: { id: true, name: true, email: true },
  });
  return user;
}
