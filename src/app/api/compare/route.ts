import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { compareRepos } from "@/services/analytics";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const repoIds = searchParams.getAll("repoId");

  if (repoIds.length < 2) {
    return NextResponse.json(
      { success: false, error: "At least 2 repo IDs required" },
      { status: 400 }
    );
  }

  try {
    const results = await compareRepos(repoIds);

    // Get star counts
    const repos = await prisma.savedRepo.findMany({
      where: { id: { in: repoIds } },
    });

    const withStars = results.map((r) => {
      const repo = repos.find((repo) => repo.fullName === r.fullName);
      return {
        ...r,
        stars: repo?.stars || 0,
        forks: repo?.forks || 0,
        openIssues: repo?.openIssues || 0,
      };
    });

    const comparison = {
      repos: withStars,
      comparison: {
        mostPopular: withStars.sort((a, b) => b.stars - a.stars)[0]?.fullName || "",
        healthiest: withStars.sort((a, b) => b.healthScore - a.healthScore)[0]?.fullName || "",
        mostActive: withStars.sort((a, b) => b.busFactor - a.busFactor)[0]?.fullName || "",
        bestResponseTime: withStars.sort((a, b) => a.responseTime - b.responseTime)[0]?.fullName || "",
      },
    };

    return NextResponse.json({ success: true, data: comparison });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
