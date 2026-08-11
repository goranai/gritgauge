/**
 * Benchmarking Service
 * Compare repository metrics against industry standards and similar projects
 */
import type { HealthMetrics } from "@/types";

// ─── Industry Benchmarks ───

export interface BenchmarkCategory {
  name: string;
  metrics: {
    avgHealthScore: number;
    avgBusFactor: number;
    avgResponseTime: number;
    avgStaleRatio: number;
    avgContributorCount: number;
    avgCommitFrequency: number;
    avgStars: number;
    avgPRMergeTime: number;
  };
  sampleSize: number;
}

// Based on analysis of top 10,000 GitHub repos (simulated benchmarks)
export const BENCHMARKS: Record<string, BenchmarkCategory> = {
  overall: {
    name: "All Open Source Projects",
    metrics: {
      avgHealthScore: 62,
      avgBusFactor: 2.8,
      avgResponseTime: 48,
      avgStaleRatio: 0.25,
      avgContributorCount: 8,
      avgCommitFrequency: 6,
      avgStars: 450,
      avgPRMergeTime: 72,
    },
    sampleSize: 10000,
  },
  top1percent: {
    name: "Top 1% Projects",
    metrics: {
      avgHealthScore: 88,
      avgBusFactor: 8,
      avgResponseTime: 6,
      avgStaleRatio: 0.05,
      avgContributorCount: 120,
      avgCommitFrequency: 28,
      avgStars: 15000,
      avgPRMergeTime: 12,
    },
    sampleSize: 100,
  },
  top10percent: {
    name: "Top 10% Projects",
    metrics: {
      avgHealthScore: 78,
      avgBusFactor: 5,
      avgResponseTime: 18,
      avgStaleRatio: 0.12,
      avgContributorCount: 35,
      avgCommitFrequency: 16,
      avgStars: 3500,
      avgPRMergeTime: 36,
    },
    sampleSize: 1000,
  },
  javascript: {
    name: "JavaScript Ecosystem",
    metrics: {
      avgHealthScore: 64,
      avgBusFactor: 3,
      avgResponseTime: 40,
      avgStaleRatio: 0.22,
      avgContributorCount: 12,
      avgCommitFrequency: 8,
      avgStars: 600,
      avgPRMergeTime: 60,
    },
    sampleSize: 2500,
  },
  python: {
    name: "Python Ecosystem",
    metrics: {
      avgHealthScore: 66,
      avgBusFactor: 3.2,
      avgResponseTime: 36,
      avgStaleRatio: 0.2,
      avgContributorCount: 10,
      avgCommitFrequency: 7,
      avgStars: 550,
      avgPRMergeTime: 55,
    },
    sampleSize: 2200,
  },
  typescript: {
    name: "TypeScript Ecosystem",
    metrics: {
      avgHealthScore: 68,
      avgBusFactor: 3.5,
      avgResponseTime: 32,
      avgStaleRatio: 0.18,
      avgContributorCount: 14,
      avgCommitFrequency: 9,
      avgStars: 700,
      avgPRMergeTime: 48,
    },
    sampleSize: 1800,
  },
  rust: {
    name: "Rust Ecosystem",
    metrics: {
      avgHealthScore: 72,
      avgBusFactor: 4,
      avgResponseTime: 24,
      avgStaleRatio: 0.15,
      avgContributorCount: 16,
      avgCommitFrequency: 10,
      avgStars: 800,
      avgPRMergeTime: 42,
    },
    sampleSize: 600,
  },
  webFramework: {
    name: "Web Frameworks",
    metrics: {
      avgHealthScore: 74,
      avgBusFactor: 5,
      avgResponseTime: 20,
      avgStaleRatio: 0.14,
      avgContributorCount: 25,
      avgCommitFrequency: 14,
      avgStars: 5000,
      avgPRMergeTime: 30,
    },
    sampleSize: 300,
  },
  devTools: {
    name: "Developer Tools",
    metrics: {
      avgHealthScore: 70,
      avgBusFactor: 3.8,
      avgResponseTime: 28,
      avgStaleRatio: 0.17,
      avgContributorCount: 18,
      avgCommitFrequency: 11,
      avgStars: 1200,
      avgPRMergeTime: 40,
    },
    sampleSize: 800,
  },
  aiMl: {
    name: "AI / Machine Learning",
    metrics: {
      avgHealthScore: 65,
      avgBusFactor: 3,
      avgResponseTime: 44,
      avgStaleRatio: 0.23,
      avgContributorCount: 15,
      avgCommitFrequency: 8,
      avgStars: 2000,
      avgPRMergeTime: 58,
    },
    sampleSize: 400,
  },
};

// ─── Percentile Calculation ───

export interface PercentileRanking {
  metric: string;
  yourValue: number;
  benchmarkAvg: number;
  top10Percent: number;
  top1Percent: number;
  percentile: number; // where you rank (0-100)
  grade: "A" | "B" | "C" | "D" | "F";
  interpretation: string;
}

export function calculatePercentileRanking(
  metrics: HealthMetrics,
  benchmark: BenchmarkCategory,
  stars: number = 0
): PercentileRanking[] {
  const bm = benchmark.metrics;
  const rankings: PercentileRanking[] = [];

  const calcPercentile = (
    value: number,
    avg: number,
    top10: number,
    top1: number,
    higherIsBetter: boolean = true
  ): number => {
    if (higherIsBetter) {
      if (value >= top1) return 99;
      if (value >= top10) return 90 + ((value - top10) / (top1 - top10)) * 9;
      if (value >= avg) return 50 + ((value - avg) / (top10 - avg)) * 40;
      return Math.max(1, 50 * (value / avg));
    } else {
      if (value <= top1) return 99;
      if (value <= top10) return 90 + ((top10 - value) / (top10 - top1)) * 9;
      if (value <= avg) return 50 + ((avg - value) / (avg - top10)) * 40;
      return Math.max(1, 50 * (avg / value));
    }
  };

  const getGrade = (percentile: number): "A" | "B" | "C" | "D" | "F" => {
    if (percentile >= 90) return "A";
    if (percentile >= 70) return "B";
    if (percentile >= 50) return "C";
    if (percentile >= 30) return "D";
    return "F";
  };

  // Health Score
  const hsPercentile = calcPercentile(metrics.healthScore, bm.avgHealthScore, 78, 88);
  rankings.push({
    metric: "Health Score",
    yourValue: metrics.healthScore,
    benchmarkAvg: bm.avgHealthScore,
    top10Percent: 78,
    top1Percent: 88,
    percentile: hsPercentile,
    grade: getGrade(hsPercentile),
    interpretation: getInterpretation("healthScore", hsPercentile, metrics.healthScore),
  });

  // Bus Factor
  const bfPercentile = calcPercentile(metrics.busFactor, bm.avgBusFactor, 5, 8);
  rankings.push({
    metric: "Bus Factor",
    yourValue: metrics.busFactor,
    benchmarkAvg: bm.avgBusFactor,
    top10Percent: 5,
    top1Percent: 8,
    percentile: bfPercentile,
    grade: getGrade(bfPercentile),
    interpretation: getInterpretation("busFactor", bfPercentile, metrics.busFactor),
  });

  // Response Time (lower is better)
  const rtPercentile = calcPercentile(metrics.responseTimeAvg, bm.avgResponseTime, 18, 6, false);
  rankings.push({
    metric: "Response Time",
    yourValue: metrics.responseTimeAvg,
    benchmarkAvg: bm.avgResponseTime,
    top10Percent: 18,
    top1Percent: 6,
    percentile: rtPercentile,
    grade: getGrade(rtPercentile),
    interpretation: getInterpretation("responseTime", rtPercentile, metrics.responseTimeAvg),
  });

  // Stale Ratio (lower is better)
  const srPercentile = calcPercentile(metrics.staleIssueRatio, bm.avgStaleRatio, 0.12, 0.05, false);
  rankings.push({
    metric: "Stale Issue Ratio",
    yourValue: metrics.staleIssueRatio,
    benchmarkAvg: bm.avgStaleRatio,
    top10Percent: 0.12,
    top1Percent: 0.05,
    percentile: srPercentile,
    grade: getGrade(srPercentile),
    interpretation: getInterpretation("staleRatio", srPercentile, metrics.staleIssueRatio),
  });

  // Contributor Count
  const ccPercentile = calcPercentile(metrics.contributorCount, bm.avgContributorCount, 35, 120);
  rankings.push({
    metric: "Contributors",
    yourValue: metrics.contributorCount,
    benchmarkAvg: bm.avgContributorCount,
    top10Percent: 35,
    top1Percent: 120,
    percentile: ccPercentile,
    grade: getGrade(ccPercentile),
    interpretation: getInterpretation("contributors", ccPercentile, metrics.contributorCount),
  });

  // Commit Frequency
  const cfPercentile = calcPercentile(metrics.commitFrequency, bm.avgCommitFrequency, 16, 28);
  rankings.push({
    metric: "Commit Frequency",
    yourValue: metrics.commitFrequency,
    benchmarkAvg: bm.avgCommitFrequency,
    top10Percent: 16,
    top1Percent: 28,
    percentile: cfPercentile,
    grade: getGrade(cfPercentile),
    interpretation: getInterpretation("commits", cfPercentile, metrics.commitFrequency),
  });

  return rankings;
}

function getInterpretation(metric: string, percentile: number, value: number): string {
  if (percentile >= 90) return `Exceptional! Your ${metric} ranks in the top tier of all open-source projects.`;
  if (percentile >= 70) return `Strong performance. Above average for the ecosystem.`;
  if (percentile >= 50) return `Average. Room for targeted improvement.`;
  if (percentile >= 30) return `Below average. This area needs attention.`;
  return `Critical weakness. Prioritize improving your ${metric}.`;
}

// ─── Category Detection ───

export function detectProjectCategory(
  language: string | null,
  topics: string[],
  description: string | null
): string {
  const text = `${language || ""} ${topics.join(" ")} ${description || ""}`.toLowerCase();

  if (text.match(/react|vue|angular|svelte|next\.?js|nuxt|web framework|frontend/)) return "webFramework";
  if (text.match(/cli|devtool|developer tool|sdk|api client|linter|formatter|bundler/)) return "devTools";
  if (text.match(/machine learning|deep learning|neural|transformer|llm|gpt|ai|ml|nlp|computer vision/)) return "aiMl";
  if (text.match(/typescript/)) return "typescript";
  if (text.match(/python|django|flask|fastapi|pytorch|tensorflow/)) return "python";
  if (text.match(/rust|cargo|wasm/)) return "rust";
  if (text.match(/javascript|node\.?js|npm/)) return "javascript";

  return "overall";
}

// ─── Full Benchmark Report ───

export interface BenchmarkReport {
  projectName: string;
  category: string;
  categoryName: string;
  overallGrade: "A" | "B" | "C" | "D" | "F";
  overallPercentile: number;
  rankings: PercentileRanking[];
  strengths: string[];
  weaknesses: string[];
  comparedToCategory: BenchmarkCategory;
  comparedToTop: BenchmarkCategory;
}

export function generateBenchmarkReport(
  projectName: string,
  metrics: HealthMetrics,
  language: string | null,
  topics: string[],
  description: string | null,
  stars: number = 0
): BenchmarkReport {
  const categoryKey = detectProjectCategory(language, topics, description);
  const category = BENCHMARKS[categoryKey] || BENCHMARKS.overall;
  const top = BENCHMARKS.top1percent;

  const rankings = calculatePercentileRanking(metrics, category, stars);

  const avgPercentile =
    rankings.reduce((sum, r) => sum + r.percentile, 0) / rankings.length;

  const strengths = rankings.filter((r) => r.percentile >= 70).map((r) => r.metric);
  const weaknesses = rankings.filter((r) => r.percentile < 40).map((r) => r.metric);

  const getOverallGrade = (p: number): "A" | "B" | "C" | "D" | "F" => {
    if (p >= 85) return "A";
    if (p >= 70) return "B";
    if (p >= 50) return "C";
    if (p >= 30) return "D";
    return "F";
  };

  return {
    projectName,
    category: categoryKey,
    categoryName: category.name,
    overallGrade: getOverallGrade(avgPercentile),
    overallPercentile: Math.round(avgPercentile),
    rankings,
    strengths,
    weaknesses,
    comparedToCategory: category,
    comparedToTop: top,
  };
}
