import { NextRequest, NextResponse } from "next/server";
import { detectDuplicateIssues } from "@/lib/ai";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { issues } = body;
    if (!issues || !Array.isArray(issues) || issues.length < 2) {
      return NextResponse.json({ success: false, error: "Need at least 2 issues" }, { status: 400 });
    }
    const result = await detectDuplicateIssues(issues);
    return NextResponse.json({ success: true, data: result });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || "Dedup failed" }, { status: 500 });
  }
}
