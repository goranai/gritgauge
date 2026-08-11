// ─── Expanded Types for GritGauge v2 ───

// GitHub Types
export interface RepoInfo {
  owner: string;
  name: string;
  fullName: string;
  description: string | null;
  stars: number;
  forks: number;
  openIssues: number;
  openPRs: number;
  language: string | null;
  topics: string[];
  license: string | null;
  createdAt: string;
  updatedAt: string;
  url: string;
  homepage: string | null;
  defaultBranch: string;
  watchers: number;
  size: number;
}

export interface Issue {
  number: number;
  title: string;
  state: "open" | "closed";
  labels: string[];
  assignee: string | null;
  assignees: string[];
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  url: string;
  body: string | null;
  author: string;
  comments: number;
  reactions: { total: number };
  milestone: string | null;
}

export interface PullRequest {
  number: number;
  title: string;
  state: "open" | "closed" | "merged";
  author: string;
  createdAt: string;
  updatedAt: string;
  mergedAt: string | null;
  url: string;
  body: string | null;
  additions: number;
  deletions: number;
  filesChanged: number;
  baseBranch: string;
  headBranch: string;
  isDraft: boolean;
  reviewComments: number;
}

export interface Contributor {
  login: string;
  contributions: number;
  avatarUrl: string;
  type: "User" | "Bot";
}

export interface CommitActivity {
  week: number;
  days: number[];
  total: number;
}

export interface Release {
  tag: string;
  name: string;
  body: string | null;
  createdAt: string;
  publishedAt: string;
  isPrerelease: boolean;
  url: string;
}

// ─── AI Triage Types ───
export interface TriageResult {
  issueNumber: number;
  suggestedLabels: string[];
  priority: "critical" | "high" | "medium" | "low";
  estimatedEffort: "small" | "medium" | "large";
  suggestedAssignee: string | null;
  summary: string;
  isDuplicate: boolean;
  duplicateOf: number | null;
  sentiment: "positive" | "neutral" | "negative";
  relatedIssues: number[];
  suggestedFirstStep: string;
}

export interface BatchTriageResult {
  repoFullName: string;
  triagedCount: number;
  results: TriageResult[];
  summary: {
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
    duplicatesFound: number;
    avgTokensPerIssue: number;
  };
}

export interface PRReviewResult {
  prNumber: number;
  summary: string;
  riskLevel: "low" | "medium" | "high";
  suggestedReviewers: string[];
  keyChanges: string[];
  potentialIssues: string[];
  testCoverageNote: string;
  recommendation: "approve" | "request_changes" | "comment";
  codeQualityScore: number;
  securityFlags: SecurityFlag[];
}

export interface SecurityFlag {
  severity: "critical" | "high" | "medium" | "low";
  type: string;
  file: string;
  line: number | null;
  description: string;
  suggestion: string;
  cwe: string | null;
}

// ─── Security Scan Types ───
export interface SecurityScanResult {
  scanId: string;
  repoFullName: string;
  scanType: "pr" | "dependency" | "code" | "full";
  riskScore: number;
  vulnerabilities: Vulnerability[];
  dependencyIssues: DependencyIssue[];
  codeIssues: CodeIssue[];
  summary: string;
  scannedAt: string;
}

export interface Vulnerability {
  id: string;
  severity: "critical" | "high" | "medium" | "low";
  package: string;
  version: string;
  fixedVersion: string | null;
  title: string;
  description: string;
  cve: string | null;
  cvss: number | null;
}

export interface DependencyIssue {
  package: string;
  currentVersion: string;
  latestVersion: string;
  isDeprecated: boolean;
  hasVulnerabilities: boolean;
  license: string | null;
  riskLevel: "high" | "medium" | "low";
}

export interface CodeIssue {
  file: string;
  line: number;
  severity: "critical" | "high" | "medium" | "low";
  rule: string;
  message: string;
  suggestion: string;
}

// ─── Health Metrics Types ───
export interface HealthMetrics {
  busFactor: number;
  responseTimeAvg: number;
  staleIssueRatio: number;
  prMergeTimeAvg: number;
  contributorCount: number;
  commitFrequency: number;
  healthScore: number;
  trends: {
    issuesTrend: "up" | "down" | "stable";
    prsTrend: "up" | "down" | "stable";
    contributorsTrend: "up" | "down" | "stable";
  };
  details: HealthDetails;
}

export interface HealthDetails {
  issueResolutionRate: number;
  prAcceptanceRate: number;
  avgIssueComments: number;
  avgPRReviewComments: number;
  firstTimeContributorRatio: number;
  documentationScore: number;
  ciStatus: "passing" | "failing" | "unknown";
  daysSinceLastCommit: number;
  daysSinceLastRelease: number;
  contributorRetentionRate: number;
}

// ─── Comparison Types ───
export interface RepoComparison {
  repos: {
    fullName: string;
    stars: number;
    forks: number;
    openIssues: number;
    healthScore: number;
    busFactor: number;
    responseTime: number;
    contributorCount: number;
  }[];
  comparison: {
    mostPopular: string;
    healthiest: string;
    mostActive: string;
    bestResponseTime: string;
  };
}

// ─── Changelog Types ───
export interface ChangelogEntry {
  version: string;
  date: string;
  sections: {
    title: string;
    items: string[];
  }[];
}

// ─── Notification Types ───
export interface NotificationPayload {
  type: "triage_complete" | "review_ready" | "health_alert" | "security_alert";
  title: string;
  body: string;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
}

// ─── Export Types ───
export interface ExportOptions {
  format: "pdf" | "csv" | "json" | "markdown";
  repoFullName: string;
  dateRange?: { start: string; end: string };
  sections: ("health" | "issues" | "prs" | "security" | "contributors")[];
  includeCharts: boolean;
}

// ─── Settings Types ───
export interface UserPreferences {
  theme: "light" | "dark" | "system";
  defaultPage: string;
  emailNotifications: boolean;
  slackWebhookUrl: string | null;
  discordWebhookUrl: string | null;
  triageAutoLabel: boolean;
  reviewAutoApprove: boolean;
  maxDailyApiCalls: number;
  monitoredRepos: string[];
  alertThresholds: {
    healthScoreMin: number;
    staleIssueRatioMax: number;
    responseTimeMaxHours: number;
    securityRiskMin: number;
  };
}

// ─── Time Series Types ───
export interface TimeSeriesDataPoint {
  date: string;
  value: number;
}

export interface RepoTimeSeries {
  repoFullName: string;
  starsOverTime: TimeSeriesDataPoint[];
  issuesOverTime: TimeSeriesDataPoint[];
  prsOverTime: TimeSeriesDataPoint[];
  healthScoreOverTime: TimeSeriesDataPoint[];
}
