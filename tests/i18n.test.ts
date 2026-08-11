import { t, setLocale, getLocale, formatNumber, formatDate, formatRelativeTime, detectBrowserLocale, getLocaleDir, type Locale } from "../src/i18n/index";

describe("i18n", () => {
  beforeEach(() => {
    setLocale("en");
  });

  describe("setLocale / getLocale", () => {
    it("sets and gets locale", () => {
      setLocale("fr");
      expect(getLocale()).toBe("fr");
      setLocale("en");
      expect(getLocale()).toBe("en");
    });
  });

  describe("t (translate)", () => {
    it("translates known keys", () => {
      expect(t("nav.dashboard")).toBe("Dashboard");
      setLocale("es");
      expect(t("nav.dashboard")).toBe("Panel");
      setLocale("ja");
      expect(t("nav.dashboard")).toBe("ダッシュボード");
    });

    it("falls back to English for missing translations", () => {
      setLocale("ar");
      expect(t("nav.dashboard")).toBe("لوحة القيادة");
    });

    it("returns key for unknown keys", () => {
      expect(t("unknown.key")).toBe("unknown.key");
    });

    it("uses fallback if provided", () => {
      expect(t("unknown.key", "Default text")).toBe("Default text");
    });
  });

  describe("formatNumber", () => {
    it("formats with locale", () => {
      setLocale("en");
      expect(formatNumber(1234567)).toBe("1,234,567");
      setLocale("de");
      expect(formatNumber(1234567)).toBe("1.234.567");
    });
  });

  describe("formatDate", () => {
    it("formats date with locale", () => {
      const date = new Date("2024-06-15");
      setLocale("en");
      const enDate = formatDate(date);
      expect(enDate).toContain("2024");

      setLocale("ja");
      const jaDate = formatDate(date);
      expect(jaDate).toContain("2024");
    });

    it("handles string input", () => {
      const result = formatDate("2024-06-15");
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe("formatRelativeTime", () => {
    it("returns relative time", () => {
      const oneHourAgo = new Date(Date.now() - 3600000);
      const result = formatRelativeTime(oneHourAgo);
      expect(result).toContain("hour");
    });

    it("returns 'just now' for recent times", () => {
      const now = new Date();
      const result = formatRelativeTime(now);
      expect(result).toBe("just now");
    });
  });

  describe("getLocaleDir", () => {
    it("returns ltr for English", () => {
      expect(getLocaleDir("en")).toBe("ltr");
    });

    it("returns rtl for Arabic", () => {
      expect(getLocaleDir("ar")).toBe("rtl");
    });

    it("defaults to ltr for unknown locale", () => {
      expect(getLocaleDir("xx" as Locale)).toBe("ltr");
    });
  });

  describe("detectBrowserLocale", () => {
    it("returns en when no navigator", () => {
      expect(detectBrowserLocale()).toBe("en");
    });
  });
});
