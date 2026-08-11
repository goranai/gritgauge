import { NextRequest, NextResponse } from "next/server";
import { reviewPR } from "@/lib/ai";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, prBody, filesChanged, additions, deletions } = body;

    if (!title) {
      return NextResponse.json({ error: "Missing 'title' field" }, { status: 400 });
    }

    const result = await reviewPR(
      title,
      prBody || null,
      filesChanged || 0,
      additions || 0,
      deletions || 0
    );

    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: `Review error: ${message}` }, { status: 500 });
  }
}
