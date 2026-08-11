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
    async jwt({ token, account, profile }) {
      // Store the access token in the JWT on first sign-in
      if (account?.provider === "github" && account.access_token) {
        token.githubToken = account.access_token;
        token.githubLogin = (profile as any)?.login;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub || "";
        (session as any).githubToken = token.githubToken;
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
          // Don't fail the signin
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
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
  secret: process.env.NEXTAUTH_SECRET,
};
