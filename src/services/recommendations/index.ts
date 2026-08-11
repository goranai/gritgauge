/**
 * Recommendation Engine
 * Generates actionable, contextual recommendations based on project metrics and AI analysis
 */
import type { HealthMetrics, TriageResult, PRReviewResult } from "@/types";
import { BENCHMARKS, detectProjectCategory } from "@/services/benchmark";

// ─── Recommendation Types ───

export interface Recommendation {
  id: string;
  category: "health" | "community" | "process" | "security" | "documentation" | "performance";
  priority: "critical" | "high" | "medium" | "low";
  title: string;
  description: string;
  impact: string;
  effort: "small" | "medium" | "large";
  automated: boolean;
  action?: {
    type: string;
    label: string;
    url?: string;
  };
}

// ─── Health-Based Recommendations ───

export function getHealthRecommendations(metrics: HealthMetrics): Recommendation[] {
  const recs: Recommendation[] = [];

  // Stale issue recommendations
  if (metrics.staleIssueRatio > 0.3) {
    recs.push({
      id: "stale-cleanup",
      category: "health",
      priority: "high",
      title: "Clean up stale issues",
      description: `Your stale issue ratio is ${(metrics.staleIssueRatio * 100).toFixed(0)}%. Issues inactive for 30+ days slow down triage and frustrate contributors.`,
      impact: "Reduces triage overhead by 30-40%",
      effort: "medium",
      automated: false,
      action: {
        type: "bulk_close",
        label: "Review Stale Issues",
        url: "/dashboard?tab=issues&filter=stale",
      },
    });
  }

  // Bus factor recommendations
  if (metrics.busFactor < 3) {
    recs.push({
      id: "bus-factor-low",
      category: "community",
      priority: "critical",
      title: "Increase bus factor — onboard more maintainers",
      description: `Bus factor of ${metrics.busFactor} is dangerously low. If key contributors leave, the project could stall.`,
      impact: "Ensures project continuity and reduces single-point-of-failure risk",
      effort: "large",
      automated: false,
      action: {
        type: "invite",
        label: "Invite Contributors",
      },
    });
  }

  // Response time recommendations
  if (metrics.responseTimeAvg > 48) {
    recs.push({
      id: "slow-response",
      category: "process",
      priority: "high",
      title: "Speed up first response time",
      description: `Average response time of ${metrics.responseTimeAvg.toFixed(0)}h is slow. Use AI triage to auto-label and prioritize issues instantly.`,
      impact: "Can reduce first response time from days to minutes",
      effort: "small",
      automated: true,
      action: {
        type: "enable_triage",
        label: "Enable AI Auto-Triage",
        url: "/settings#automation",
      },
    });
  }

  // Low health score
  if (metrics.healthScore < 40) {
    recs.push({
      id: "health-critical",
      category: "health",
      priority: "critical",
      title: "Project health is critical — create an action plan",
      description: "Health score below 40 indicates multiple systemic issues. Consider a focused sprint on project maintenance.",
      impact: "Prevents contributor burnout and project abandonment",
      effort: "large",
      automated: false,
    });
  }

  // Healthy project
  if (metrics.healthScore >= 70) {
    recs.push({
      id: "health-good",
      category: "health",
      priority: "low",
      title: "Project is healthy — consider growth strategies",
      description: "Your project is doing well! Focus on community growth, documentation, and attracting new contributors.",
      impact: "Sustains momentum and prevents decline",
      effort: "medium",
      automated: false,
    });
  }

  return recs;
}

// ─── Triage-Based Recommendations ───

export function getTriageRecommendations(
  triageResults: TriageResult[]
): Recommendation[] {
  const recs: Recommendation[] = [];

  const criticalCount = triageResults.filter((t) => t.priority === "critical").length;
  const highCount = triageResults.filter((t) => t.priority === "high").length;
  const negativeSentiment = triageResults.filter((t) => t.sentiment === "negative").length;
  const duplicates = triageResults.filter((t) => t.isDuplicate).length;

  if (criticalCount > 0) {
    recs.push({
      id: "critical-issues",
      category: "process",
      priority: "critical",
      title: `${criticalCount} critical issues need immediate attention`,
      description: "Critical issues represent bugs that severely impact users. Address these first.",
      impact: "Fixes the most impactful problems for your users",
      effort: "medium",
      automated: false,
      action: { type: "filter", label: "View Critical Issues" },
    });
  }

  if (duplicates > 0) {
    recs.push({
      id: "duplicate-detection",
      category: "process",
      priority: "medium",
      title: `${duplicates} potential duplicate issues detected`,
      description: "Duplicates waste triage time. Consider adding issue templates and a FAQ section.",
      impact: "Reduces duplicate submissions by 25-40%",
      effort: "small",
      automated: false,
    });
  }

  if (negativeSentiment > triageResults.length * 0.3) {
    recs.push({
      id: "negative-sentiment",
      category: "community",
      priority: "medium",
      title: "Higher than normal negative sentiment in issues",
      description: `${((negativeSentiment / triageResults.length) * 100).toFixed(0)}% of issues show frustration. Check for pattern — documentation gaps, slow responses, breaking changes.`,
      impact: "Improves community satisfaction and retention",
      effort: "medium",
      automated: false,
    });
  }

  return recs;
}

// ─── Review-Based Recommendations ───

export function getReviewRecommendations(
  reviewResults: PRReviewResult[]
): Recommendation[] {
  const recs: Recommendation[] = [];

  const highRiskPRs = reviewResults.filter((r) => r.riskLevel === "high");
  const requestChanges = reviewResults.filter((r) => r.recommendation === "request_changes");

  if (highRiskPRs.length > 0) {
    recs.push({
      id: "high-risk-prs",
      category: "security",
      priority: "high",
      title: `${highRiskPRs.length} high-risk PRs need careful review`,
      description: "High-risk PRs may introduce bugs, security issues, or breaking changes. Review thoroughly before merging.",
      impact: "Prevents production incidents",
      effort: "medium",
      automated: false,
    });
  }

  if (requestChanges.length > reviewResults.length * 0.5) {
    recs.push({
      id: "pr-quality",
      category: "process",
      priority: "medium",
      title: "Many PRs require changes — improve contribution guidelines",
      description: "Over 50% of PRs need changes before approval. Better contribution docs and PR templates can reduce this.",
      impact: "Saves reviewer time and reduces contributor frustration",
      effort: "small",
      automated: false,
      action: { type: "docs", label: "Update Contributing Guide" },
    });
  }

  return recs;
}

// ─── Comprehensive Recommendations ───

export function getAllRecommendations(
  metrics: HealthMetrics,
  triageResults: TriageResult[],
  reviewResults: PRReviewResult[],
  language: string | null = null,
  topics: string[] = [],
  description: string | null = null
): Recommendation[] {
  const healthRecs = getHealthRecommendations(metrics);
  const triageRecs = getTriageRecommendations(triageResults);
  const reviewRecs = getReviewRecommendations(reviewResults);

  // Add benchmark-based recommendations
  const category = detectProjectCategory(language, topics, description);
  const benchmark = BENCHMARKS[category] || BENCHMARKS.overall;

  const allRecs = [...healthRecs, ...triageRecs, ...reviewRecs];

  // Sort by priority
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  allRecs.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  // Deduplicate by id
  const seen = new Set<string>();
  return allRecs.filter((r) => {
    if (seen.has(r.id)) return false;
    seen.add(r.id);
    return true;
  });
}

// ─── AI-Powered Recommendation Generator ───

import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generateAIRecommendations(
  projectName: string,
  metrics: HealthMetrics,
  context: string
): Promise<string[]> {
  const prompt = `You are an expert open-source community manager. Based on the following data about "${projectName}", provide 5 actionable, specific recommendations.

Health Score: ${metrics.healthScore}/100
Bus Factor: ${metrics.busFactor}
Response Time: ${metrics.responseTimeAvg}h
Stale Issue Ratio: ${(metrics.staleIssueRatio * 100).toFixed(0)}%
Contributors: ${metrics.contributorCount}
Commits/Week: ${metrics.commitFrequency}

Additional Context: ${context}

Return exactly 5 recommendations as a JSON array of strings. Each should be specific, actionable, and include expected impact.`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 800,
    });

    const content = completion.choices[0]?.message?.content || "[]";
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    return JSON.parse(jsonMatch ? jsonMatch[0] : "[]");
  } catch {
    return [
      "Review and prioritize critical issues in your backlog.",
      "Add documentation for first-time contributors.",
      "Set up automated CI/CD to catch regressions early.",
      "Promote your project on social media to attract contributors.",
      "Regularly review and update dependencies for security.",
    ];
  }
}
