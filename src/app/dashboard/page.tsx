"use client";

import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import RepoInput from "@/components/RepoInput";
import HealthMetricsPanel from "@/components/HealthMetricsPanel";
import IssueTriagePanel from "@/components/IssueTriagePanel";
import PRReviewPanel from "@/components/PRReviewPanel";
import type { RepoInfo, Issue, PullRequest, HealthMetrics } from "@/types";
import {
  Star,
  GitFork,
  AlertCircle,
  GitPullRequest,
  Activity,
  Code2,
  ExternalLink,
  Loader2,
  Sparkles,
  Copy,
  Check,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

type Tab = "overview" | "issues" | "prs" | "health";

export default function DashboardPage() {
  const [repoUrl, setRepoUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [repo, setRepo] = useState<RepoInfo | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [prs, setPRs] = useState<PullRequest[]>([]);
  const [contributors, setContributors] = useState<
    { login: string; contributions: number }[]
  >([]);
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [copied, setCopied] = useState(false);

  const handleAnalyze = async (owner: string, name: string) => {
    setLoading(true);
    setError("");
    setRepo(null);
    setIssues([]);
    setPRs([]);
    setContributors([]);
    setRepoUrl(`${owner}/${name}`);

    try {
      const res = await fetch(
        `/api/github?repo=${encodeURIComponent(`${owner}/${name}`)}`
      );
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch repo data");
      }

      setRepo(data.repo);
      setIssues(data.issues);
      setPRs(data.pullRequests);
      setContributors(data.contributors);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const copyBadge = () => {
    const badge = `[![GritGauge](https://img.shields.io/badge/GritGauge-monitored-brightgreen)](https://gritgauge.dev)`;
    navigator.clipboard.writeText(badge);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Compute health metrics
  const computeHealth = (): HealthMetrics => {
    if (!repo) {
      return {
        busFactor: 0,
        responseTimeAvg: 0,
        staleIssueRatio: 0,
        prMergeTimeAvg: 0,
        contributorCount: 0,
        commitFrequency: 0,
        healthScore: 0,
        trends: {
          issuesTrend: "stable",
          prsTrend: "stable",
          contributorsTrend: "stable",
        },
      };
    }

    const now = Date.now();
    const staleIssues = issues.filter(
      (i) => now - new Date(i.updatedAt).getTime() > 30 * 86400000
    );
    const staleRatio = issues.length > 0 ? staleIssues.length / issues.length : 0;
    const busFactor = Math.min(contributors.filter((c) => c.contributions > 10).length, 10);
    const contributorCount = contributors.length;

    // Health score calculation (0-100)
    let score = 50;
    if (busFactor >= 3) score += 15;
    if (staleRatio < 0.2) score += 15;
    if (contributorCount >= 5) score += 10;
    if (repo.stars > 100) score += 10;
    if (issues.length < 50) score += 10;
    score = Math.min(100, Math.max(0, score));

    return {
      busFactor,
      responseTimeAvg: Math.random() * 48, // placeholder — needs real data
      staleIssueRatio: staleRatio,
      prMergeTimeAvg: Math.random() * 72, // placeholder
      contributorCount,
      commitFrequency: Math.floor(Math.random() * 15) + 3, // placeholder
      healthScore: score,
      trends: {
        issuesTrend: staleRatio > 0.3 ? "up" : "stable",
        prsTrend: prs.length > 10 ? "up" : "stable",
        contributorsTrend: "stable",
      },
    };
  };

  const health = computeHealth();
  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: "overview", label: "Overview" },
    { key: "issues", label: "Issues", count: issues.length },
    { key: "prs", label: "Pull Requests", count: prs.length },
    { key: "health", label: "Health" },
  ];

  return (
    <>
      <Header />
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Search Section */}
          <section className="mb-8">
            <div className="flex flex-col items-center text-center">
              <h1 className="text-3xl font-bold text-white mb-2">
                Repository Dashboard
              </h1>
              <p className="text-surface-400 mb-6">
                Analyze any public GitHub repository instantly
              </p>
              <RepoInput onAnalyze={handleAnalyze} loading={loading} />
            </div>
          </section>

          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <Loader2 className="w-10 h-10 text-brand-400 animate-spin mx-auto mb-4" />
                <p className="text-surface-400">Fetching repository data...</p>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="card border-red-500/20 bg-red-500/5 text-center py-8">
              <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
              <p className="text-red-300">{error}</p>
              <p className="text-surface-500 text-sm mt-1">
                Make sure the repo is public and exists on GitHub.
              </p>
            </div>
          )}

          {/* Dashboard Content */}
          {repo && !loading && (
            <div className="animate-fade-in space-y-6">
              {/* Repo Header */}
              <div className="card">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-surface-700 to-surface-800 rounded-xl flex items-center justify-center">
                      <Code2 className="w-6 h-6 text-brand-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl font-bold text-white">
                          {repo.fullName}
                        </h2>
                        <a
                          href={repo.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-surface-400 hover:text-white"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>
                      <p className="text-surface-400 text-sm mt-0.5">
                        {repo.description || "No description"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <button
                      onClick={copyBadge}
                      className="btn-secondary text-sm flex items-center gap-2"
                    >
                      {copied ? (
                        <>
                          <Check className="w-4 h-4 text-green-400" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          Copy Badge
                        </>
                      )}
                    </button>
                    <Sparkles className="w-5 h-5 text-brand-400" />
                    <span className="text-sm text-brand-300 font-medium">
                      AI Monitoring Active
                    </span>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-surface-800">
                  <div className="flex items-center gap-2">
                    <Star className="w-5 h-5 text-yellow-400" />
                    <div>
                      <div className="text-lg font-bold text-white">
                        {repo.stars.toLocaleString()}
                      </div>
                      <div className="text-xs text-surface-400">Stars</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <GitFork className="w-5 h-5 text-blue-400" />
                    <div>
                      <div className="text-lg font-bold text-white">
                        {repo.forks.toLocaleString()}
                      </div>
                      <div className="text-xs text-surface-400">Forks</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-orange-400" />
                    <div>
                      <div className="text-lg font-bold text-white">
                        {issues.length}
                      </div>
                      <div className="text-xs text-surface-400">Open Issues</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <GitPullRequest className="w-5 h-5 text-purple-400" />
                    <div>
                      <div className="text-lg font-bold text-white">
                        {prs.length}
                      </div>
                      <div className="text-xs text-surface-400">Open PRs</div>
                    </div>
                  </div>
                </div>

                {/* Meta */}
                <div className="flex flex-wrap gap-3 mt-4 text-xs text-surface-500">
                  <span>Language: {repo.language || "N/A"}</span>
                  <span>·</span>
                  <span>Created: {formatDate(repo.createdAt)}</span>
                  <span>·</span>
                  <span>Updated: {formatDate(repo.updatedAt)}</span>
                  {repo.topics.length > 0 && (
                    <>
                      <span>·</span>
                      <span className="flex gap-1.5 flex-wrap">
                        {repo.topics.map((t) => (
                          <span
                            key={t}
                            className="badge bg-surface-800 text-surface-400 border-surface-700"
                          >
                            {t}
                          </span>
                        ))}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Tabs */}
              <div className="flex gap-2 border-b border-surface-800">
                {tabs.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === tab.key
                        ? "border-brand-500 text-white"
                        : "border-transparent text-surface-400 hover:text-surface-200"
                    }`}
                  >
                    {tab.label}
                    {tab.count !== undefined && (
                      <span className="ml-1.5 text-surface-500">({tab.count})</span>
                    )}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              {activeTab === "overview" && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="card">
                    <h3 className="text-lg font-semibold text-white mb-4">
                      Recent Issues
                    </h3>
                    {issues.slice(0, 5).map((issue) => (
                      <a
                        key={issue.number}
                        href={issue.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block py-2 border-b border-surface-800 last:border-0 hover:bg-surface-800/30 px-2 -mx-2 rounded transition-colors"
                      >
                        <span className="text-sm text-white">
                          {issue.title}
                        </span>
                        <span className="text-xs text-surface-500 ml-2">
                          #{issue.number}
                        </span>
                      </a>
                    ))}
                    {issues.length === 0 && (
                      <p className="text-surface-500 text-sm py-4">
                        No open issues! 🎉
                      </p>
                    )}
                  </div>

                  <div className="card">
                    <h3 className="text-lg font-semibold text-white mb-4">
                      Top Contributors
                    </h3>
                    {contributors.slice(0, 8).map((c, i) => (
                      <div
                        key={c.login}
                        className="flex items-center justify-between py-2 border-b border-surface-800 last:border-0"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-surface-500 w-5">
                            #{i + 1}
                          </span>
                          <span className="text-sm text-white">{c.login}</span>
                        </div>
                        <span className="text-sm text-brand-400 font-medium">
                          {c.contributions}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === "issues" && <IssueTriagePanel issues={issues} />}
              {activeTab === "prs" && <PRReviewPanel prs={prs} />}
              {activeTab === "health" && <HealthMetricsPanel metrics={health} />}
            </div>
          )}

          {/* Empty state */}
          {!repo && !loading && !error && (
            <div className="text-center py-20">
              <Activity className="w-16 h-16 text-surface-700 mx-auto mb-4" />
              <p className="text-surface-500 text-lg">
                Enter a GitHub repository above to get started
              </p>
              <p className="text-surface-600 text-sm mt-1">
                Try: facebook/react, vercel/next.js, tiangolo/fastapi
              </p>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
