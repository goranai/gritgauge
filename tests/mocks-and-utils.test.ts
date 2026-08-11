import { generateMockProject, generateHealthMetrics, generateTriageResult, generateReviewResult, generateTimeSeries } from "./mocks";
import { mean, median, standardDeviation, percentile, correlation, movingAverage, clamp, formatCompactNumber, formatPercent, formatBytes, formatDuration, groupBy, sortBy, retry, debounce, throttle } from "../src/lib/utils";

describe("Mock Data Generators", () => {
  describe("generateMockProject", () => {
    it("generates complete project data", () => {
      const project = generateMockProject();
      expect(project.repo).toBeDefined();
      expect(project.repo.fullName).toBeTruthy();
      expect(project.issues.length).toBeGreaterThan(0);
      expect(project.prs.length).toBeGreaterThan(0);
      expect(project.contributors.length).toBeGreaterThan(0);
      expect(project.health).toBeDefined();
    });

    it("generates consistent repo URL pattern", () => {
      const project = generateMockProject("testowner", "testrepo");
      expect(project.repo.url).toContain("github.com/testowner/testrepo");
      expect(project.issues[0].url).toContain("github.com/testowner/testrepo/issues");
      expect(project.prs[0].url).toContain("github.com/testowner/testrepo/pull");
    });

    it("generates valid health score range", () => {
      for (let i = 0; i < 20; i++) {
        const health = generateHealthMetrics();
        expect(health.healthScore).toBeGreaterThanOrEqual(0);
        expect(health.healthScore).toBeLessThanOrEqual(100);
      }
    });

    it("generates valid triage priorities", () => {
      const validPriorities = ["critical", "high", "medium", "low"];
      for (let i = 0; i < 20; i++) {
        const triage = generateTriageResult(i);
        expect(validPriorities).toContain(triage.priority);
      }
    });
  });

  describe("generateTimeSeries", () => {
    it("generates correct number of points", () => {
      const series = generateTimeSeries(30, 100, 10);
      expect(series).toHaveLength(30);
    });

    it("has valid date format", () => {
      const series = generateTimeSeries(7, 50, 5);
      for (const point of series) {
        expect(point.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(typeof point.value).toBe("number");
      }
    });

    it("trends upward", () => {
      const series = generateTimeSeries(90, 50, 5, "up");
      const first = series.slice(0, 10).reduce((s, p) => s + p.value, 0) / 10;
      const last = series.slice(-10).reduce((s, p) => s + p.value, 0) / 10;
      expect(last).toBeGreaterThan(first);
    });

    it("trends downward", () => {
      const series = generateTimeSeries(90, 50, 5, "down");
      const first = series.slice(0, 10).reduce((s, p) => s + p.value, 0) / 10;
      const last = series.slice(-10).reduce((s, p) => s + p.value, 0) / 10;
      expect(last).toBeLessThan(first);
    });
  });
});

describe("Statistics Utilities", () => {
  const data = [2, 4, 4, 4, 5, 5, 7, 9];

  it("calculates mean", () => {
    expect(mean(data)).toBeCloseTo(5, 1);
  });

  it("calculates median", () => {
    expect(median(data)).toBe(4.5);
  });

  it("calculates standard deviation", () => {
    const result = standardDeviation(data);
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThan(5);
  });

  it("calculates percentiles", () => {
    expect(percentile(data, 50)).toBeCloseTo(4.5, 1);
    expect(percentile(data, 0)).toBe(2);
    expect(percentile(data, 100)).toBe(9);
  });

  it("calculates correlation", () => {
    const x = [1, 2, 3, 4, 5];
    const y = [2, 4, 6, 8, 10];
    expect(correlation(x, y)).toBeCloseTo(1, 1);
  });

  it("calculates moving average", () => {
    const result = movingAverage([1, 2, 3, 4, 5], 3);
    expect(result).toHaveLength(3);
    expect(result[0]).toBeCloseTo(2, 1);
  });

  it("handles empty arrays", () => {
    expect(mean([])).toBe(0);
    expect(median([])).toBe(0);
    expect(standardDeviation([])).toBe(0);
  });
});

describe("Formatting Utilities", () => {
  it("formats compact numbers", () => {
    expect(formatCompactNumber(1500)).toBe("1.5K");
    expect(formatCompactNumber(2500000)).toBe("2.5M");
    expect(formatCompactNumber(500)).toBe("500");
  });

  it("formats percentages", () => {
    expect(formatPercent(0.75)).toBe("75%");
    expect(formatPercent(0.333, 1)).toBe("33.3%");
  });

  it("formats bytes", () => {
    expect(formatBytes(1024)).toBe("1 KB");
    expect(formatBytes(1048576)).toBe("1 MB");
    expect(formatBytes(0)).toBe("0 B");
  });

  it("formats duration", () => {
    expect(formatDuration(500)).toBe("500ms");
    expect(formatDuration(65000)).toBe("1m 5s");
    expect(formatDuration(3661000)).toBe("1h 1m");
  });

  it("clamps values", () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-5, 0, 10)).toBe(0);
    expect(clamp(15, 0, 10)).toBe(10);
  });
});

describe("Array Utilities", () => {
  it("groups by key", () => {
    const items = [
      { type: "bug", val: 1 },
      { type: "bug", val: 2 },
      { type: "feature", val: 3 },
    ];
    const grouped = groupBy(items, (i) => i.type);
    expect(grouped.bug).toHaveLength(2);
    expect(grouped.feature).toHaveLength(1);
  });

  it("sorts by key", () => {
    const items = [{ id: 3 }, { id: 1 }, { id: 2 }];
    const sorted = sortBy(items, (i) => i.id);
    expect(sorted[0].id).toBe(1);
    expect(sorted[2].id).toBe(3);
  });
});

describe("Async Utilities", () => {
  it("retries on failure", async () => {
    let attempts = 0;
    const fn = async () => {
      attempts++;
      if (attempts < 3) throw new Error("fail");
      return "success";
    };
    const result = await retry(fn, { maxAttempts: 3, baseDelay: 10 });
    expect(result).toBe("success");
    expect(attempts).toBe(3);
  });
});
