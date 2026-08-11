import type { NextAuthOptions } from "next-auth";
import GithubProvider from "next-auth/providers/github";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import prisma from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as NextAuthOptions["adapter"],
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_ID || "",
      clientSecret: process.env.GITHUB_SECRET || "",
      authorization: {
        params: {
          scope: "read:user user:email",
        },
      },
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        // Add github token if available
        const account = await prisma.account.findFirst({
          where: { userId: user.id, provider: "github" },
        });
        if (account?.access_token) {
          (session as Record<string, unknown>).githubToken = account.access_token;
        }
      }
      return session;
    },
    async signIn({ user, account }) {
      if (account?.provider === "github") {
        // Store GitHub token
        if (account.access_token && user.id) {
          await prisma.user.update({
            where: { id: user.id },
            data: {
              githubLogin: (user as Record<string, string>).login || undefined,
              githubToken: account.access_token,
            },
          });
        }
      }
      return true;
    },
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  session: {
    strategy: "database" as const,
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
};
