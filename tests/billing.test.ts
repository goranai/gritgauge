import { PLANS, checkFeatureAccess, getCurrentPlan } from "../src/services/billing/index";

describe("Billing System", () => {
  describe("PLANS", () => {
    it("has all plan tiers", () => {
      expect(PLANS.free).toBeDefined();
      expect(PLANS.pro).toBeDefined();
      expect(PLANS.team).toBeDefined();
      expect(PLANS.enterprise).toBeDefined();
    });

    it("free plan has correct limits", () => {
      expect(PLANS.free.limits.monitoredRepos).toBe(3);
      expect(PLANS.free.limits.aiCallsPerDay).toBe(100);
      expect(PLANS.free.price).toBe(0);
    });

    it("pro plan has expanded limits", () => {
      expect(PLANS.pro.limits.monitoredRepos).toBe(Infinity);
      expect(PLANS.pro.limits.aiCallsPerDay).toBe(1000);
      expect(PLANS.pro.price).toBe(29);
      expect(PLANS.pro.limits.securityScans).toBe(true);
    });

    it("team plan has team features", () => {
      expect(PLANS.team.limits.teamMembers).toBe(20);
      expect(PLANS.team.limits.customPlugins).toBe(true);
      expect(PLANS.team.price).toBe(99);
    });

    it("enterprise plan has unlimited everything", () => {
      expect(PLANS.enterprise.limits.aiCallsPerDay).toBe(Infinity);
      expect(PLANS.enterprise.limits.teamMembers).toBe(Infinity);
      expect(PLANS.enterprise.limits.whiteLabel).toBe(true);
    });
  });

  describe("getCurrentPlan", () => {
    it("returns free plan by default", async () => {
      const result = await getCurrentPlan("test-user");
      expect(result.plan.id).toBe("free");
      expect(result.usage).toBeDefined();
    });
  });

  describe("checkFeatureAccess", () => {
    it("checks monitored repos limit", async () => {
      const result = await checkFeatureAccess("test-user", "monitoredRepos");
      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(3);
      expect(result.plan).toBe("Starter");
    });
  });
});
