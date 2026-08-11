import { checkRateLimit, sanitizeHtml, validateGitHubToken, validateOpenAIKey } from "../src/lib/validation";

describe("Validation & Security", () => {
  describe("checkRateLimit", () => {
    it("allows requests within limit", () => {
      const result = checkRateLimit("test-key", 10, 60000);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(9);
    });

    it("blocks requests exceeding limit", () => {
      const key = "rate-limit-key";
      // Exhaust the limit
      for (let i = 0; i < 5; i++) {
        checkRateLimit(key, 5, 60000);
      }
      const result = checkRateLimit(key, 5, 60000);
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });
  });

  describe("sanitizeHtml", () => {
    it("escapes HTML characters", () => {
      expect(sanitizeHtml('<script>alert("xss")</script>')).toBe(
        "&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;"
      );
    });

    it("handles clean strings", () => {
      expect(sanitizeHtml("Hello World")).toBe("Hello World");
    });
  });

  describe("validateGitHubToken", () => {
    it("validates correct token format", () => {
      expect(validateGitHubToken("ghp_abcdefghijklmnopqrstuvwxyz1234567890")).toBe(true);
    });

    it("rejects invalid token format", () => {
      expect(validateGitHubToken("invalid")).toBe(false);
      expect(validateGitHubToken("")).toBe(false);
    });
  });

  describe("validateOpenAIKey", () => {
    it("validates correct key format", () => {
      expect(validateOpenAIKey("sk-abcdefghijklmnopqrstuvwxyz1234567890ABCD")).toBe(true);
    });

    it("rejects invalid key format", () => {
      expect(validateOpenAIKey("invalid")).toBe(false);
      expect(validateOpenAIKey("")).toBe(false);
    });
  });
});
