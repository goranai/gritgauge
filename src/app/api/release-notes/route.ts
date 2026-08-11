import { NextRequest, NextResponse } from "next/server";
import { generateReleaseNotes } from "@/lib/ai";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { repo, version, prs } = body;
    if (!repo || !prs || !Array.isArray(prs)) {
      return NextResponse.json({ success: false, error: "Need repo, version, and prs array" }, { status: 400 });
    }
    const notes = await generateReleaseNotes(repo, version || "1.0.0", prs);
    return NextResponse.json({ success: true, data: notes });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || "Failed" }, { status: 500 });
  }
}
