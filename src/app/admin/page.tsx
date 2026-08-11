"use client";

import { useState, useEffect } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Activity, Server, AlertTriangle, Clock, Users, Zap, RefreshCw, Shield, Database, Wifi } from "lucide-react";

interface SystemHealth {
  status: string;
  uptime: number;
  metrics: Record<string, number>;
  services: Record<string, string>;
  alerts: { id: string; severity: string; message: string; timestamp: number }[];
}

interface UsageReport {
  period: { start: string; end: string };
  aiUsage: Record<string, number>;
  githubApiUsage: Record<string, number>;
  userActivity: Record<string, number>;
}

export default function AdminPage() {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [usage, setUsage] = useState<UsageReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin?section=health").then((r) => r.json()),
      fetch("/api/admin?section=usage&days=30").then((r) => r.json()),
    ]).then(([healthData, usageData]) => {
      setHealth(healthData.data);
      setUsage(usageData.data);
      setLoading(false);
    });
  }, []);

  const refresh = () => {
    setLoading(true);
    Promise.all([
      fetch("/api/admin?section=health").then((r) => r.json()),
      fetch("/api/admin?section=usage&days=30").then((r) => r.json()),
    ]).then(([healthData, usageData]) => {
      setHealth(healthData.data);
      setUsage(usageData.data);
      setLoading(false);
    });
  };

  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${d}d ${h}h ${m}m`;
  };

  return (
    <>
      <Header />
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Shield className="w-8 h-8 text-brand-400" />
              Admin Dashboard
            </h1>
            <p className="text-surface-400 mt-1">System health, usage analytics, and alerts</p>
          </div>
          <button onClick={refresh} className="btn-secondary flex items-center gap-2">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {health && (
          <div className="space-y-6">
            {/* System Status */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              {Object.entries(health.services).map(([name, status]) => {
                const icons: Record<string, React.ReactNode> = {
                  database: <Database className="w-5 h-5" />,
                  redis: <Wifi className="w-5 h-5" />,
                  openai: <Zap className="w-5 h-5" />,
                  github: <Server className="w-5 h-5" />,
                  email: <Activity className="w-5 h-5" />,
                };
                const color = status === "up" ? "text-green-400" : status === "down" ? "text-red-400" : "text-yellow-400";
                const bg = status === "up" ? "bg-green-500/10 border-green-500/20" : status === "down" ? "bg-red-500/10 border-red-500/20" : "bg-yellow-500/10 border-yellow-500/20";
                return (
                  <div key={name} className={`card text-center ${bg}`}>
                    <div className={`mb-2 ${color}`}>{icons[name] || <Server className="w-5 h-5" />}</div>
                    <div className="text-sm font-medium text-white capitalize">{name}</div>
                    <div className={`text-xs mt-1 ${color} font-semibold uppercase`}>{status.replace("_", " ")}</div>
                  </div>
                );
              })}
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="card">
                <div className="text-surface-400 text-xs mb-1">Uptime</div>
                <div className="text-xl font-bold text-white">{formatUptime(health.uptime)}</div>
              </div>
              <div className="card">
                <div className="text-surface-400 text-xs mb-1">Active Users</div>
                <div className="text-xl font-bold text-white">{health.metrics.activeUsers}</div>
              </div>
              <div className="card">
                <div className="text-surface-400 text-xs mb-1">AI Calls Today</div>
                <div className="text-xl font-bold text-white">{health.metrics.aiCallsToday}</div>
              </div>
              <div className="card">
                <div className="text-surface-400 text-xs mb-1">Cache Hit Rate</div>
                <div className="text-xl font-bold text-white">{(health.metrics.cacheHitRate * 100).toFixed(0)}%</div>
              </div>
            </div>

            {/* Alerts */}
            {health.alerts.length > 0 && (
              <div className="card">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
                  <AlertTriangle className="w-5 h-5 text-yellow-400" />
                  Active Alerts ({health.alerts.length})
                </h2>
                <div className="space-y-2">
                  {health.alerts.map((alert) => (
                    <div key={alert.id} className={`p-3 rounded-lg border ${alert.severity === "critical" ? "border-red-500/30 bg-red-500/5" : alert.severity === "warning" ? "border-yellow-500/30 bg-yellow-500/5" : "border-blue-500/30 bg-blue-500/5"}`}>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold ${alert.severity === "critical" ? "text-red-400" : alert.severity === "warning" ? "text-yellow-400" : "text-blue-400"}`}>{alert.severity.toUpperCase()}</span>
                        <span className="text-sm text-white">{alert.message}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Usage Report */}
        {usage && (
          <div className="card mt-6">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
              <Activity className="w-5 h-5 text-brand-400" />
              30-Day Usage Report
            </h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <div className="text-surface-400 text-xs">AI Triages</div>
                <div className="text-lg font-bold text-white">{usage.aiUsage.totalTriageCalls}</div>
              </div>
              <div>
                <div className="text-surface-400 text-xs">AI Reviews</div>
                <div className="text-lg font-bold text-white">{usage.aiUsage.totalReviewCalls}</div>
              </div>
              <div>
                <div className="text-surface-400 text-xs">Security Scans</div>
                <div className="text-lg font-bold text-white">{usage.aiUsage.totalSecurityScans}</div>
              </div>
              <div>
                <div className="text-surface-400 text-xs">Est. Cost</div>
                <div className="text-lg font-bold text-white">${usage.aiUsage.estimatedCost.toFixed(4)}</div>
              </div>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
