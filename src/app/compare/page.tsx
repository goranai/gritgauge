"use client";

import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";
import { ArrowLeftRight, Star, GitFork, AlertCircle, Activity, Loader2, Trophy } from "lucide-react";

const sampleRepos = [
  { fullName: "facebook/react", stars: 228000, forks: 46000, openIssues: 850, healthScore: 82, busFactor: 8, responseTime: 8.5, contributorCount: 1500 },
  { fullName: "vercel/next.js", stars: 125000, forks: 27000, openIssues: 620, healthScore: 88, busFactor: 6, responseTime: 6.2, contributorCount: 3200 },
  { fullName: "tiangolo/fastapi", stars: 76000, forks: 6400, openIssues: 340, healthScore: 90, busFactor: 4, responseTime: 4.8, contributorCount: 680 },
  { fullName: "microsoft/vscode", stars: 163000, forks: 29000, openIssues: 5100, healthScore: 75, busFactor: 12, responseTime: 12.0, contributorCount: 2100 },
];

export default function ComparePage() {
  const [selected, setSelected] = useState<string[]>([]);
  const [comparing, setComparing] = useState(false);

  const toggleRepo = (fullName: string) => {
    setSelected((prev) =>
      prev.includes(fullName) ? prev.filter((r) => r !== fullName) : [...prev, fullName]
    );
  };

  const compareRepos = sampleRepos.filter((r) => selected.includes(r.fullName));

  const radarData = compareRepos.length > 0
    ? [
        { metric: "Health", ...Object.fromEntries(compareRepos.map((r) => [r.fullName.split("/")[1], r.healthScore])) },
        { metric: "Bus Factor", ...Object.fromEntries(compareRepos.map((r) => [r.fullName.split("/")[1], r.busFactor * 10])) },
        { metric: "Response", ...Object.fromEntries(compareRepos.map((r) => [r.fullName.split("/")[1], Math.max(0, 100 - r.responseTime * 5)])) },
        { metric: "Contributors", ...Object.fromEntries(compareRepos.map((r) => [r.fullName.split("/")[1], Math.min(100, r.contributorCount / 20)])) },
        { metric: "Stars", ...Object.fromEntries(compareRepos.map((r) => [r.fullName.split("/")[1], Math.min(100, r.stars / 2000)])) },
      ]
    : [];

  const RADAR_COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444"];

  return (
    <>
      <Header />
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <ArrowLeftRight className="w-8 h-8 text-brand-400" />
            Compare Repositories
          </h1>
          <p className="text-surface-400 mt-1">Side-by-side comparison of open-source project health</p>
        </div>

        {/* Repo Selection */}
        <div className="card mb-8">
          <h3 className="text-lg font-semibold text-white mb-4">Select repositories to compare</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {sampleRepos.map((repo) => (
              <button
                key={repo.fullName}
                onClick={() => toggleRepo(repo.fullName)}
                className={`p-4 rounded-lg border text-left transition-all ${
                  selected.includes(repo.fullName)
                    ? "border-brand-500 bg-brand-500/10"
                    : "border-surface-700 hover:border-surface-600"
                }`}
              >
                <span className="text-white font-medium text-sm">{repo.fullName}</span>
                <div className="flex items-center gap-3 mt-2 text-xs text-surface-400">
                  <span className="flex items-center gap-1"><Star className="w-3 h-3 text-yellow-400" />{repo.stars.toLocaleString()}</span>
                  <span className="flex items-center gap-1"><Activity className="w-3 h-3 text-green-400" />{repo.healthScore}</span>
                </div>
              </button>
            ))}
          </div>
          {selected.length >= 2 && (
            <button
              onClick={() => setComparing(true)}
              className="btn-primary mt-4 flex items-center gap-2"
            >
              <ArrowLeftRight className="w-4 h-4" />
              Compare {selected.length} Repos
            </button>
          )}
        </div>

        {/* Comparison Results */}
        {comparing && compareRepos.length >= 2 && (
          <div className="space-y-6 animate-fade-in">
            {/* Stats Comparison */}
            <div className="card overflow-x-auto">
              <h3 className="text-lg font-semibold text-white mb-4">Key Metrics</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-800">
                    <th className="text-left py-3 text-surface-400 font-medium">Metric</th>
                    {compareRepos.map((r) => (
                      <th key={r.fullName} className="text-right py-3 text-white font-medium">{r.fullName}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label: "Stars", key: "stars", icon: Star, format: (v: number) => v.toLocaleString() },
                    { label: "Forks", key: "forks", icon: GitFork, format: (v: number) => v.toLocaleString() },
                    { label: "Open Issues", key: "openIssues", icon: AlertCircle, format: (v: number) => v.toLocaleString() },
                    { label: "Health Score", key: "healthScore", icon: Activity, format: (v: number) => `${v}/100` },
                    { label: "Bus Factor", key: "busFactor", icon: Activity, format: (v: number) => String(v) },
                    { label: "Response Time", key: "responseTime", icon: Activity, format: (v: number) => `${v}h` },
                    { label: "Contributors", key: "contributorCount", icon: Activity, format: (v: number) => v.toLocaleString() },
                  ].map(({ label, key, icon: Icon, format }) => (
                    <tr key={label} className="border-b border-surface-800 last:border-0">
                      <td className="py-2.5 flex items-center gap-2 text-surface-300">
                        <Icon className="w-4 h-4 text-surface-500" />
                        {label}
                      </td>
                      {compareRepos.map((r) => (
                        <td key={r.fullName} className="text-right py-2.5 text-white font-medium">
                          {format(r[key as keyof typeof r] as number)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Radar Chart */}
            <div className="card">
              <h3 className="text-lg font-semibold text-white mb-4">Capability Radar</h3>
              <ResponsiveContainer width="100%" height={400}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#334155" />
                  <PolarAngleAxis dataKey="metric" stroke="#94a3b8" fontSize={12} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#64748b" fontSize={10} />
                  {compareRepos.map((repo, i) => (
                    <Radar
                      key={repo.fullName}
                      name={repo.fullName.split("/")[1]}
                      dataKey={repo.fullName.split("/")[1]}
                      stroke={RADAR_COLORS[i % RADAR_COLORS.length]}
                      fill={RADAR_COLORS[i % RADAR_COLORS.length]}
                      fillOpacity={0.15}
                      strokeWidth={2}
                    />
                  ))}
                </RadarChart>
              </ResponsiveContainer>
              <div className="flex justify-center gap-4 mt-4">
                {compareRepos.map((repo, i) => (
                  <div key={repo.fullName} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: RADAR_COLORS[i % RADAR_COLORS.length] }} />
                    <span className="text-sm text-surface-300">{repo.fullName}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Winner */}
            <div className="card border-yellow-500/30 bg-yellow-500/5">
              <div className="flex items-center gap-3">
                <Trophy className="w-8 h-8 text-yellow-400" />
                <div>
                  <h3 className="text-lg font-semibold text-white">Healthiest Project</h3>
                  <p className="text-surface-300">
                    {compareRepos.sort((a, b) => b.healthScore - a.healthScore)[0].fullName} leads with a health score of{" "}
                    {compareRepos.sort((a, b) => b.healthScore - a.healthScore)[0].healthScore}/100
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
