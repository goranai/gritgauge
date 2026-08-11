import { NextRequest, NextResponse } from "next/server";
import { generateInsights } from "@/lib/ai";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { repoName, stars, forks, openIssues, openPRs, contributorCount, language, issues, prs } = body;
    
    if (!repoName) {
      return NextResponse.json({ success: false, error: "Missing repoName" }, { status: 400 });
    }

    const result = await generateInsights(
      repoName, stars || 0, forks || 0, openIssues || 0, openPRs || 0,
      contributorCount || 0, language || "", issues || [], prs || []
    );
    
    return NextResponse.json({ success: true, data: result });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || "Failed" }, { status: 500 });
  }
}
