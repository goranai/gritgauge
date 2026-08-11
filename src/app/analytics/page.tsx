"use client";

import { useState, useEffect } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import type { HealthMetrics } from "@/types";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { Loader2, TrendingUp, TrendingDown, Activity, Users, Clock, AlertTriangle } from "lucide-react";

const COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6"];

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<HealthMetrics | null>(null);

  useEffect(() => {
    // Mock data for demonstration
    setTimeout(() => {
      setMetrics({
        busFactor: 4,
        responseTimeAvg: 12.5,
        staleIssueRatio: 0.18,
        prMergeTimeAvg: 36.2,
        contributorCount: 23,
        commitFrequency: 12,
        healthScore: 78,
        trends: {
          issuesTrend: "down",
          prsTrend: "stable",
          contributorsTrend: "up",
        },
        details: {
          issueResolutionRate: 0.72,
          prAcceptanceRate: 0.85,
          avgIssueComments: 3.5,
          avgPRReviewComments: 4.2,
          firstTimeContributorRatio: 0.18,
          documentationScore: 75,
          ciStatus: "passing",
          daysSinceLastCommit: 2,
          daysSinceLastRelease: 10,
          contributorRetentionRate: 0.73,
        },
      });
      setLoading(false);
    }, 1000);
  }, []);

  if (loading) {
    return (
      <>
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-brand-400 animate-spin" />
        </main>
        <Footer />
      </>
    );
  }

  if (!metrics) return null;

  const issueData = [
    { name: "Critical", value: 3, color: "#ef4444" },
    { name: "High", value: 8, color: "#f59e0b" },
    { name: "Medium", value: 15, color: "#3b82f6" },
    { name: "Low", value: 22, color: "#22c55e" },
    { name: "Closed", value: 45, color: "#8b5cf6" },
  ];

  const weeklyActivity = [
    { day: "Mon", issues: 5, prs: 3, commits: 12 },
    { day: "Tue", issues: 8, prs: 5, commits: 18 },
    { day: "Wed", issues: 6, prs: 7, commits: 15 },
    { day: "Thu", issues: 4, prs: 4, commits: 10 },
    { day: "Fri", issues: 7, prs: 6, commits: 20 },
    { day: "Sat", issues: 2, prs: 1, commits: 5 },
    { day: "Sun", issues: 1, prs: 0, commits: 3 },
  ];

  const healthTimeline = [
    { month: "Jan", score: 62 },
    { month: "Feb", score: 65 },
    { month: "Mar", score: 60 },
    { month: "Apr", score: 70 },
    { month: "May", score: 72 },
    { month: "Jun", score: 75 },
    { month: "Jul", score: 78 },
    { month: "Aug", score: 78 },
  ];

  return (
    <>
      <Header />
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Analytics</h1>
          <p className="text-surface-400 mt-1">Deep insights into your project health</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { icon: Activity, label: "Health Score", value: `${metrics.healthScore}/100`, color: "text-green-400", trend: "up" },
            { icon: Users, label: "Bus Factor", value: metrics.busFactor, color: "text-blue-400", trend: "stable" },
            { icon: Clock, label: "Response Time", value: `${metrics.responseTimeAvg}h`, color: "text-yellow-400", trend: "down" },
            { icon: AlertTriangle, label: "Stale Issues", value: `${(metrics.staleIssueRatio * 100).toFixed(0)}%`, color: "text-red-400", trend: metrics.staleIssueRatio > 0.3 ? "up" : "down" },
          ].map(({ icon: Icon, label, value, color, trend }) => (
            <div key={label} className="card">
              <div className="flex items-center gap-2 mb-2">
                <Icon className={`w-5 h-5 ${color}`} />
                <span className="text-surface-400 text-sm">{label}</span>
              </div>
              <div className="flex items-end gap-2">
                <span className="text-2xl font-bold text-white">{value}</span>
                {trend === "up" && <TrendingUp className="w-4 h-4 text-green-400 mb-1" />}
                {trend === "down" && <TrendingDown className="w-4 h-4 text-red-400 mb-1" />}
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Weekly Activity Bar Chart */}
          <div className="card">
            <h3 className="text-lg font-semibold text-white mb-4">Weekly Activity</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={weeklyActivity}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="day" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    border: "1px solid #334155",
                    borderRadius: "8px",
                    color: "#f1f5f9",
                  }}
                />
                <Bar dataKey="issues" fill="#22c55e" radius={[4, 4, 0, 0]} name="Issues" />
                <Bar dataKey="prs" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="PRs" />
                <Bar dataKey="commits" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Commits" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Health Score Timeline */}
          <div className="card">
            <h3 className="text-lg font-semibold text-white mb-4">Health Score Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={healthTimeline}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
                <YAxis domain={[0, 100]} stroke="#64748b" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    border: "1px solid #334155",
                    borderRadius: "8px",
                    color: "#f1f5f9",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="#22c55e"
                  strokeWidth={2}
                  dot={{ fill: "#22c55e", strokeWidth: 2 }}
                  name="Health Score"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Issue Distribution Pie */}
          <div className="card">
            <h3 className="text-lg font-semibold text-white mb-4">Issue Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={issueData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {issueData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    border: "1px solid #334155",
                    borderRadius: "8px",
                    color: "#f1f5f9",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-3 mt-2">
              {issueData.map((item) => (
                <div key={item.name} className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-xs text-surface-400">{item.name}: {item.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Details */}
          <div className="card">
            <h3 className="text-lg font-semibold text-white mb-4">Detailed Metrics</h3>
            <div className="space-y-3">
              {[
                { label: "Issue Resolution Rate", value: `${(metrics.details.issueResolutionRate * 100).toFixed(0)}%` },
                { label: "PR Acceptance Rate", value: `${(metrics.details.prAcceptanceRate * 100).toFixed(0)}%` },
                { label: "First-Time Contributor Ratio", value: `${(metrics.details.firstTimeContributorRatio * 100).toFixed(0)}%` },
                { label: "Contributor Retention", value: `${(metrics.details.contributorRetentionRate * 100).toFixed(0)}%` },
                { label: "Documentation Score", value: `${metrics.details.documentationScore}/100` },
                { label: "CI Status", value: metrics.details.ciStatus },
                { label: "Days Since Last Commit", value: metrics.details.daysSinceLastCommit },
                { label: "Days Since Last Release", value: metrics.details.daysSinceLastRelease },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between py-2 border-b border-surface-800 last:border-0">
                  <span className="text-surface-400 text-sm">{label}</span>
                  <span className="text-white font-medium text-sm">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
