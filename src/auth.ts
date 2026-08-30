import NextAuth, { type DefaultSession } from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth/password";

declare module "next-auth" {
  interface User {
    avatarUrl?: string | null;
  }

  interface Session {
    // `id` is a MongoDB ObjectId string end to end — Prisma's User.id column
    // is natively String @db.ObjectId, so this needs no conversion anywhere
    // it's used to query the database (unlike the old MySQL Int id).
    user: {
      id: string;
      avatarUrl?: string | null;
    } & DefaultSession["user"];
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  // Auth.js's Credentials provider only supports JWT sessions (it has no
  // server-side verification step for the adapter's database-session
  // strategy to hook into) — required as soon as Credentials exists
  // alongside Google, not optional. The adapter is still used for
  // Google's own user/account persistence; only where the *session itself*
  // lives changes (signed cookie instead of the Session table).
  session: { strategy: "jwt" },
  providers: [
    Google({
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          avatarUrl: profile.picture,
        };
      },
    }),
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email;
        const password = credentials?.password;
        if (typeof email !== "string" || typeof password !== "string") return null;

        const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
        // No password on file means this account was created via Google —
        // never let a credentials attempt succeed against it.
        if (!user?.password) return null;

        const valid = await verifyPassword(password, user.password);
        if (!valid) return null;

        return { id: user.id, name: user.name, email: user.email, avatarUrl: user.avatarUrl };
      },
    }),
  ],
  callbacks: {
    // JWT strategy: the token is only populated from `user` on the initial
    // sign-in call; every later call only has the token itself, so the
    // fields the session needs must be copied onto it here once.
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.avatarUrl = user.avatarUrl ?? null;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id as string;
      session.user.avatarUrl = (token.avatarUrl as string | null) ?? null;
      return session;
    },
  },
});
