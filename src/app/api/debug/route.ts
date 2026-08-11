import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    hasGithubId: !!process.env.GITHUB_ID,
    hasGithubSecret: !!process.env.GITHUB_SECRET,
    githubIdPrefix: process.env.GITHUB_ID ? process.env.GITHUB_ID.substring(0, 6) + "..." : "MISSING",
    nodeEnv: process.env.NODE_ENV,
    vercelEnv: process.env.VERCEL_ENV,
  });
}
