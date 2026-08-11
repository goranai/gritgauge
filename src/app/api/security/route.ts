import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { scanPRForVulnerabilities, scanDependencies, fullSecurityAudit } from "@/services/security";
import { securityScanSchema } from "@/lib/validation";
import prisma from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = securityScanSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { repo, scanType, targetRef } = parsed.data;
    const [owner, name] = repo.split("/");

    let result;

    switch (scanType) {
      case "pr":
        result = await scanPRForVulnerabilities(
          targetRef || "Unknown PR",
          null,
          0,
          ""
        );
        break;
      case "dependency":
        result = await scanDependencies([]);
        break;
      case "full":
      default:
        result = await fullSecurityAudit(repo, "Full codebase scan", [], []);
    }

    // Save scan result (non-critical - don't fail if repo not saved)
    try {
      await prisma.securityScan.create({
        data: {
          repoId: repo,
          scanType,
          targetRef: targetRef || null,
          vulnerabilities: result.vulnerabilities || [],
          riskScore: result.riskScore || 0,
          summary: result.summary || "Scan completed",
        },
      });
    } catch { /* repo not saved yet */ }

    return NextResponse.json({
      success: true,
      data: { ...result, scanId: scan.id },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
