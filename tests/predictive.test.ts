import { linearRegression, exponentialMovingAverage, simpleMovingAverage, predictIssueBurndown, predictPRMergeTime, predictContributorChurn, forecastHealthScore, detectAnomalies, detectSeasonality } from "../src/services/predictive/index";

describe("Predictive Analytics", () => {
  describe("simpleMovingAverage", () => {
    it("calculates SMA correctly", () => {
      const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const result = simpleMovingAverage(data, 3);
      expect(result).toHaveLength(8);
      expect(result[0]).toBeCloseTo(2, 1); // (1+2+3)/3
      expect(result[7]).toBeCloseTo(9, 1); // (8+9+10)/3
    });

    it("returns original data if window larger than data", () => {
      expect(simpleMovingAverage([1, 2], 5)).toEqual([1, 2]);
    });
  });

  describe("exponentialMovingAverage", () => {
    it("calculates EMA with smoothing", () => {
      const data = [10, 20, 30, 40, 50];
      const result = exponentialMovingAverage(data, 0.5);
      expect(result).toHaveLength(5);
      expect(result[0]).toBe(10);
    });
  });

  describe("linearRegression", () => {
    it("predicts upward trend correctly", () => {
      const yValues = [10, 20, 30, 40, 50];
      const result = linearRegression(yValues, 3);
      expect(result.slope).toBeGreaterThan(0);
      expect(result.trend).toBe("rising");
      expect(result.predictions).toHaveLength(3);
      expect(result.predictions[0]).toBeGreaterThan(50);
    });

    it("predicts downward trend correctly", () => {
      const yValues = [50, 40, 30, 20, 10];
      const result = linearRegression(yValues, 2);
      expect(result.slope).toBeLessThan(0);
      expect(result.trend).toBe("falling");
    });

    it("calculates R-squared between 0 and 1", () => {
      const result = linearRegression([1, 2, 3, 4, 5], 2);
      expect(result.r2).toBeGreaterThanOrEqual(0);
      expect(result.r2).toBeLessThanOrEqual(1);
    });

    it("handles single data point", () => {
      const result = linearRegression([42], 1);
      expect(result.predictions).toHaveLength(1);
      expect(result.slope).toBe(0);
    });
  });

  describe("predictIssueBurndown", () => {
    it("calculates weeks to zero for improving trend", () => {
      const result = predictIssueBurndown(100, [10, 12, 15, 18], [5, 5, 6, 5]);
      expect(result.currentIssues).toBe(100);
      expect(result.weeksToZero).toBeGreaterThan(0);
      expect(result.isImproving).toBe(true);
    });

    it("detects growing backlog", () => {
      const result = predictIssueBurndown(200, [5, 5, 5], [10, 12, 15]);
      expect(result.weeksToZero).toBe(Infinity);
      expect(result.recommendedActions.length).toBeGreaterThan(0);
    });
  });

  describe("predictPRMergeTime", () => {
    it("predicts based on historical data", () => {
      const result = predictPRMergeTime(
        [24, 48, 36, 72, 24],
        [{ files: 5, additions: 100, deletions: 50 }]
      );
      expect(result.avgMergeTimeHours).toBeGreaterThan(0);
      expect(result.predictedNextPRMergeHours).toBeGreaterThan(0);
      expect(result.optimalReviewerCount).toBeGreaterThan(0);
    });

    it("identifies large PRs as bottleneck", () => {
      const result = predictPRMergeTime(
        [48],
        [{ files: 50, additions: 5000, deletions: 3000 }]
      );
      expect(result.predictedNextPRMergeHours).toBeGreaterThan(48);
      expect(result.bottleneckFiles.length).toBeGreaterThan(0);
    });
  });

  describe("predictContributorChurn", () => {
    it("calculates churn rate", () => {
      const result = predictContributorChurn(50, [5, 8, 6, 7], [3, 4, 2, 5]);
      expect(result.activeContributors).toBe(50);
      expect(result.churnRate).toBeGreaterThan(0);
      expect(result.projectedContributors30Days).toBeGreaterThan(0);
    });

    it("provides suggestions for high churn", () => {
      const result = predictContributorChurn(20, [0, 1, 0], [5, 4, 6]);
      expect(result.churnRate).toBeGreaterThan(0.1);
      expect(result.retentionSuggestions.length).toBeGreaterThan(0);
    });
  });

  describe("forecastHealthScore", () => {
    it("generates forecast with confidence intervals", () => {
      const result = forecastHealthScore([65, 68, 70, 72, 75, 78], 4);
      expect(result.forecast).toHaveLength(4);
      expect(result.confidence).toHaveLength(4);
      expect(result.confidence[0]).toBeGreaterThan(result.confidence[3]); // Confidence decreases
    });

    it("detects warning zone", () => {
      const result = forecastHealthScore([50, 45, 40, 35, 30], 4);
      expect(result.warningZone).toBe(true);
    });

    it("handles insufficient data", () => {
      const result = forecastHealthScore([70], 3);
      expect(result.forecast).toHaveLength(3);
      expect(result.confidence[0]).toBeLessThanOrEqual(0.3);
    });
  });

  describe("detectAnomalies", () => {
    it("detects significant deviations", () => {
      const metrics = [{
        name: "responseTime",
        values: [10, 12, 11, 10, 13, 11, 10, 50, 55, 60],
        thresholds: { min: 0, max: 100 },
      }];
      const result = detectAnomalies(metrics);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].severity).toBe("critical");
    });

    it("returns empty for normal data", () => {
      const metrics = [{
        name: "commits",
        values: [10, 12, 11, 10, 13, 11, 10, 12, 11, 10],
        thresholds: { min: 0, max: 100 },
      }];
      const result = detectAnomalies(metrics);
      expect(result.length).toBe(0);
    });
  });

  describe("detectSeasonality", () => {
    it("detects weekly pattern in commit data", () => {
      // Simulate higher activity on weekdays
      const data = [5, 5, 5, 5, 5, 2, 1, 5, 5, 5, 5, 5, 2, 1, 5, 5, 5, 5, 5, 2, 1];
      const result = detectSeasonality(data, 7);
      expect(result.hasSeasonality).toBe(true);
      expect(result.seasonalPattern).toHaveLength(7);
      expect(result.strength).toBeGreaterThan(0);
    });

    it("returns false for random data", () => {
      const data = [3, 7, 2, 9, 1, 6, 4, 8, 2, 5, 3, 7, 1, 9, 4, 6, 2, 8, 5, 3, 7];
      const result = detectSeasonality(data, 7);
      expect(result.strength).toBeLessThan(0.5);
    });
  });
});
