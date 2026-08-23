import NextAuth, { type DefaultSession } from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

declare module "next-auth" {
  interface User {
    avatarUrl?: string | null;
  }

  interface Session {
    // Note: `id` mirrors Auth.js's own `string` typing here, even though our
    // Prisma User.id column is an Int. Convert with `Number(session.user.id)`
    // wherever it's used to query the database.
    user: {
      id: string;
      avatarUrl?: string | null;
    } & DefaultSession["user"];
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
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
  ],
  callbacks: {
    session({ session, user }) {
      session.user.id = user.id;
      session.user.avatarUrl = user.avatarUrl;
      return session;
    },
  },
});
