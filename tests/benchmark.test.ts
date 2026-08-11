import {
  generateBenchmarkReport, calculatePercentileRanking,
  detectProjectCategory, BENCHMARKS,
} from "../src/services/benchmark/index";
import type { HealthMetrics } from "../src/types";

describe("Benchmark Service", () => {
  const testMetrics: HealthMetrics = {
    healthScore: 72,
    busFactor: 4,
    responseTimeAvg: 20,
    staleIssueRatio: 0.15,
    contributorCount: 18,
    commitFrequency: 12,
    prMergeTimeAvg: 36,
    trends: { issuesTrend: "stable", prsTrend: "stable", contributorsTrend: "up" },
    details: {
      issueResolutionRate: 0.7, prAcceptanceRate: 0.85,
      avgIssueComments: 3, avgPRReviewComments: 4,
      firstTimeContributorRatio: 0.15, documentationScore: 70,
      ciStatus: "passing", daysSinceLastCommit: 2,
      daysSinceLastRelease: 7, contributorRetentionRate: 0.75,
    },
  };

  describe("BENCHMARKS", () => {
    it("has all expected categories", () => {
      expect(BENCHMARKS.overall).toBeDefined();
      expect(BENCHMARKS.top1percent).toBeDefined();
      expect(BENCHMARKS.top10percent).toBeDefined();
      expect(BENCHMARKS.javascript).toBeDefined();
      expect(BENCHMARKS.python).toBeDefined();
      expect(BENCHMARKS.typescript).toBeDefined();
      expect(BENCHMARKS.rust).toBeDefined();
      expect(BENCHMARKS.webFramework).toBeDefined();
      expect(BENCHMARKS.devTools).toBeDefined();
      expect(BENCHMARKS.aiMl).toBeDefined();
    });

    it("top 1% has higher scores than overall", () => {
      expect(BENCHMARKS.top1percent.metrics.avgHealthScore)
        .toBeGreaterThan(BENCHMARKS.overall.metrics.avgHealthScore);
    });
  });

  describe("detectProjectCategory", () => {
    it("detects web frameworks", () => {
      expect(detectProjectCategory("TypeScript", ["react", "frontend"], "A React component library"))
        .toBe("webFramework");
    });

    it("detects dev tools", () => {
      expect(detectProjectCategory("TypeScript", ["cli", "devtools"], "Developer tool for..."))
        .toBe("devTools");
    });

    it("detects AI/ML projects", () => {
      expect(detectProjectCategory("Python", ["machine-learning", "nlp"], "ML model for..."))
        .toBe("aiMl");
    });

    it("falls back to language-based category", () => {
      expect(detectProjectCategory("Rust", [], null)).toBe("rust");
      expect(detectProjectCategory("Python", [], null)).toBe("python");
    });

    it("defaults to overall", () => {
      expect(detectProjectCategory(null, [], null)).toBe("overall");
    });
  });

  describe("calculatePercentileRanking", () => {
    it("returns rankings for all key metrics", () => {
      const rankings = calculatePercentileRanking(testMetrics, BENCHMARKS.overall);
      const metrics = rankings.map((r) => r.metric);
      expect(metrics).toContain("Health Score");
      expect(metrics).toContain("Bus Factor");
      expect(metrics).toContain("Response Time");
      expect(metrics).toContain("Stale Issue Ratio");
      expect(metrics).toContain("Contributors");
      expect(metrics).toContain("Commit Frequency");
    });

    it("each ranking has a grade", () => {
      const rankings = calculatePercentileRanking(testMetrics, BENCHMARKS.overall);
      for (const r of rankings) {
        expect(["A", "B", "C", "D", "F"]).toContain(r.grade);
        expect(r.interpretation.length).toBeGreaterThan(0);
      }
    });
  });

  describe("generateBenchmarkReport", () => {
    it("generates complete report with strengths and weaknesses", () => {
      const report = generateBenchmarkReport(
        "test/repo", testMetrics, "TypeScript",
        ["devtools"], "A test tool", 500
      );

      expect(report.projectName).toBe("test/repo");
      expect(report.category).toBeDefined();
      expect(report.overallGrade).toBeDefined();
      expect(report.rankings.length).toBeGreaterThan(0);
      expect(Array.isArray(report.strengths)).toBe(true);
      expect(Array.isArray(report.weaknesses)).toBe(true);
      expect(report.comparedToCategory).toBeDefined();
      expect(report.comparedToTop).toBeDefined();
    });
  });
});
