import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { computeHealthMetrics, saveHealthSnapshot } from "@/services/analytics";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const repoId = searchParams.get("repoId");

  if (!repoId) {
    return NextResponse.json({ success: false, error: "Missing repoId" }, { status: 400 });
  }

  try {
    const metrics = await computeHealthMetrics(repoId, "", "");
    await saveHealthSnapshot(repoId);

    return NextResponse.json({ success: true, data: metrics });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
