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
          scope: "user:email",
        },
      },
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        const account = await prisma.account.findFirst({
          where: { userId: user.id, provider: "github" },
        });
        if (account?.access_token) {
          (session as Record<string, unknown>).githubToken = account.access_token;
        }
      }
      return session;
    },
    async signIn({ user, account, profile }) {
      if (account?.provider === "github" && account.access_token) {
        try {
          const login = (profile as Record<string, string>)?.login || (user as any)?.login;
          await prisma.user.upsert({
            where: { id: user.id },
            update: {
              githubLogin: login || undefined,
              githubToken: account.access_token,
            },
            create: {
              id: user.id,
              githubLogin: login || null,
              githubToken: account.access_token,
            },
          });
        } catch {
          // Don't fail the signin — the account was already created by the adapter
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
