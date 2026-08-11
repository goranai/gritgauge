import { NextResponse } from "next/server";
import { triageIssue } from "@/lib/ai";

export async function GET() {
  try {
    const result = await triageIssue("Test bug", "Test body", ["bug"]);
    return NextResponse.json({ success: true, result });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || "unknown", stack: err?.stack?.substring(0, 500) });
  }
}
