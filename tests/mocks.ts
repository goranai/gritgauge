/**
 * Mock Data Generator
 * Generates realistic test data for development, testing, and demos.
 * Produces repos, issues, PRs, health metrics, contributors, and time-series data.
 */
import type { RepoInfo, Issue, PullRequest, Contributor, HealthMetrics, TriageResult, PRReviewResult, TimeSeriesDataPoint } from "@/types";

// ─── Random Utilities ───

const rand = {
  int: (min: number, max: number): number => Math.floor(Math.random() * (max - min + 1)) + min,
  float: (min: number, max: number, decimals: number = 2): number =>
    parseFloat((Math.random() * (max - min) + min).toFixed(decimals)),
  pick: <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)],
  pickN: <T>(arr: T[], n: number): T[] => {
    const shuffled = [...arr].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, n);
  },
  bool: (probability: number = 0.5): boolean => Math.random() < probability,
  date: (daysAgoMin: number, daysAgoMax: number): string => {
    const days = rand.int(daysAgoMin, daysAgoMax);
    const date = new Date(Date.now() - days * 86400000);
    return date.toISOString();
  },
  id: (): string =>
    `mock_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
  githubUrl: (owner: string, repo: string, type: string, number: number): string =>
    `https://github.com/${owner}/${repo}/${type}/${number}`,
};

// ─── Name Generators ───

const FIRST_NAMES = [
  "Alice", "Bob", "Charlie", "Diana", "Eve", "Frank", "Grace", "Henry",
  "Iris", "Jack", "Kate", "Leo", "Maria", "Nathan", "Olivia", "Paul",
  "Quinn", "Rachel", "Sam", "Tina", "Uma", "Victor", "Wendy", "Xander",
  "Yuki", "Zane", "Aisha", "Ben", "Clara", "Derek",
];

const LAST_NAMES = [
  "Anderson", "Brown", "Chen", "Davis", "Evans", "Foster", "Garcia", "Harris",
  "Ito", "Johnson", "Kim", "Lee", "Martinez", "Nguyen", "O'Connor", "Patel",
  "Quinn", "Rodriguez", "Smith", "Taylor", "Ueda", "Vasquez", "Williams", "Xu",
  "Yamamoto", "Zhang",
];

const COMPANY_NAMES = [
  "TechCorp", "DataFlow", "CloudBase", "NexGen", "QuantumLabs", "AeroSoft",
  "ByteWorks", "CodeCraft", "DevDynamics", "EdgeCompute", "FusionIO", "GridStack",
  "HyperNode", "InfraScale", "JetStream", "KernelOps", "LogicLayer", "MatrixAI",
];

function generateName(): string {
  return `${rand.pick(FIRST_NAMES)} ${rand.pick(LAST_NAMES)}`;
}

function generateUsername(): string {
  const adj = ["cool", "fast", "smart", "brave", "sharp", "quick", "bold", "keen", "witty", "zen"];
  const noun = ["dev", "coder", "hacker", "geek", "ninja", "guru", "wiz", "pro", "ace", "star"];
  return `${rand.pick(adj)}-${rand.pick(noun)}-${rand.int(10, 99)}`;
}

// ─── Repo Names ───

const REPO_PREFIXES = ["awesome", "super", "hyper", "ultra", "mega", "quick", "smart", "easy", "clean", "robust"];
const REPO_SUFFIXES = ["lib", "tool", "kit", "core", "hub", "app", "api", "sdk", "cli", "engine", "service", "utils"];

function generateRepoName(): string {
  return `${rand.pick(REPO_PREFIXES)}-${rand.pick(REPO_SUFFIXES)}`;
}

// ─── Issue Generators ───

const ISSUE_TITLES = [
  "App crashes when clicking submit button",
  "Memory leak in WebSocket connection handler",
  "Dark mode toggle not working on mobile devices",
  "Add CSV export functionality for analytics dashboard",
  "Performance degradation in search query with large datasets",
  "Incorrect error message displayed for invalid email format",
  "Feature request: Add dark mode support",
  "Documentation missing for API authentication endpoint",
  "Race condition in concurrent database writes",
  "TypeError: undefined is not an object in Safari",
  "Update dependencies to latest stable versions",
  "Add pagination to the user management table",
  "Login page redirects to 404 after successful auth",
  "Accessibility: Add ARIA labels to navigation menu",
  "Security: SQL injection vulnerability in user search",
  "i18n: Missing translations for German locale",
  "CI pipeline failing on Node.js 20.x",
  "Add rate limiting to public API endpoints",
  "Refactor authentication middleware for better testability",
  "Implement WebSocket reconnection with exponential backoff",
];

const ISSUE_BODIES = [
  "**Steps to reproduce:**\n1. Go to the settings page\n2. Click on 'Dark Mode' toggle\n3. Observe the crash\n\n**Expected behavior:** Theme should switch without errors.\n\n**Actual behavior:** App crashes with TypeError.",
  "When processing large payloads over WebSocket, memory usage steadily increases. After ~1000 messages, memory reaches 2GB and the connection drops.",
  "Users have requested the ability to export analytics data as CSV for further processing in Excel or Google Sheets. This would be valuable for monthly reporting.",
  "The search query performance degrades significantly when the dataset exceeds 10,000 records. Response time goes from 50ms to 3+ seconds.",
  "**Environment:** Safari 17.4 on macOS Sonoma\n**Error:** `TypeError: undefined is not an object (evaluating 'theme.colors.background')`\n**Stack trace:** ...",
];

function generateIssue(owner: string, repo: string, number: number): Issue {
  const createdAt = rand.date(0, 90);
  const updatedAt = rand.date(0, Math.min(30, Math.floor((Date.now() - new Date(createdAt).getTime()) / 86400000)));
  const labels = rand.pickN(["bug", "enhancement", "documentation", "performance", "security", "good first issue", "help wanted", "blocked"], rand.int(1, 3));

  return {
    number,
    title: rand.pick(ISSUE_TITLES),
    state: rand.bool(0.8) ? "open" : "closed",
    labels,
    assignee: rand.bool(0.3) ? generateUsername() : null,
    assignees: rand.bool(0.3) ? [generateUsername()] : [],
    createdAt,
    updatedAt,
    closedAt: rand.bool(0.2) ? rand.date(0, 30) : null,
    url: rand.githubUrl(owner, repo, "issues", number),
    body: rand.pick(ISSUE_BODIES),
    author: generateUsername(),
    comments: rand.int(0, 25),
    reactions: { total: rand.int(0, 15) },
    milestone: rand.bool(0.3) ? `v${rand.int(1, 5)}.${rand.int(0, 9)}.${rand.int(0, 9)}` : null,
  };
}

export function generateIssues(owner: string, repo: string, count: number = 20): Issue[] {
  return Array.from({ length: count }, (_, i) => generateIssue(owner, repo, i + 1));
}

// ─── PR Generators ───

const PR_TITLES = [
  "Fix: Resolve memory leak in WebSocket handler",
  "Feat: Add CSV export for analytics dashboard",
  "Docs: Update API authentication documentation",
  "Perf: Optimize search query for large datasets",
  "Refactor: Extract authentication middleware",
  "Test: Add unit tests for user service",
  "Chore: Update dependencies to latest versions",
  "Fix: Correct error message for invalid email",
  "Feat: Implement dark mode support",
  "Security: Fix SQL injection in user search",
  "CI: Add Node.js 20.x to test matrix",
  "A11y: Add ARIA labels to navigation components",
];

function generatePR(owner: string, repo: string, number: number): PullRequest {
  const additions = rand.int(10, 2000);
  const deletions = rand.int(0, Math.floor(additions * 0.5));
  const stateRoll = Math.random();
  const state = stateRoll < 0.6 ? "open" : stateRoll < 0.9 ? "merged" : "closed";

  return {
    number,
    title: rand.pick(PR_TITLES),
    state,
    author: generateUsername(),
    createdAt: rand.date(0, 60),
    updatedAt: rand.date(0, 30),
    mergedAt: state === "merged" ? rand.date(0, 15) : null,
    url: rand.githubUrl(owner, repo, "pull", number),
    body: rand.pick(ISSUE_BODIES),
    additions,
    deletions,
    filesChanged: rand.int(1, 30),
    baseBranch: "main",
    headBranch: `feat/${rand.pick(REPO_SUFFIXES)}-${number}`,
    isDraft: rand.bool(0.15),
    reviewComments: rand.int(0, 20),
  };
}

export function generatePRs(owner: string, repo: string, count: number = 15): PullRequest[] {
  return Array.from({ length: count }, (_, i) => generatePR(owner, repo, i + 100));
}

// ─── Contributor Generator ───

export function generateContributors(count: number = 20): Contributor[] {
  return Array.from({ length: count }, () => ({
    login: generateUsername(),
    contributions: rand.int(1, 500),
    avatarUrl: `https://avatars.githubusercontent.com/u/${rand.int(1, 99999)}`,
    type: rand.bool(0.05) ? "Bot" as const : "User" as const,
  }));
}

// ─── Repo Generator ───

const LANGUAGES = ["TypeScript", "JavaScript", "Python", "Rust", "Go", "Java", "Kotlin", "Ruby", "Swift", "C++", "C#", "Zig"];
const TOPICS_POOL = ["web", "api", "cli", "frontend", "backend", "database", "ai", "ml", "devops", "security", "testing", "mobile", "desktop", "embedded", "game-dev"];

export function generateRepoInfo(owner?: string, name?: string): RepoInfo {
  const o = owner || generateUsername();
  const n = name || generateRepoName();
  const createdAt = rand.date(30, 1460);
  const updatedAt = rand.date(0, 30);

  return {
    owner: o,
    name: n,
    fullName: `${o}/${n}`,
    description: `A ${rand.pick(REPO_SUFFIXES)} for ${rand.pick(TOPICS_POOL)} development. ${rand.pick(["Fast", "Simple", "Powerful", "Lightweight", "Scalable"])} and ${rand.pick(["easy to use", "production-ready", "well-documented", "community-driven", "battle-tested"])}.`,
    stars: rand.int(0, 50000),
    forks: rand.int(0, 10000),
    openIssues: rand.int(0, 500),
    openPRs: rand.int(0, 50),
    language: rand.pick(LANGUAGES),
    topics: rand.pickN(TOPICS_POOL, rand.int(3, 7)),
    license: rand.pick(["MIT", "Apache-2.0", "GPL-3.0", "BSD-3-Clause", null]),
    createdAt,
    updatedAt,
    url: `https://github.com/${o}/${n}`,
    homepage: rand.bool(0.3) ? `https://${n}.dev` : null,
    defaultBranch: rand.pick(["main", "master", "develop"]),
    watchers: rand.int(0, 5000),
    size: rand.int(100, 500000),
  };
}

// ─── Health Metrics Generator ───

export function generateHealthMetrics(): HealthMetrics {
  const healthScore = rand.int(25, 95);
  return {
    healthScore,
    busFactor: rand.int(1, 12),
    responseTimeAvg: rand.float(2, 96),
    staleIssueRatio: rand.float(0.02, 0.5),
    prMergeTimeAvg: rand.float(4, 168),
    contributorCount: rand.int(3, 200),
    commitFrequency: rand.int(1, 35),
    trends: {
      issuesTrend: rand.pick(["up", "down", "stable"]),
      prsTrend: rand.pick(["up", "down", "stable"]),
      contributorsTrend: rand.pick(["up", "down", "stable"]),
    },
    details: {
      issueResolutionRate: rand.float(0.3, 0.95),
      prAcceptanceRate: rand.float(0.5, 0.98),
      avgIssueComments: rand.float(1, 8),
      avgPRReviewComments: rand.float(1, 12),
      firstTimeContributorRatio: rand.float(0.05, 0.4),
      documentationScore: rand.int(20, 95),
      ciStatus: rand.pick(["passing", "failing", "unknown"]),
      daysSinceLastCommit: rand.int(0, 30),
      daysSinceLastRelease: rand.int(0, 180),
      contributorRetentionRate: rand.float(0.4, 0.95),
    },
  };
}

// ─── Triage Result Generator ───

export function generateTriageResult(issueNumber: number): TriageResult {
  return {
    issueNumber,
    suggestedLabels: rand.pickN(["bug", "enhancement", "documentation", "performance", "security", "good first issue", "help wanted"], rand.int(1, 3)),
    priority: rand.pick(["critical", "high", "medium", "low"]),
    estimatedEffort: rand.pick(["small", "medium", "large"]),
    suggestedAssignee: rand.bool(0.4) ? generateUsername() : null,
    summary: `This issue appears to be a ${rand.pick(["bug", "feature request", "improvement"])} related to ${rand.pick(["authentication", "performance", "UI", "API", "database"])}. ${rand.pick(["Needs immediate attention.", "Can be scheduled for next sprint.", "Good candidate for community contribution."])}`,
    isDuplicate: rand.bool(0.1),
    duplicateOf: rand.bool(0.1) ? rand.int(1, 100) : null,
    sentiment: rand.pick(["positive", "neutral", "negative"]),
    relatedIssues: rand.bool(0.3) ? rand.pickN([...Array(20)].map((_, i) => i + 1), rand.int(1, 3)) : [],
    suggestedFirstStep: rand.pick([
      "Check the error logs for more details",
      "Reproduce the issue in a test environment",
      "Review the relevant code section",
      "Add input validation to prevent the crash",
      "Create a minimal reproduction case",
    ]),
  };
}

// ─── Time Series Generator ───

export function generateTimeSeries(
  days: number,
  baseValue: number,
  variance: number,
  trend: "up" | "down" | "flat" = "flat"
): TimeSeriesDataPoint[] {
  const data: TimeSeriesDataPoint[] = [];
  let currentValue = baseValue;

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(Date.now() - i * 86400000);
    const dateStr = date.toISOString().split("T")[0];
    const change = (Math.random() - 0.5) * variance;

    if (trend === "up") currentValue += Math.abs(change) * 0.3;
    else if (trend === "down") currentValue -= Math.abs(change) * 0.3;
    else currentValue += change;

    currentValue = Math.max(0, currentValue);
    data.push({ date: dateStr, value: Math.round(currentValue * 100) / 100 });
  }

  return data;
}

// ─── Bulk Generator ───

export interface MockProject {
  repo: RepoInfo;
  issues: Issue[];
  prs: PullRequest[];
  contributors: Contributor[];
  health: HealthMetrics;
  triageResults: TriageResult[];
  starsTimeline: TimeSeriesDataPoint[];
  issuesTimeline: TimeSeriesDataPoint[];
  healthTimeline: TimeSeriesDataPoint[];
}

export function generateMockProject(owner?: string, name?: string): MockProject {
  const repo = generateRepoInfo(owner, name);
  const issues = generateIssues(repo.owner, repo.name, rand.int(5, 30));
  const prs = generatePRs(repo.owner, repo.name, rand.int(3, 15));
  const contributors = generateContributors(rand.int(5, 25));
  const health = generateHealthMetrics();
  const triageResults = issues.map((issue) => generateTriageResult(issue.number));

  const starsTimeline = generateTimeSeries(90, 100, 20, "up");
  const issuesTimeline = generateTimeSeries(90, 50, 15, "flat");
  const healthTimeline = generateTimeSeries(90, 65, 8, "up");

  return {
    repo, issues, prs, contributors, health, triageResults,
    starsTimeline, issuesTimeline, healthTimeline,
  };
}

export function generateMockProjects(count: number = 5): MockProject[] {
  return Array.from({ length: count }, (_, i) =>
    generateMockProject(COMPANY_NAMES[i % COMPANY_NAMES.length].toLowerCase(), generateRepoName())
  );
}

// ─── Review Result Generator ───

export function generateReviewResult(prNumber: number): PRReviewResult {
  const riskLevel = rand.pick(["low", "medium", "high"]);
  const recommendation = riskLevel === "high" ? rand.pick(["request_changes", "comment"]) : riskLevel === "medium" ? rand.pick(["comment", "approve"]) : "approve";

  return {
    prNumber,
    summary: `This PR ${rand.pick(["adds", "fixes", "improves", "refactors", "updates"])} ${rand.pick(["the authentication flow", "database queries", "UI components", "API endpoints", "error handling", "test coverage", "documentation"])}. Overall quality is ${rand.pick(["good", "acceptable", "needs improvement"])}.`,
    riskLevel,
    suggestedReviewers: rand.pickN(["backend-reviewer", "frontend-reviewer", "security-reviewer", "devops-reviewer"], rand.int(1, 3)),
    keyChanges: rand.pickN([
      "Added new middleware for request validation",
      "Refactored database connection pooling",
      "Updated component props interface",
      "Added error boundary wrapper",
      "Improved test coverage for edge cases",
      "Fixed race condition in async handler",
      "Added input sanitization",
      "Updated dependency versions",
    ], rand.int(2, 5)),
    potentialIssues: riskLevel !== "low" ? rand.pickN([
      "Missing error handling for network failures",
      "No test coverage for the new functionality",
      "Potential memory leak in recursive function",
      "Hardcoded configuration values",
      "Missing input validation on user-provided data",
      "Inconsistent error message format",
    ], rand.int(0, 3)) : [],
    testCoverageNote: rand.pick([
      "Adequate test coverage for the changes",
      "Tests cover the main happy paths",
      "Consider adding integration tests",
      "Test coverage could be improved",
    ]),
    recommendation,
    codeQualityScore: rand.int(40, 95),
    securityFlags: riskLevel === "high" ? [{
      severity: rand.pick(["high", "medium"]),
      type: rand.pick(["sql-injection", "xss", "csrf", "insecure-crypto", "hardcoded-secret"]),
      file: `src/${rand.pick(["auth", "api", "utils", "services"])}/${rand.pick(["handler", "middleware", "helper", "service"])}.ts`,
      line: rand.int(10, 500),
      description: "Potential security vulnerability detected in the code changes",
      suggestion: "Use parameterized queries and validate all user inputs",
      cwe: rand.pick(["CWE-89", "CWE-79", "CWE-352", null]),
    }] : [],
  };
}
