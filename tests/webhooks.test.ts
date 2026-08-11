import { processWebhookEvent, verifyWebhookSignature, parseGitHubEvent, enqueueGitHubRequest, type GitHubEvent } from "../src/services/github/webhooks";

describe("GitHub Webhooks", () => {
  describe("verifyWebhookSignature", () => {
    it("verifies valid signature", () => {
      const crypto = require("crypto");
      const secret = "test-secret";
      const payload = JSON.stringify({ test: true });
      const signature = `sha256=${crypto.createHmac("sha256", secret).update(payload).digest("hex")}`;
      expect(verifyWebhookSignature(payload, signature, secret)).toBe(true);
    });

    it("rejects invalid signature", () => {
      expect(verifyWebhookSignature("payload", "sha256=bad", "secret")).toBe(false);
    });

    it("handles missing signature", () => {
      expect(verifyWebhookSignature("payload", "", "secret")).toBe(false);
    });
  });

  describe("parseGitHubEvent", () => {
    it("parses valid events", () => {
      expect(parseGitHubEvent("issues", "opened")).toBe("issues.opened");
      expect(parseGitHubEvent("pull_request", "closed")).toBe("pull_request.closed");
      expect(parseGitHubEvent("push", "push")).toBeNull(); // push doesn't have action
      expect(parseGitHubEvent("star", "created")).toBe("star.created");
    });

    it("returns null for invalid events", () => {
      expect(parseGitHubEvent("invalid", "event")).toBeNull();
      expect(parseGitHubEvent("issues", "invalid_action")).toBeNull();
    });
  });

  describe("processWebhookEvent", () => {
    it("processes issue opened event", async () => {
      const payload = {
        action: "opened",
        repository: { owner: { login: "test" }, name: "repo", full_name: "test/repo" },
        sender: { login: "user1", id: 1 },
        issue: { number: 42, title: "Test issue", html_url: "https://github.com/test/repo/issues/42" },
      };

      const result = await processWebhookEvent("issues.opened", payload);
      expect(result.processed).toBe(true);
      expect(result.action).toBe("auto-triage");
    });

    it("processes PR opened event", async () => {
      const payload = {
        action: "opened",
        repository: { owner: { login: "test" }, name: "repo", full_name: "test/repo" },
        sender: { login: "user2", id: 2 },
        pull_request: { number: 10, title: "Test PR", html_url: "https://github.com/test/repo/pull/10", draft: false },
      };

      const result = await processWebhookEvent("pull_request.opened", payload);
      expect(result.processed).toBe(true);
    });
  });

  describe("enqueueGitHubRequest", () => {
    it("enqueues and processes requests", async () => {
      const result = await enqueueGitHubRequest(async () => "success", 1);
      expect(result).toBe("success");
    });

    it("handles errors", async () => {
      await expect(
        enqueueGitHubRequest(async () => { throw new Error("fail"); }, 1)
      ).rejects.toThrow("fail");
    });
  });
});
