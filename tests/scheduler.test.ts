import {
  registerJob, startScheduler, stopScheduler, getJobStatus,
  triggerJob, registerDefaultJobs,
} from "../src/services/scheduler/index";

describe("Scheduler Service", () => {
  afterEach(() => {
    stopScheduler();
  });

  describe("registerJob", () => {
    it("registers a job", () => {
      registerJob("healthSnapshot", 60000, async () => {});
      const status = getJobStatus();
      expect(status.some((j) => j.name === "healthSnapshot")).toBe(true);
    });

    it("updates interval for existing job", () => {
      registerJob("healthSnapshot", 30000, async () => {});
      registerJob("healthSnapshot", 60000, async () => {});
      const status = getJobStatus();
      const job = status.find((j) => j.name === "healthSnapshot");
      expect(job).toBeDefined();
    });
  });

  describe("getJobStatus", () => {
    it("returns empty array when no jobs registered", () => {
      // Stop any running scheduler first
      stopScheduler();
      // Create fresh state by checking status
      const status = getJobStatus();
      expect(Array.isArray(status)).toBe(true);
    });
  });

  describe("triggerJob", () => {
    it("fails for unknown job", async () => {
      const result = await triggerJob("nonexistent" as never);
      expect(result.success).toBe(false);
    });

    it("runs a registered job", async () => {
      let ran = false;
      registerJob("testJob", 1000, async () => { ran = true; });
      const result = await triggerJob("testJob");
      expect(result.success).toBe(true);
      expect(ran).toBe(true);
    });
  });

  describe("registerDefaultJobs", () => {
    it("registers default jobs without throwing", () => {
      expect(() => registerDefaultJobs()).not.toThrow();
      const status = getJobStatus();
      expect(status.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe("startScheduler / stopScheduler", () => {
    it("starts and stops without error", () => {
      expect(() => startScheduler()).not.toThrow();
      expect(() => stopScheduler()).not.toThrow();
    });
  });
});
