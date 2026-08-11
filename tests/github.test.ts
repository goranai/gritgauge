import { fetchRepoInfo, fetchOpenIssues, fetchOpenPRs } from "../src/lib/github";

describe("GitHub API", () => {
  const OWNER = "test-owner";
  const REPO = "test-repo";

  describe("fetchRepoInfo", () => {
    it("returns structured repo info", async () => {
      const result = await fetchRepoInfo(OWNER, REPO);

      expect(result).toHaveProperty("owner", OWNER);
      expect(result).toHaveProperty("name", REPO);
      expect(result).toHaveProperty("fullName", `${OWNER}/${REPO}`);
      expect(result).toHaveProperty("stars");
      expect(result).toHaveProperty("forks");
      expect(result).toHaveProperty("openIssues");
      expect(result).toHaveProperty("language");
      expect(result).toHaveProperty("url");
    });

    it("includes description and topics", async () => {
      const result = await fetchRepoInfo(OWNER, REPO);
      expect(result.description).toBeDefined();
      expect(Array.isArray(result.topics)).toBe(true);
    });
  });

  describe("fetchOpenIssues", () => {
    it("returns filtered issues (no PRs)", async () => {
      const result = await fetchOpenIssues(OWNER, REPO, 10);

      expect(Array.isArray(result)).toBe(true);
      result.forEach((issue) => {
        expect(issue).toHaveProperty("number");
        expect(issue).toHaveProperty("title");
        expect(issue).toHaveProperty("state");
        expect(issue).toHaveProperty("labels");
        expect(issue).toHaveProperty("author");
        expect(issue).toHaveProperty("url");
      });
    });
  });

  describe("fetchOpenPRs", () => {
    it("returns PRs with diff stats", async () => {
      const result = await fetchOpenPRs(OWNER, REPO, 10);

      expect(Array.isArray(result)).toBe(true);
      result.forEach((pr) => {
        expect(pr).toHaveProperty("additions");
        expect(pr).toHaveProperty("deletions");
        expect(pr).toHaveProperty("filesChanged");
      });
    });
  });
});
