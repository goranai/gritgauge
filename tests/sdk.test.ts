import { GritGaugeClient, createClient, quickTriage, quickReview } from "../sdk/index";

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe("GritGauge SDK", () => {
  let client: GritGaugeClient;

  beforeEach(() => {
    client = createClient({ apiUrl: "http://localhost:3000", apiKey: "test-key" });
    mockFetch.mockClear();
  });

  describe("constructor", () => {
    it("creates client with config", () => {
      const c = new GritGaugeClient({ apiUrl: "http://test.com", timeout: 5000, retries: 2 });
      expect(c).toBeInstanceOf(GritGaugeClient);
    });

    it("strips trailing slash from apiUrl", () => {
      const c = createClient({ apiUrl: "http://test.com/" });
      expect(c).toBeDefined();
    });
  });

  describe("getRepo", () => {
    it("fetches repo data", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { fullName: "test/repo", stars: 100, forks: 20, openIssues: 5, openPRs: 3, language: "TypeScript", healthScore: 85 } }),
      });

      const result = await client.getRepo("test", "repo");
      expect(result.fullName).toBe("test/repo");
      expect(result.stars).toBe(100);
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:3000/api/github?repo=test%2Frepo",
        expect.objectContaining({ headers: expect.objectContaining({ Authorization: "Bearer test-key" }) })
      );
    });

    it("throws on API error", async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 404, text: () => Promise.resolve("Not found") });
      await expect(client.getRepo("bad", "repo")).rejects.toThrow("HTTP 404");
    });
  });

  describe("triageIssue", () => {
    it("returns triage result", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ priority: "high", suggestedLabels: ["bug"], summary: "Needs fix", sentiment: "negative", effort: "small", issueNumber: 1 }),
      });

      const result = await client.triageIssue("Broken test", "Description here", ["bug"]);
      expect(result.priority).toBe("high");
      expect(result.suggestedLabels).toContain("bug");
    });
  });

  describe("reviewPR", () => {
    it("returns review result", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ riskLevel: "medium", recommendation: "comment", summary: "Looks OK", keyChanges: [], potentialIssues: [] }),
      });

      const result = await client.reviewPR("Add feature", "PR body", 5, 100, 20);
      expect(result.riskLevel).toBe("medium");
      expect(result.recommendation).toBe("comment");
    });
  });

  describe("compareRepos", () => {
    it("compares multiple repos", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          data: { repos: [{ fullName: "a/b", healthScore: 80, stars: 100, busFactor: 3 }], winner: "a/b" },
        }),
      });

      const result = await client.compareRepos(["id1", "id2"]);
      expect(result.winner).toBe("a/b");
    });
  });

  describe("webhook management", () => {
    it("creates webhook", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { id: "wh_123" } }),
      });

      const result = await client.createWebhook({ url: "https://hook.example.com", events: ["triage.completed"] });
      expect(result.id).toBe("wh_123");
    });

    it("lists webhooks", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: [{ id: "1", url: "https://h.com", events: ["e1"], isActive: true }] }),
      });

      const result = await client.listWebhooks();
      expect(result).toHaveLength(1);
    });
  });

  describe("retry logic", () => {
    it("retries on network error", async () => {
      mockFetch
        .mockRejectedValueOnce(new Error("Network error"))
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ status: "ok" }) });

      const result = await client.ping();
      expect(result.status).toBe("ok");
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe("quickTriage helper", () => {
    it("creates client and triages", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ priority: "low", suggestedLabels: [], summary: "OK", sentiment: "neutral", effort: "small", issueNumber: 0 }),
      });

      const result = await quickTriage("http://localhost:3000", "test/repo", "Title here");
      expect(result.priority).toBe("low");
    });
  });

  describe("factory function", () => {
    it("createClient works with partial config", () => {
      const c = createClient({ apiUrl: "http://test.com" });
      expect(c).toBeInstanceOf(GritGaugeClient);
    });
  });
});
