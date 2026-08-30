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
    // Matches Prisma's User.id, which is natively String @db.ObjectId.
    user: {
      id: string;
      avatarUrl?: string | null;
    } & DefaultSession["user"];
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  // Credentials provider only supports JWT sessions, so this applies globally.
  // The adapter still handles Google's own user/account persistence.
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
    // `user` is only present on the initial sign-in call, so copy what the session needs onto the token here.
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
