import {
  generateCSV, generateJSON, generateMarkdownReport,
  generateHTMLReport, generateHealthReport, saveExportToFile,
} from "../src/services/export/index";

describe("Export Service", () => {
  describe("generateCSV", () => {
    it("generates CSV from data array", () => {
      const data = [
        { name: "Alice", score: 95 },
        { name: "Bob", score: 87 },
      ];
      const csv = generateCSV(data);
      expect(csv).toContain("name,score");
      expect(csv).toContain("Alice,95");
      expect(csv).toContain("Bob,87");
    });

    it("handles commas in values", () => {
      const data = [{ description: "Hello, World", value: 1 }];
      const csv = generateCSV(data);
      expect(csv).toContain('"Hello, World"');
    });

    it("handles empty array", () => {
      expect(generateCSV([])).toBe("");
    });

    it("uses provided columns", () => {
      const data = [{ a: 1, b: 2, c: 3 }];
      const csv = generateCSV(data, ["a", "c"]);
      expect(csv).toContain("a,c");
      expect(csv).not.toContain("b");
    });
  });

  describe("generateJSON", () => {
    it("generates pretty JSON", () => {
      const json = generateJSON({ test: true, items: [1, 2, 3] });
      expect(json).toContain('"test"');
      expect(json).toContain("true");
      expect(json).toContain("\n"); // Pretty print has newlines
    });

    it("generates compact JSON", () => {
      const json = generateJSON({ test: true }, false);
      expect(json).not.toContain("\n");
    });
  });

  describe("generateMarkdownReport", () => {
    it("generates markdown with sections and tables", () => {
      const md = generateMarkdownReport("Test Report", [
        { heading: "Section 1", content: "Hello world" },
        {
          heading: "Section 2",
          content: "With table",
          table: { headers: ["Col1", "Col2"], rows: [["a", "b"], ["c", "d"]] },
        },
      ]);

      expect(md).toContain("# Test Report");
      expect(md).toContain("## Section 1");
      expect(md).toContain("Hello world");
      expect(md).toContain("| Col1 | Col2 |");
      expect(md).toContain("| a | b |");
    });
  });

  describe("generateHTMLReport", () => {
    it("generates valid HTML", () => {
      const html = generateHTMLReport("Test", [
        { heading: "Section", content: "<p>Test</p>" },
      ]);
      expect(html).toContain("<!DOCTYPE html>");
      expect(html).toContain("<title>Test</title>");
      expect(html).toContain("<h2>Section</h2>");
      expect(html).toContain("<p>Test</p>");
    });
  });

  describe("saveExportToFile", () => {
    it("generates data URL for CSV", async () => {
      const url = await saveExportToFile("a,b\n1,2", "test", "csv");
      expect(url).toContain("data:text/csv;base64,");
    });

    it("generates data URL for JSON", async () => {
      const url = await saveExportToFile('{"a":1}', "test", "json");
      expect(url).toContain("data:application/json;base64,");
    });
  });
});
