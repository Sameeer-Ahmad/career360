import { cache } from "react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  hasPassword: boolean;
};

/**
 * The canonical source for the signed-in user's display info in Server
 * Components. `session.user` (from the JWT) only carries `name`/`email`/
 * `avatarUrl` as a snapshot taken at sign-in — they don't change when the
 * user later edits their profile, since JWT sessions aren't re-verified
 * against the database per request. This does a live lookup by the JWT's
 * (stable) user id instead, so every Server Component using it reflects
 * the latest saved profile without requiring a new sign-in.
 *
 * `cache()`'d so a layout and the page it wraps share one query per request
 * instead of each fetching the same row independently.
 */
export const getCurrentUser = cache(async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await auth();
  if (!session?.user) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, avatarUrl: true, password: true },
  });
  if (!user) return null;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    avatarUrl: user.avatarUrl,
    hasPassword: user.password !== null,
  };
});
