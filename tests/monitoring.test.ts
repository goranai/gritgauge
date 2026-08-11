import {
  recordMetric, getSystemHealth, createAlert, acknowledgeAlert,
  startProfilerSpan, endProfilerSpan, log, LogLevel,
} from "../src/services/monitoring/index";

describe("Monitoring Service", () => {
  describe("recordMetric", () => {
    it("records a metric without throwing", () => {
      expect(() => recordMetric("api.request", 1, { endpoint: "/test" })).not.toThrow();
    });

    it("accepts all metric names", () => {
      const metrics = ["api.request", "ai.triage.request", "cache.hit", "webhook.delivery"] as const;
      for (const m of metrics) {
        expect(() => recordMetric(m, 1)).not.toThrow();
      }
    });
  });

  describe("getSystemHealth", () => {
    it("returns health status", async () => {
      const health = await getSystemHealth();
      expect(health).toHaveProperty("status");
      expect(health).toHaveProperty("uptime");
      expect(health).toHaveProperty("metrics");
      expect(health).toHaveProperty("services");
      expect(health).toHaveProperty("alerts");
      expect(health.services).toHaveProperty("database");
      expect(health.services).toHaveProperty("openai");
      expect(health.services).toHaveProperty("github");
    });
  });

  describe("createAlert / acknowledgeAlert", () => {
    it("creates and acknowledges alerts", () => {
      const alert = createAlert("warning", "test-service", "Test warning message");
      expect(alert.severity).toBe("warning");
      expect(alert.service).toBe("test-service");
      expect(alert.acknowledged).toBe(false);

      const acked = acknowledgeAlert(alert.id);
      expect(acked).toBe(true);
      expect(alert.acknowledged).toBe(true);
    });

    it("returns false for unknown alert", () => {
      expect(acknowledgeAlert("nonexistent-id")).toBe(false);
    });
  });

  describe("profiler spans", () => {
    it("measures duration", async () => {
      const spanId = startProfilerSpan("test-span");
      await new Promise((r) => setTimeout(r, 10));
      const result = endProfilerSpan(spanId);
      expect(result).not.toBeNull();
      expect(result!.name).toBe("test-span");
      expect(result!.durationMs).toBeGreaterThan(0);
    });

    it("returns null for unknown span", () => {
      expect(endProfilerSpan("nonexistent")).toBeNull();
    });
  });

  describe("log", () => {
    it("logs without throwing at all levels", () => {
      expect(() => log(LogLevel.DEBUG, "debug message")).not.toThrow();
      expect(() => log(LogLevel.INFO, "info message")).not.toThrow();
      expect(() => log(LogLevel.WARN, "warn message")).not.toThrow();
      expect(() => log(LogLevel.ERROR, "error message")).not.toThrow();
      expect(() => log(LogLevel.FATAL, "fatal message")).not.toThrow();
    });

    it("accepts context object", () => {
      expect(() =>
        log(LogLevel.ERROR, "error with context", { userId: "123", action: "test" })
      ).not.toThrow();
    });
  });
});
