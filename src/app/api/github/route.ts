import { NextRequest, NextResponse } from "next/server";
import { fetchRepoInfo, fetchOpenIssues, fetchOpenPRs, fetchContributors } from "@/lib/github";
import { parseRepoUrl } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const repo = searchParams.get("repo");

  if (!repo) {
    return NextResponse.json({ error: "Missing 'repo' parameter" }, { status: 400 });
  }

  const parsed = parseRepoUrl(repo);
  if (!parsed) {
    return NextResponse.json({ error: "Invalid repo format. Use 'owner/repo'" }, { status: 400 });
  }

  try {
    const [info, issues, prs, contributors] = await Promise.all([
      fetchRepoInfo(parsed.owner, parsed.name),
      fetchOpenIssues(parsed.owner, parsed.name),
      fetchOpenPRs(parsed.owner, parsed.name),
      fetchContributors(parsed.owner, parsed.name),
    ]);

    info.openPRs = prs.length;

    return NextResponse.json({
      repo: info,
      issues,
      pullRequests: prs,
      contributors,
      summary: {
        totalOpenIssues: issues.length,
        totalOpenPRs: prs.length,
        topContributors: contributors.slice(0, 5),
        hasStaleItems: issues.some(
          (i) =>
            Date.now() - new Date(i.updatedAt).getTime() > 30 * 86400000
        ),
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: `GitHub API error: ${message}` }, { status: 500 });
  }
}
