/**
 * Data Pipeline & Aggregation Engine
 * ETL-style data processing for transforming raw GitHub data into actionable insights.
 * Supports: aggregation, transformation, enrichment, batching, and streaming patterns.
 */
import prisma from "@/lib/prisma";
import { cache } from "@/services/cache";
import { log, LogLevel, recordMetric } from "@/services/monitoring";
import type { HealthMetrics, Issue, PullRequest, TriageResult, PRReviewResult } from "@/types";

// ─── Pipeline Types ───

export interface PipelineStage<I = unknown, O = unknown> {
  name: string;
  process: (input: I) => Promise<O> | O;
  onError?: "skip" | "stop" | "retry";
  maxRetries?: number;
}

export interface Pipeline<I = unknown, O = unknown> {
  id: string;
  name: string;
  stages: PipelineStage[];
  onComplete?: (result: O) => Promise<void>;
  onError?: (error: Error, stage: string) => Promise<void>;
}

export interface PipelineResult<O> {
  success: boolean;
  output?: O;
  error?: string;
  failedStage?: string;
  stageResults: { stage: string; success: boolean; durationMs: number; outputPreview?: unknown }[];
  totalDurationMs: number;
}

// ─── Pipeline Executor ───

export async function executePipeline<I, O>(
  pipeline: Pipeline<I, O>,
  input: I
): Promise<PipelineResult<O>> {
  const startTime = Date.now();
  const stageResults: PipelineResult<O>["stageResults"] = [];
  let currentData: unknown = input;

  for (const stage of pipeline.stages) {
    const stageStart = Date.now();
    let attempts = 0;
    const maxAttempts = stage.maxRetries || 1;

    while (attempts < maxAttempts) {
      try {
        currentData = await stage.process(currentData as never);
        stageResults.push({
          stage: stage.name,
          success: true,
          durationMs: Date.now() - stageStart,
          outputPreview: getPreview(currentData),
        });
        break;
      } catch (error) {
        attempts++;
        const err = error instanceof Error ? error : new Error(String(error));

        if (stage.onError === "stop" || (stage.onError === "retry" && attempts >= maxAttempts)) {
          await pipeline.onError?.(err, stage.name);
          return {
            success: false,
            error: err.message,
            failedStage: stage.name,
            stageResults,
            totalDurationMs: Date.now() - startTime,
          };
        }

        if (stage.onError === "skip") {
          stageResults.push({
            stage: stage.name,
            success: false,
            durationMs: Date.now() - stageStart,
            outputPreview: `Skipped: ${err.message}`,
          });
          break;
        }

        // Retry with backoff
        await new Promise((r) => setTimeout(r, Math.pow(2, attempts) * 500));
      }
    }
  }

  const result: PipelineResult<O> = {
    success: true,
    output: currentData as O,
    stageResults,
    totalDurationMs: Date.now() - startTime,
  };

  await pipeline.onComplete?.(currentData as O);
  return result;
}

// ─── Built-in Pipeline Stages ───

// Stage: Fetch raw repo data
export function fetchRepoDataStage(
  owner: string,
  name: string
): PipelineStage<void, { repo: { owner: string; name: string }; issues: Issue[]; prs: PullRequest[] }> {
  return {
    name: "fetch_repo_data",
    process: async () => {
      const { fetchRepoInfo, fetchOpenIssues, fetchOpenPRs } = await import("@/lib/github");
      const [repo, issues, prs] = await Promise.all([
        fetchRepoInfo(owner, name),
        fetchOpenIssues(owner, name, 100),
        fetchOpenPRs(owner, name, 50),
      ]);
      return { repo: { owner, name }, issues, prs };
    },
    onError: "stop",
  };
}

// Stage: AI Triage all issues
export function triageAllIssuesStage(): PipelineStage<
  { repo: { owner: string; name: string }; issues: Issue[]; prs: PullRequest[] },
  { repo: { owner: string; name: string }; issues: Issue[]; prs: PullRequest[]; triageResults: TriageResult[] }
> {
  return {
    name: "triage_all_issues",
    process: async (input) => {
      const { triageIssue } = await import("@/lib/ai");
      const results: TriageResult[] = [];

      for (const issue of input.issues.slice(0, 20)) {
        const result = await triageIssue(
          issue.title,
          issue.body,
          issue.labels
        );
        result.issueNumber = issue.number;
        results.push(result);
        await new Promise((r) => setTimeout(r, 200)); // Rate limit
      }

      return { ...input, triageResults: results };
    },
    onError: "skip",
    maxRetries: 2,
  };
}

// Stage: AI Review all PRs
export function reviewAllPRsStage(): PipelineStage<
  { repo: { owner: string; name: string }; issues: Issue[]; prs: PullRequest[]; triageResults?: TriageResult[] },
  { repo: { owner: string; name: string }; issues: Issue[]; prs: PullRequest[]; triageResults?: TriageResult[]; reviewResults: PRReviewResult[] }
> {
  return {
    name: "review_all_prs",
    process: async (input) => {
      const { reviewPR } = await import("@/lib/ai");
      const results: PRReviewResult[] = [];

      for (const pr of input.prs.slice(0, 10)) {
        const result = await reviewPR(
          pr.title,
          pr.body,
          pr.filesChanged,
          pr.additions,
          pr.deletions
        );
        result.prNumber = pr.number;
        results.push(result);
        await new Promise((r) => setTimeout(r, 200));
      }

      return { ...input, reviewResults: results };
    },
    onError: "skip",
  };
}

// Stage: Compute health metrics
export function computeMetricsStage(): PipelineStage<
  { repo: { owner: string; name: string }; issues: Issue[]; prs: PullRequest[] },
  { metrics: HealthMetrics; repoData: { owner: string; name: string } }
> {
  return {
    name: "compute_metrics",
    process: async (input) => {
      const { computeHealthMetrics } = await import("@/services/analytics");

      const metrics = await computeHealthMetrics(
        `${input.repo.owner}/${input.repo.name}`,
        input.repo.owner,
        input.repo.name
      );

      return { metrics, repoData: input.repo };
    },
    onError: "stop",
  };
}

// Stage: Save to database
export function saveResultsStage(): PipelineStage<
  { metrics: HealthMetrics; repoData: { owner: string; name: string }; triageResults?: TriageResult[]; reviewResults?: PRReviewResult[] },
  { saved: boolean; healthScore: number }
> {
  return {
    name: "save_results",
    process: async (input) => {
      const repo = await prisma.savedRepo.findFirst({
        where: { fullName: `${input.repoData.owner}/${input.repoData.name}` },
      });

      if (!repo) {
        log(LogLevel.WARN, "Repo not found for saving results");
        return { saved: false, healthScore: input.metrics.healthScore };
      }

      // Save health snapshot
      await prisma.healthSnapshot.create({
        data: {
          repoId: repo.id,
          healthScore: input.metrics.healthScore,
          busFactor: input.metrics.busFactor,
          responseTimeAvg: input.metrics.responseTimeAvg,
          staleIssueRatio: input.metrics.staleIssueRatio,
          prMergeTimeAvg: input.metrics.prMergeTimeAvg,
          contributorCount: input.metrics.contributorCount,
          commitFrequency: input.metrics.commitFrequency,
          openIssues: 0,
          openPRs: 0,
        },
      });

      // Save triage results
      if (input.triageResults) {
        for (const tr of input.triageResults) {
          await prisma.triageLog.create({
            data: {
              repoId: repo.id,
              issueNumber: tr.issueNumber,
              issueTitle: `Issue #${tr.issueNumber}`,
              priority: tr.priority,
              effort: tr.estimatedEffort,
              suggestedLabels: tr.suggestedLabels,
              summary: tr.summary,
              sentiment: tr.sentiment,
              isDuplicate: tr.isDuplicate,
              aiModel: "gpt-4o-mini",
              tokensUsed: 500,
            },
          });
        }
      }

      // Save review results
      if (input.reviewResults) {
        for (const rr of input.reviewResults) {
          await prisma.reviewLog.create({
            data: {
              repoId: repo.id,
              prNumber: rr.prNumber,
              prTitle: `PR #${rr.prNumber}`,
              riskLevel: rr.riskLevel,
              recommendation: rr.recommendation,
              keyChanges: rr.keyChanges,
              potentialIssues: rr.potentialIssues,
              aiModel: "gpt-4o-mini",
              tokensUsed: 500,
            },
          });
        }
      }

      recordMetric("pipeline.completed", 1, { repo: repo.fullName });

      return { saved: true, healthScore: input.metrics.healthScore };
    },
    onError: "retry",
    maxRetries: 3,
  };
}

// ─── Full Pipeline ───

export function createFullAnalysisPipeline(
  owner: string,
  name: string
): Pipeline<
  void,
  { saved: boolean; healthScore: number }
> {
  return {
    id: `pipeline_${owner}_${name}_${Date.now()}`,
    name: `Full Analysis: ${owner}/${name}`,
    stages: [
      fetchRepoDataStage(owner, name),
      triageAllIssuesStage(),
      reviewAllPRsStage(),
      computeMetricsStage(),
      saveResultsStage(),
    ],
    onComplete: async (result) => {
      log(LogLevel.INFO, `Pipeline complete for ${owner}/${name}`, {
        healthScore: result.healthScore,
      });
    },
    onError: async (error, stage) => {
      log(LogLevel.ERROR, `Pipeline failed at stage "${stage}"`, {
        error: error.message,
        repo: `${owner}/${name}`,
      });
    },
  };
}

// ─── Aggregation Pipeline ───

export interface AggregationConfig {
  groupBy: "repo" | "day" | "week" | "month" | "priority" | "riskLevel" | "sentiment";
  metrics: ("count" | "sum" | "avg" | "min" | "max" | "p50" | "p90" | "p95" | "p99")[];
  field?: string;
  dateRange?: { start: string; end: string };
  limit?: number;
}

export interface AggregationResult {
  buckets: { key: string; metrics: Record<string, number>; count: number }[];
  total: number;
  config: AggregationConfig;
}

export async function aggregateTriageData(
  userId: string,
  config: AggregationConfig
): Promise<AggregationResult> {
  const repos = await prisma.savedRepo.findMany({
    where: { userId },
    select: { id: true, fullName: true },
  });

  const repoIds = repos.map((r) => r.id);

  const where: Record<string, unknown> = {
    repoId: { in: repoIds },
  };

  if (config.dateRange) {
    where.createdAt = {
      gte: new Date(config.dateRange.start),
      lte: new Date(config.dateRange.end),
    };
  }

  const logs = await prisma.triageLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  return aggregateData(logs, config, repos);
}

function aggregateData(
  data: Record<string, unknown>[],
  config: AggregationConfig,
  repos: { id: string; fullName: string }[]
): AggregationResult {
  const buckets = new Map<string, { values: number[]; count: number }>();

  for (const item of data) {
    let key: string;

    switch (config.groupBy) {
      case "repo": {
        const repo = repos.find((r) => r.id === item.repoId);
        key = repo?.fullName || String(item.repoId || "unknown");
        break;
      }
      case "day":
        key = String(item.createdAt).slice(0, 10);
        break;
      case "week": {
        const d = new Date(String(item.createdAt));
        const weekStart = new Date(d.getFullYear(), d.getMonth(), d.getDate() - d.getDay());
        key = weekStart.toISOString().slice(0, 10);
        break;
      }
      case "month":
        key = String(item.createdAt).slice(0, 7);
        break;
      case "priority":
        key = String(item.priority || "unknown");
        break;
      case "sentiment":
        key = String(item.sentiment || "unknown");
        break;
      default:
        key = String(item[config.groupBy] || "unknown");
    }

    const existing = buckets.get(key) || { values: [], count: 0 };
    if (config.field && typeof item[config.field] === "number") {
      existing.values.push(item[config.field] as number);
    }
    existing.count++;
    buckets.set(key, existing);
  }

  const result = Array.from(buckets.entries())
    .map(([key, { values, count }]) => {
      const metrics: Record<string, number> = { count };
      if (values.length > 0) {
        const sorted = [...values].sort((a, b) => a - b);
        if (config.metrics.includes("avg")) metrics.avg = sorted.reduce((a, b) => a + b, 0) / sorted.length;
        if (config.metrics.includes("min")) metrics.min = sorted[0];
        if (config.metrics.includes("max")) metrics.max = sorted[sorted.length - 1];
        if (config.metrics.includes("p50")) metrics.p50 = sorted[Math.floor(sorted.length * 0.5)];
        if (config.metrics.includes("p90")) metrics.p90 = sorted[Math.floor(sorted.length * 0.9)];
        if (config.metrics.includes("p95")) metrics.p95 = sorted[Math.floor(sorted.length * 0.95)];
        if (config.metrics.includes("p99")) metrics.p99 = sorted[Math.floor(sorted.length * 0.99)];
        if (config.metrics.includes("sum")) metrics.sum = sorted.reduce((a, b) => a + b, 0);
      }
      return { key, metrics, count };
    })
    .sort((a, b) => b.count - a.count);

  if (config.limit) {
    return { buckets: result.slice(0, config.limit), total: data.length, config };
  }

  return { buckets: result, total: data.length, config };
}

// ─── Batch Processing ───

export async function batchProcessRepos(
  userId: string,
  batchSize: number = 5
): Promise<{ processed: number; failed: number; results: { repo: string; healthScore: number }[] }> {
  const repos = await prisma.savedRepo.findMany({
    where: { userId, isMonitored: true },
  });

  let processed = 0;
  let failed = 0;
  const results: { repo: string; healthScore: number }[] = [];

  for (let i = 0; i < repos.length; i += batchSize) {
    const batch = repos.slice(i, i + batchSize);
    const batchPromises = batch.map(async (repo) => {
      try {
        const pipeline = createFullAnalysisPipeline(repo.owner, repo.name);
        const result = await executePipeline(pipeline, undefined);
        if (result.success && result.output) {
          processed++;
          results.push({ repo: repo.fullName, healthScore: result.output.healthScore });
        } else {
          failed++;
        }
      } catch {
        failed++;
      }
    });

    await Promise.allSettled(batchPromises);
    // Delay between batches
    await new Promise((r) => setTimeout(r, 2000));
  }

  log(LogLevel.INFO, `Batch processing complete: ${processed} succeeded, ${failed} failed`);
  return { processed, failed, results };
}

// ─── Utility ───

function getPreview(data: unknown): unknown {
  if (Array.isArray(data)) return `Array(${data.length})`;
  if (data && typeof data === "object") {
    const keys = Object.keys(data as Record<string, unknown>);
    return `Object{${keys.slice(0, 5).join(", ")}${keys.length > 5 ? "..." : ""}}`;
  }
  return data;
}
