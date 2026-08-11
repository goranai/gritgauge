/**
 * Code Quality Analysis Service
 * Evaluates codebase health: documentation quality, test coverage patterns,
 * dependency freshness, code complexity indicators
 */
import OpenAI from "openai";
import prisma from "@/lib/prisma";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ─── Quality Metrics ───

export interface CodeQualityMetrics {
  overallScore: number; // 0-100
  breakdown: {
    documentation: number;
    testing: number;
    dependencies: number;
    structure: number;
    consistency: number;
    security: number;
    performance: number;
  };
  findings: CodeQualityFinding[];
  suggestions: string[];
  technicalDebtEstimate: string; // e.g., "2-3 weeks"
}

export interface CodeQualityFinding {
  category: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  file: string | null;
  line: number | null;
  message: string;
  suggestion: string;
  rule: string;
}

// ─── Analyze Repository Structure ───

export async function analyzeRepoStructure(
  repoName: string,
  fileList: string[]
): Promise<{
  documentationScore: number;
  structureScore: number;
  consistencyScore: number;
  findings: CodeQualityFinding[];
}> {
  const findings: CodeQualityFinding[] = [];
  let docScore = 50;
  let structureScore = 50;
  let consistencyScore = 50;

  // Check for key documentation files
  const hasReadme = fileList.some((f) => f.match(/^README\.(md|txt|rst)$/i));
  const hasContributing = fileList.some((f) => f.match(/^CONTRIBUTING\.(md|txt)$/i));
  const hasLicense = fileList.some((f) => f.match(/^LICENSE$/i));
  const hasChangelog = fileList.some((f) => f.match(/^CHANGELOG/i));
  const hasCodeOfConduct = fileList.some((f) => f.match(/^CODE.?OF.?CONDUCT/i));

  if (hasReadme) docScore += 10;
  else findings.push({
    category: "documentation", severity: "high", file: null, line: null,
    message: "Missing README.md — essential for project discovery",
    suggestion: "Add a README describing the project, setup, and usage",
    rule: "doc-readme-required",
  });

  if (hasContributing) docScore += 10;
  else findings.push({
    category: "documentation", severity: "medium", file: null, line: null,
    message: "Missing CONTRIBUTING.md — new contributors don't know how to help",
    suggestion: "Add contribution guidelines with setup steps, code style, and PR process",
    rule: "doc-contributing-recommended",
  });

  if (hasLicense) docScore += 10;
  else findings.push({
    category: "documentation", severity: "high", file: null, line: null,
    message: "Missing LICENSE — without a license, others cannot legally use your code",
    suggestion: "Add an MIT, Apache 2.0, or GPL license file",
    rule: "doc-license-required",
  });

  if (hasChangelog) docScore += 10;
  if (hasCodeOfConduct) docScore += 10;

  // Check structure
  const hasTests = fileList.some((f) => f.includes("test") || f.includes("spec") || f.includes("__tests__"));
  const hasSrc = fileList.some((f) => f.startsWith("src/"));
  const hasConfig = fileList.some((f) => f.match(/\.(json|yaml|yml|toml|config\.(js|ts))$/));

  if (hasTests) structureScore += 15;
  else findings.push({
    category: "testing", severity: "high", file: null, line: null,
    message: "No test files detected — untested code is risky",
    suggestion: "Add unit tests with Jest, Vitest, or pytest",
    rule: "test-files-missing",
  });

  if (hasSrc) structureScore += 15;
  if (hasConfig) structureScore += 10;

  // Check for common anti-patterns
  const hasNodeModules = fileList.some((f) => f.includes("node_modules/"));
  if (hasNodeModules) {
    findings.push({
      category: "structure", severity: "info", file: null, line: null,
      message: "node_modules found in tracked files — should be in .gitignore",
      suggestion: "Add node_modules/ to .gitignore",
      rule: "gitignore-node-modules",
    });
  }

  const hasEnvFiles = fileList.some((f) => f.match(/\.env$/));
  if (hasEnvFiles) {
    findings.push({
      category: "security", severity: "critical", file: null, line: null,
      message: ".env file tracked in git — may contain secrets",
      suggestion: "Add .env to .gitignore and use .env.example instead",
      rule: "security-env-committed",
    });
  }

  // Consistency: check for mixed file naming conventions
  const camelCaseFiles = fileList.filter((f) => /[a-z][A-Z]/.test(f.split("/").pop() || ""));
  const kebabCaseFiles = fileList.filter((f) => /[a-z]-[a-z]/.test(f.split("/").pop() || ""));
  const snakeCaseFiles = fileList.filter((f) => /[a-z]_[a-z]/.test(f.split("/").pop() || ""));

  if (camelCaseFiles.length > 0 && kebabCaseFiles.length > 0) {
    consistencyScore -= 5;
    findings.push({
      category: "consistency", severity: "low", file: null, line: null,
      message: "Mixed file naming conventions detected (camelCase + kebab-case)",
      suggestion: "Choose one naming convention and apply consistently",
      rule: "naming-consistency",
    });
  }

  return {
    documentationScore: Math.min(100, docScore),
    structureScore: Math.min(100, structureScore),
    consistencyScore: Math.min(100, consistencyScore),
    findings,
  };
}

// ─── Analyze Dependencies ───

export interface DependencyAnalysis {
  score: number;
  totalDeps: number;
  outdatedDeps: number;
  vulnerableDeps: number;
  deprecatedDeps: number;
  directDeps: number;
  devDeps: number;
  heaviestDeps: { name: string; size: string }[];
  recommendations: string[];
}

export function analyzeDependencies(
  dependencies: { name: string; version: string; type: "dependency" | "devDependency" }[]
): DependencyAnalysis {
  const directDeps = dependencies.filter((d) => d.type === "dependency");
  const devDeps = dependencies.filter((d) => d.type === "devDependency");

  // Heuristic checks based on version patterns
  const recommendations: string[] = [];

  if (dependencies.length > 100) {
    recommendations.push("Large dependency count — audit for unused packages");
  }

  if (directDeps.length > 50) {
    recommendations.push("Many direct dependencies — consider consolidating");
  }

  const hasOutdatedPattern = dependencies.some((d) => d.version.startsWith("^0."));
  if (hasOutdatedPattern) {
    recommendations.push("Some packages are pre-1.0 — monitor for breaking changes");
  }

  return {
    score: Math.max(0, 80 - Math.floor(dependencies.length / 10)),
    totalDeps: dependencies.length,
    outdatedDeps: 0, // Would need npm audit / cargo audit
    vulnerableDeps: 0,
    deprecatedDeps: 0,
    directDeps: directDeps.length,
    devDeps: devDeps.length,
    heaviestDeps: [],
    recommendations,
  };
}

// ─── AI-Powered Code Review ───

export async function aiCodeQualityReview(
  repoName: string,
  fileContents: { path: string; content: string; language: string }[],
  maxFiles: number = 10
): Promise<{ score: number; findings: CodeQualityFinding[]; summary: string }> {
  const filesToAnalyze = fileContents.slice(0, maxFiles);
  const fileSummaries = filesToAnalyze
    .map((f) => `File: ${f.path} (${f.language})\n\`\`\`\n${f.content.slice(0, 500)}\n\`\`\``)
    .join("\n\n");

  const prompt = `You are a senior code reviewer. Analyze these files from "${repoName}" for code quality issues.

${fileSummaries}

Identify:
1. Code smells and anti-patterns
2. Potential bugs
3. Performance issues
4. Security concerns
5. Readability/maintainability issues
6. Missing error handling
7. Hardcoded values that should be configurable
8. Overly complex functions

Return JSON:
{
  "score": number (0-100),
  "findings": [
    {
      "category": "bug|performance|security|readability|maintainability|best-practice",
      "severity": "critical|high|medium|low|info",
      "file": "filename",
      "line": number|null,
      "message": "description",
      "suggestion": "how to fix",
      "rule": "rule-name"
    }
  ],
  "summary": "2-3 sentence overall assessment"
}
Only return valid JSON.`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 2000,
    });

    const content = completion.choices[0]?.message?.content || "{}";
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    return JSON.parse(jsonMatch ? jsonMatch[0] : "{}");
  } catch {
    return {
      score: 50,
      findings: [],
      summary: "AI code quality analysis unavailable. Manual review recommended.",
    };
  }
}

// ─── Full Quality Assessment ───

export async function fullCodeQualityAssessment(
  repoName: string,
  fileList: string[],
  dependencies: { name: string; version: string; type: "dependency" | "devDependency" }[],
  sampleFiles: { path: string; content: string; language: string }[]
): Promise<CodeQualityMetrics> {
  const structure = await analyzeRepoStructure(repoName, fileList);
  const depAnalysis = analyzeDependencies(dependencies);
  const aiReview = await aiCodeQualityReview(repoName, sampleFiles);

  const overallScore = Math.round(
    (structure.documentationScore * 0.15 +
      structure.structureScore * 0.15 +
      structure.consistencyScore * 0.1 +
      depAnalysis.score * 0.2 +
      aiReview.score * 0.3 +
      50 * 0.1) // base score
  );

  return {
    overallScore: Math.min(100, overallScore),
    breakdown: {
      documentation: structure.documentationScore,
      testing: structure.structureScore,
      dependencies: depAnalysis.score,
      structure: structure.structureScore,
      consistency: structure.consistencyScore,
      security: 60, // Would need dedicated security scan
      performance: 55, // Would need profiling
    },
    findings: [
      ...structure.findings,
      ...aiReview.findings.map((f) => ({ ...f, file: f.file || null })),
    ],
    suggestions: [
      ...depAnalysis.recommendations,
      aiReview.summary,
    ],
    technicalDebtEstimate: overallScore > 70 ? "1-2 weeks" : overallScore > 50 ? "2-4 weeks" : "1-3 months",
  };
}
