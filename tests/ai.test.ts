import { triageIssue, reviewPR, generateChangelog } from "../src/lib/ai";

describe("AI Services", () => {
  describe("triageIssue", () => {
    it("returns triage result with required fields", async () => {
      const result = await triageIssue(
        "App crashes on login",
        "When clicking login, the app crashes with TypeError",
        ["bug"]
      );

      expect(result).toHaveProperty("suggestedLabels");
      expect(result).toHaveProperty("priority");
      expect(result).toHaveProperty("estimatedEffort");
      expect(result).toHaveProperty("summary");
      expect(result).toHaveProperty("sentiment");
      expect(result).toHaveProperty("isDuplicate");
      expect(Array.isArray(result.suggestedLabels)).toBe(true);
    });

    it("handles null body gracefully", async () => {
      const result = await triageIssue("Simple issue", null, []);
      expect(result.summary).toBeDefined();
    });

    it("handles empty labels array", async () => {
      const result = await triageIssue("Test", "Body", []);
      expect(Array.isArray(result.suggestedLabels)).toBe(true);
    });
  });

  describe("reviewPR", () => {
    it("returns review result with risk assessment", async () => {
      const result = await reviewPR(
        "Add authentication middleware",
        "Implements JWT-based auth for API routes",
        5,
        200,
        50
      );

      expect(result).toHaveProperty("riskLevel");
      expect(result).toHaveProperty("summary");
      expect(result).toHaveProperty("keyChanges");
      expect(result).toHaveProperty("potentialIssues");
      expect(result).toHaveProperty("recommendation");
      expect(Array.isArray(result.keyChanges)).toBe(true);
    });

    it("handles missing PR body", async () => {
      const result = await reviewPR("Quick fix", null, 1, 10, 2);
      expect(result.summary).toBeDefined();
    });
  });

  describe("generateChangelog", () => {
    it("generates changelog from merged PRs", async () => {
      const prs = [
        { title: "Add dark mode support", number: 100, author: "dev1" },
        { title: "Fix memory leak", number: 101, author: "dev2" },
      ];

      const result = await generateChangelog("test-repo", prs);
      expect(typeof result).toBe("string");
      expect(result.length).toBeGreaterThan(0);
    });

    it("handles empty PR list", async () => {
      const result = await generateChangelog("test-repo", []);
      expect(typeof result).toBe("string");
    });
  });
});
