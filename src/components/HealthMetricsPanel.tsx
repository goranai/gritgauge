"use client";

import type { HealthMetrics } from "@/types";
import {
  Activity,
  Users,
  Clock,
  GitPullRequest,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  metrics: HealthMetrics;
}

function TrendIcon({ trend }: { trend: "up" | "down" | "stable" }) {
  if (trend === "up")
    return <TrendingUp className="w-4 h-4 text-green-400" />;
  if (trend === "down")
    return <TrendingDown className="w-4 h-4 text-red-400" />;
  return <Minus className="w-4 h-4 text-surface-400" />;
}

export default function HealthMetricsPanel({ metrics }: Props) {
  const scoreColor =
    metrics.healthScore >= 70
      ? "text-green-400"
      : metrics.healthScore >= 40
      ? "text-yellow-400"
      : "text-red-400";

  const scoreBg =
    metrics.healthScore >= 70
      ? "bg-green-400/10 border-green-400/30"
      : metrics.healthScore >= 40
      ? "bg-yellow-400/10 border-yellow-400/30"
      : "bg-red-400/10 border-red-400/30";

  return (
    <div className="space-y-6">
      {/* Health Score */}
      <div
        className={cn(
          "card flex items-center justify-between border",
          scoreBg
        )}
      >
        <div>
          <h3 className="text-lg font-semibold text-white">Project Health Score</h3>
          <p className="text-surface-400 text-sm mt-1">
            Based on bus factor, response time, stale items, and contributor activity
          </p>
        </div>
        <div className={cn("text-5xl font-extrabold", scoreColor)}>
          {metrics.healthScore}
          <span className="text-lg font-normal text-surface-500">/100</span>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Bus Factor */}
        <div className="stat-card">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-brand-400" />
            <span className="stat-label">Bus Factor</span>
          </div>
          <div className="stat-value">{metrics.busFactor}</div>
          <p className="text-surface-500 text-xs">Core contributors</p>
        </div>

        {/* Response Time */}
        <div className="stat-card">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-400" />
            <span className="stat-label">Avg Response Time</span>
          </div>
          <div className="stat-value">
            {metrics.responseTimeAvg.toFixed(1)}
            <span className="text-lg text-surface-400">h</span>
          </div>
          <p className="text-surface-500 text-xs">Issue first response</p>
        </div>

        {/* PR Merge Time */}
        <div className="stat-card">
          <div className="flex items-center gap-2">
            <GitPullRequest className="w-5 h-5 text-purple-400" />
            <span className="stat-label">PR Merge Time</span>
          </div>
          <div className="stat-value">
            {metrics.prMergeTimeAvg.toFixed(1)}
            <span className="text-lg text-surface-400">h</span>
          </div>
          <p className="text-surface-500 text-xs">Average time to merge</p>
        </div>

        {/* Stale Issue Ratio */}
        <div className="stat-card">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-400" />
            <span className="stat-label">Stale Issue Ratio</span>
          </div>
          <div className="stat-value">
            {(metrics.staleIssueRatio * 100).toFixed(1)}
            <span className="text-lg text-surface-400">%</span>
          </div>
          <p className="text-surface-500 text-xs">Issues inactive &gt;30 days</p>
        </div>

        {/* Contributors */}
        <div className="stat-card">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-cyan-400" />
            <span className="stat-label">Active Contributors</span>
          </div>
          <div className="stat-value">{metrics.contributorCount}</div>
          <p className="text-surface-500 text-xs">Last 30 days</p>
        </div>

        {/* Commit Frequency */}
        <div className="stat-card">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-pink-400" />
            <span className="stat-label">Commits / Week</span>
          </div>
          <div className="stat-value">{metrics.commitFrequency}</div>
          <p className="text-surface-500 text-xs">Rolling average</p>
        </div>
      </div>

      {/* Trends */}
      <div className="card">
        <h3 className="font-semibold text-white mb-4">Activity Trends</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="flex items-center gap-2">
            <TrendIcon trend={metrics.trends.issuesTrend} />
            <span className="text-sm text-surface-300">Issues</span>
            <span className="text-xs text-surface-500 capitalize">
              {metrics.trends.issuesTrend}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <TrendIcon trend={metrics.trends.prsTrend} />
            <span className="text-sm text-surface-300">Pull Requests</span>
            <span className="text-xs text-surface-500 capitalize">
              {metrics.trends.prsTrend}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <TrendIcon trend={metrics.trends.contributorsTrend} />
            <span className="text-sm text-surface-300">Contributors</span>
            <span className="text-xs text-surface-500 capitalize">
              {metrics.trends.contributorsTrend}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
