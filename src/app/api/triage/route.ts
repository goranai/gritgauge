import { NextRequest, NextResponse } from "next/server";
import { triageIssue } from "@/lib/ai";
import { triageRequestSchema, checkRateLimit } from "@/lib/validation";
import prisma from "@/lib/prisma";
import { recordMetric } from "@/services/monitoring/index";

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  // Rate limiting
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anonymous";
  const { allowed, remaining } = checkRateLimit(`triage:${ip}`, 60, 60000);
  if (!allowed) {
    return NextResponse.json(
      { success: false, error: "Rate limit exceeded. Try again later." },
      { status: 429, headers: { "X-RateLimit-Remaining": String(remaining) } }
    );
  }

  try {
    const body = await request.json();

    // Validate input
    const parsed = triageRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Validation error", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { title, issueBody, existingLabels, model } = parsed.data;

    // Check feature access
    const { allowed: featureAllowed, current, limit } = await checkFeatureAccessForRequest(body.userId || "anonymous");
    if (!featureAllowed) {
      return NextResponse.json(
        { success: false, error: `Daily AI call limit reached (${current}/${limit})` },
        { status: 429 }
      );
    }

    const result = await triageIssue(title, issueBody || null, existingLabels || []);

    // Log to database
    const repoMatch = body.repo as string | undefined;
    if (repoMatch && body.userId) {
      const repo = await prisma.savedRepo.findFirst({
        where: { fullName: repoMatch, userId: body.userId as string },
      });

      if (repo) {
        await prisma.triageLog.create({
          data: {
            repoId: repo.id,
            issueNumber: body.issueNumber || 0,
            issueTitle: title,
            priority: result.priority,
            effort: result.estimatedEffort,
            suggestedLabels: result.suggestedLabels,
            summary: result.summary,
            sentiment: result.sentiment,
            isDuplicate: result.isDuplicate,
            aiModel: model || "gpt-4o-mini",
            tokensUsed: 500, // approximate
          },
        });
      }
    }

    // Record metrics
    recordMetric("ai.triage.request", 1, { model: model || "gpt-4o-mini" });
    recordMetric("ai.triage.latency", Date.now() - startTime);

    return NextResponse.json({
      success: true,
      data: result,
      meta: {
        tokensUsed: 500,
        processingTimeMs: Date.now() - startTime,
        remaining: remaining - 1,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    recordMetric("api.error", 1, { endpoint: "triage" });
    return NextResponse.json(
      { success: false, error: `Triage error: ${message}` },
      { status: 500 }
    );
  }
}

// Batch triage
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { issues, repo, userId } = body;

    if (!issues || !Array.isArray(issues) || issues.length === 0) {
      return NextResponse.json(
        { success: false, error: "Missing or empty 'issues' array" },
        { status: 400 }
      );
    }

    if (issues.length > 20) {
      return NextResponse.json(
        { success: false, error: "Maximum 20 issues per batch request" },
        { status: 400 }
      );
    }

    const results = [];
    let totalTokens = 0;

    for (const issue of issues) {
      const result = await triageIssue(
        issue.title || "Untitled",
        issue.body || null,
        issue.labels || []
      );
      result.issueNumber = issue.number || 0;
      results.push(result);
      totalTokens += 500;

      // Rate limit between batch items
      await new Promise((r) => setTimeout(r, 200));
    }

    // Summary
    const summary = {
      criticalCount: results.filter((r) => r.priority === "critical").length,
      highCount: results.filter((r) => r.priority === "high").length,
      mediumCount: results.filter((r) => r.priority === "medium").length,
      lowCount: results.filter((r) => r.priority === "low").length,
      duplicatesFound: results.filter((r) => r.isDuplicate).length,
      avgTokensPerIssue: Math.round(totalTokens / results.length),
    };

    return NextResponse.json({
      success: true,
      data: { triagedCount: results.length, results, summary },
      meta: { tokensUsed: totalTokens },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: `Batch triage error: ${message}` },
      { status: 500 }
    );
  }
}

// Helper
async function checkFeatureAccessForRequest(userId: string): Promise<{ allowed: boolean; current: number; limit: number }> {
  if (!userId || userId === "anonymous") return { allowed: true, current: 0, limit: Infinity };

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const count = await prisma.triageLog.count({
    where: {
      repo: { userId },
      createdAt: { gte: todayStart },
    },
  });

  const reviewCount = await prisma.reviewLog.count({
    where: {
      repo: { userId },
      createdAt: { gte: todayStart },
    },
  });

  const total = count + reviewCount;
  return { allowed: total < 100, current: total, limit: 100 };
}
