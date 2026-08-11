import {
  getHealthRecommendations, getTriageRecommendations,
  getReviewRecommendations, getAllRecommendations,
} from "../src/services/recommendations/index";
import type { HealthMetrics, TriageResult, PRReviewResult } from "../src/types";

describe("Recommendation Engine", () => {
  const healthyMetrics: HealthMetrics = {
    healthScore: 85,
    busFactor: 6,
    responseTimeAvg: 8,
    staleIssueRatio: 0.08,
    contributorCount: 25,
    commitFrequency: 15,
    prMergeTimeAvg: 24,
    trends: { issuesTrend: "stable", prsTrend: "stable", contributorsTrend: "up" },
    details: {
      issueResolutionRate: 0.8,
      prAcceptanceRate: 0.9,
      avgIssueComments: 3,
      avgPRReviewComments: 4,
      firstTimeContributorRatio: 0.2,
      documentationScore: 80,
      ciStatus: "passing",
      daysSinceLastCommit: 1,
      daysSinceLastRelease: 5,
      contributorRetentionRate: 0.8,
    },
  };

  const unhealthyMetrics: HealthMetrics = {
    ...healthyMetrics,
    healthScore: 25,
    busFactor: 1,
    responseTimeAvg: 96,
    staleIssueRatio: 0.55,
  };

  const criticalTriage: TriageResult[] = [
    { issueNumber: 1, priority: "critical", suggestedLabels: ["bug"], estimatedEffort: "large", suggestedAssignee: null, summary: "Critical bug", isDuplicate: false, duplicateOf: null, sentiment: "negative", relatedIssues: [], suggestedFirstStep: "" },
    { issueNumber: 2, priority: "high", suggestedLabels: ["bug"], estimatedEffort: "medium", suggestedAssignee: null, summary: "High bug", isDuplicate: false, duplicateOf: null, sentiment: "negative", relatedIssues: [], suggestedFirstStep: "" },
    { issueNumber: 3, priority: "medium", suggestedLabels: ["enhancement"], estimatedEffort: "small", suggestedAssignee: null, summary: "Feature", isDuplicate: true, duplicateOf: 1, sentiment: "neutral", relatedIssues: [], suggestedFirstStep: "" },
  ];

  const highRiskReviews: PRReviewResult[] = [
    { prNumber: 1, riskLevel: "high", summary: "Risky", suggestedReviewers: [], keyChanges: [], potentialIssues: [], testCoverageNote: "", recommendation: "request_changes", codeQualityScore: 40, securityFlags: [] },
    { prNumber: 2, riskLevel: "high", summary: "Also risky", suggestedReviewers: [], keyChanges: [], potentialIssues: [], testCoverageNote: "", recommendation: "request_changes", codeQualityScore: 35, securityFlags: [] },
  ];

  describe("getHealthRecommendations", () => {
    it("detects critical health issues", () => {
      const recs = getHealthRecommendations(unhealthyMetrics);
      expect(recs.some((r) => r.priority === "critical")).toBe(true);
    });

    it("gives positive feedback for healthy projects", () => {
      const recs = getHealthRecommendations(healthyMetrics);
      expect(recs.some((r) => r.id === "health-good")).toBe(true);
    });

    it("recommends stale cleanup when ratio is high", () => {
      const recs = getHealthRecommendations(unhealthyMetrics);
      expect(recs.some((r) => r.id === "stale-cleanup")).toBe(true);
    });

    it("warns about low bus factor", () => {
      const recs = getHealthRecommendations(unhealthyMetrics);
      expect(recs.some((r) => r.id === "bus-factor-low")).toBe(true);
    });
  });

  describe("getTriageRecommendations", () => {
    it("detects critical issues", () => {
      const recs = getTriageRecommendations(criticalTriage);
      expect(recs.some((r) => r.id === "critical-issues")).toBe(true);
    });

    it("detects duplicates", () => {
      const recs = getTriageRecommendations(criticalTriage);
      expect(recs.some((r) => r.id === "duplicate-detection")).toBe(true);
    });
  });

  describe("getReviewRecommendations", () => {
    it("warns about high-risk PRs", () => {
      const recs = getReviewRecommendations(highRiskReviews);
      expect(recs.some((r) => r.id === "high-risk-prs")).toBe(true);
    });
  });

  describe("getAllRecommendations", () => {
    it("combines and sorts by priority", () => {
      const recs = getAllRecommendations(unhealthyMetrics, criticalTriage, highRiskReviews);
      expect(recs.length).toBeGreaterThan(0);
      // Critical should come before high
      const firstCritical = recs.findIndex((r) => r.priority === "critical");
      const firstHigh = recs.findIndex((r) => r.priority === "high");
      if (firstCritical >= 0 && firstHigh >= 0) {
        expect(firstCritical).toBeLessThan(firstHigh);
      }
    });

    it("deduplicates recommendations", () => {
      const recs = getAllRecommendations(unhealthyMetrics, criticalTriage, highRiskReviews);
      const ids = recs.map((r) => r.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });
});
