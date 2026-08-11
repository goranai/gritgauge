import { parseRepoUrl, formatRelativeTime, formatDate, truncate, cn } from "../src/lib/utils";

describe("Utils", () => {
  describe("parseRepoUrl", () => {
    it("parses full GitHub URL", () => {
      const result = parseRepoUrl("https://github.com/facebook/react");
      expect(result).toEqual({ owner: "facebook", name: "react" });
    });

    it("parses owner/repo format", () => {
      const result = parseRepoUrl("vercel/next.js");
      expect(result).toEqual({ owner: "vercel", name: "next.js" });
    });

    it("handles trailing slash", () => {
      const result = parseRepoUrl("https://github.com/facebook/react/");
      expect(result).toEqual({ owner: "facebook", name: "react" });
    });

    it("returns null for invalid input", () => {
      expect(parseRepoUrl("")).toBeNull();
      expect(parseRepoUrl("not-a-repo")).toBeNull();
    });
  });

  describe("formatDate", () => {
    it("formats ISO date string", () => {
      const result = formatDate("2024-06-15T10:30:00Z");
      expect(result).toContain("Jun");
      expect(result).toContain("15");
      expect(result).toContain("2024");
    });
  });

  describe("formatRelativeTime", () => {
    it('returns "just now" for recent timestamps', () => {
      const now = new Date().toISOString();
      expect(formatRelativeTime(now)).toBe("just now");
    });

    it("returns hours for timestamps within a day", () => {
      const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
      expect(formatRelativeTime(oneHourAgo)).toContain("h ago");
    });
  });

  describe("truncate", () => {
    it("truncates long strings", () => {
      expect(truncate("Hello World", 5)).toBe("Hello...");
    });

    it("returns short strings unchanged", () => {
      expect(truncate("Hi", 10)).toBe("Hi");
    });
  });

  describe("cn", () => {
    it("merges class names", () => {
      expect(cn("foo", "bar")).toBe("foo bar");
      expect(cn("foo", false && "bar")).toBe("foo");
      expect(cn("foo", undefined, "bar")).toBe("foo bar");
    });
  });
});
