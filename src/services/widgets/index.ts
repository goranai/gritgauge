/**
 * Custom Dashboard Widget System
 * Users can build custom dashboards with drag-and-drop widgets.
 * Each widget is a self-contained data visualization component.
 */
import prisma from "@/lib/prisma";
import { computeHealthMetrics } from "@/services/analytics";
import { cache } from "@/services/cache";

// ─── Widget Types ───

export type WidgetType =
  | "health_score"
  | "issue_breakdown"
  | "pr_activity"
  | "contributor_leaderboard"
  | "response_time_trend"
  | "stale_items_alert"
  | "commit_activity_heatmap"
  | "sentiment_overview"
  | "security_risk_gauge"
  | "release_timeline"
  | "community_growth"
  | "custom_metric"
  | "markdown_text"
  | "embed_url"
  | "comparison_table";

export type WidgetSize = "small" | "medium" | "large" | "full";

export interface WidgetConfig {
  id: string;
  type: WidgetType;
  title: string;
  size: WidgetSize;
  position: { x: number; y: number; width: number; height: number };
  repoFilter?: string; // repo fullName to filter by
  config: Record<string, unknown>;
  refreshInterval?: number; // seconds, 0 = manual only
}

export interface DashboardConfig {
  id: string;
  userId: string;
  name: string;
  description?: string;
  isDefault: boolean;
  widgets: WidgetConfig[];
  createdAt: Date;
  updatedAt: Date;
}

// ─── Widget Data Resolvers ───

export interface WidgetData {
  type: WidgetType;
  title: string;
  data: unknown;
  error?: string;
  fetchedAt: string;
  cacheHit: boolean;
}

export async function resolveWidgetData(
  widget: WidgetConfig,
  userId: string
): Promise<WidgetData> {
  const cacheKey = `widget:${widget.id}:${widget.type}`;
  const cached = cache.get<WidgetData>(cacheKey);
  if (cached) return { ...cached, cacheHit: true };

  let data: unknown = null;
  let error: string | undefined;

  try {
    switch (widget.type) {
      case "health_score": {
        const repos = await getUserRepos(userId, widget.repoFilter);
        const metrics = await Promise.all(
          repos.map((r) => computeHealthMetrics(r.id, r.owner, r.name))
        );
        data = {
          repos: repos.map((r, i) => ({ name: r.fullName, score: metrics[i]?.healthScore || 0 })),
          average: metrics.length > 0
            ? Math.round(metrics.reduce((s, m) => s + m.healthScore, 0) / metrics.length)
            : 0,
          trend: computeTrend(metrics.map((m) => m.healthScore)),
        };
        break;
      }

      case "issue_breakdown": {
        const repos = await getUserRepos(userId, widget.repoFilter);
        const allLogs = await Promise.all(
          repos.map((r) =>
            prisma.triageLog.findMany({
              where: { repoId: r.id },
              orderBy: { createdAt: "desc" },
              take: 100,
            })
          )
        );
        const flat = allLogs.flat();
        data = {
          total: flat.length,
          byPriority: groupByField(flat, "priority"),
          bySentiment: groupByField(flat, "sentiment"),
          byEffort: groupByField(flat, "effort"),
          recentIssues: flat.slice(0, 10).map((l) => ({
            title: l.issueTitle,
            priority: l.priority,
            sentiment: l.sentiment,
            date: l.createdAt,
          })),
        };
        break;
      }

      case "pr_activity": {
        const repos = await getUserRepos(userId, widget.repoFilter);
        const allReviews = await Promise.all(
          repos.map((r) =>
            prisma.reviewLog.findMany({
              where: { repoId: r.id },
              orderBy: { createdAt: "desc" },
              take: 100,
            })
          )
        );
        const flat = allReviews.flat();
        data = {
          total: flat.length,
          byRiskLevel: groupByField(flat, "riskLevel"),
          byRecommendation: groupByField(flat, "recommendation"),
          recentPRs: flat.slice(0, 10).map((l) => ({
            title: l.prTitle,
            risk: l.riskLevel,
            recommendation: l.recommendation,
            date: l.createdAt,
          })),
        };
        break;
      }

      case "contributor_leaderboard": {
        const repos = await getUserRepos(userId, widget.repoFilter);
        data = {
          contributors: repos.slice(0, 10).map((r) => ({
            repo: r.fullName,
            stars: r.stars,
            forks: r.forks,
            openIssues: r.openIssues,
          })),
        };
        break;
      }

      case "response_time_trend": {
        const repos = await getUserRepos(userId, widget.repoFilter);
        const snapshots = await Promise.all(
          repos.map((r) =>
            prisma.healthSnapshot.findMany({
              where: { repoId: r.id },
              orderBy: { snapshotDate: "desc" },
              take: 30,
            })
          )
        );
        const flat = snapshots.flat();
        const sorted = flat.sort(
          (a, b) => new Date(a.snapshotDate).getTime() - new Date(b.snapshotDate).getTime()
        );
        data = {
          series: sorted.map((s) => ({
            date: s.snapshotDate,
            responseTime: s.responseTimeAvg,
            healthScore: s.healthScore,
          })),
          current: sorted[sorted.length - 1]?.responseTimeAvg || 0,
          trend: computeTrend(sorted.map((s) => s.responseTimeAvg)),
        };
        break;
      }

      case "stale_items_alert": {
        const repos = await getUserRepos(userId, widget.repoFilter);
        const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
        const staleItems = await Promise.all(
          repos.map((r) =>
            prisma.triageLog.count({
              where: { repoId: r.id, createdAt: { lte: thirtyDaysAgo } },
            })
          )
        );
        data = {
          repos: repos.map((r, i) => ({
            name: r.fullName,
            staleCount: staleItems[i],
            status: staleItems[i] > 10 ? "warning" : staleItems[i] > 5 ? "caution" : "good",
          })),
          totalStale: staleItems.reduce((a, b) => a + b, 0),
        };
        break;
      }

      case "sentiment_overview": {
        const repos = await getUserRepos(userId, widget.repoFilter);
        const logs = await Promise.all(
          repos.map((r) =>
            prisma.triageLog.findMany({
              where: { repoId: r.id },
              select: { sentiment: true, createdAt: true },
              orderBy: { createdAt: "desc" },
              take: 200,
            })
          )
        );
        const flat = logs.flat();
        const byMonth = new Map<string, { positive: number; neutral: number; negative: number }>();
        for (const log of flat) {
          const month = new Date(log.createdAt).toISOString().slice(0, 7);
          const entry = byMonth.get(month) || { positive: 0, neutral: 0, negative: 0 };
          if (log.sentiment === "positive") entry.positive++;
          else if (log.sentiment === "negative") entry.negative++;
          else entry.neutral++;
          byMonth.set(month, entry);
        }
        data = {
          timeline: Array.from(byMonth.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([month, counts]) => ({ month, ...counts })),
          overall: {
            positive: flat.filter((l) => l.sentiment === "positive").length,
            neutral: flat.filter((l) => l.sentiment === "neutral").length,
            negative: flat.filter((l) => l.sentiment === "negative").length,
          },
        };
        break;
      }

      case "security_risk_gauge": {
        const repos = await getUserRepos(userId, widget.repoFilter);
        const scans = await Promise.all(
          repos.map((r) =>
            prisma.securityScan.findMany({
              where: { repoId: r.id },
              orderBy: { scannedAt: "desc" },
              take: 10,
            })
          )
        );
        const flat = scans.flat();
        data = {
          repos: repos.map((r) => {
            const repoScans = flat.filter((s) => s.repoId === r.id);
            const latest = repoScans[0];
            return {
              name: r.fullName,
              riskScore: latest?.riskScore || 0,
              scanCount: repoScans.length,
              lastScanned: latest?.scannedAt || null,
            };
          }),
          averageRisk: flat.length > 0
            ? Math.round(flat.reduce((s, sc) => s + sc.riskScore, 0) / flat.length)
            : 0,
        };
        break;
      }

      case "release_timeline": {
        data = {
          releases: [],
          message: "Release data available via GitHub API integration",
        };
        break;
      }

      case "community_growth": {
        const repos = await getUserRepos(userId, widget.repoFilter);
        const snapshots = await Promise.all(
          repos.map((r) =>
            prisma.healthSnapshot.findMany({
              where: { repoId: r.id },
              orderBy: { snapshotDate: "asc" },
              take: 52,
            })
          )
        );
        const flat = snapshots.flat().sort(
          (a, b) => new Date(a.snapshotDate).getTime() - new Date(b.snapshotDate).getTime()
        );
        data = {
          growth: flat.map((s) => ({
            date: s.snapshotDate,
            contributors: s.contributorCount,
            commits: s.commitFrequency,
          })),
        };
        break;
      }

      case "markdown_text": {
        data = {
          content: (widget.config.content as string) || "# No content",
        };
        break;
      }

      case "comparison_table": {
        const repoIds = (widget.config.repoIds as string[]) || [];
        const repos = await Promise.all(
          repoIds.map(async (rid) => {
            const r = await prisma.savedRepo.findUnique({ where: { id: rid } });
            const metrics = r ? await computeHealthMetrics(r.id, r.owner, r.name) : null;
            return {
              name: r?.fullName || "unknown",
              health: metrics?.healthScore || 0,
              busFactor: metrics?.busFactor || 0,
              responseTime: metrics?.responseTimeAvg || 0,
              stars: r?.stars || 0,
            };
          })
        );
        data = { repos };
        break;
      }

      case "custom_metric": {
        const metricName = (widget.config.metricName as string) || "custom";
        data = {
          metric: metricName,
          value: widget.config.value || 0,
        };
        break;
      }

      default:
        data = { message: "Widget type not implemented" };
    }
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to resolve widget";
  }

  const result: WidgetData = {
    type: widget.type,
    title: widget.title,
    data,
    error,
    fetchedAt: new Date().toISOString(),
    cacheHit: false,
  };

  // Cache for refresh interval
  const ttl = widget.refreshInterval || 300;
  cache.set(cacheKey, result, ttl);

  return result;
}

// ─── Dashboard CRUD ───

export async function createDashboard(
  userId: string,
  name: string,
  description?: string
): Promise<DashboardConfig> {
  // Unset other defaults if this is default
  const dashboard = {
    id: `dash_${Date.now()}`,
    userId,
    name,
    description,
    isDefault: false,
    widgets: getDefaultWidgets(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // In production, save to database
  // await prisma.dashboard.create({ data: dashboard });
  return dashboard;
}

export function getDefaultWidgets(): WidgetConfig[] {
  return [
    {
      id: `widget_health`,
      type: "health_score",
      title: "Project Health",
      size: "medium",
      position: { x: 0, y: 0, width: 6, height: 4 },
      config: {},
      refreshInterval: 300,
    },
    {
      id: `widget_issues`,
      type: "issue_breakdown",
      title: "Issue Breakdown",
      size: "medium",
      position: { x: 6, y: 0, width: 6, height: 4 },
      config: {},
      refreshInterval: 300,
    },
    {
      id: `widget_prs`,
      type: "pr_activity",
      title: "PR Activity",
      size: "medium",
      position: { x: 0, y: 4, width: 6, height: 4 },
      config: {},
      refreshInterval: 300,
    },
    {
      id: `widget_sentiment`,
      type: "sentiment_overview",
      title: "Community Sentiment",
      size: "medium",
      position: { x: 6, y: 4, width: 6, height: 4 },
      config: {},
      refreshInterval: 600,
    },
    {
      id: `widget_stale`,
      type: "stale_items_alert",
      title: "Stale Items",
      size: "small",
      position: { x: 0, y: 8, width: 4, height: 3 },
      config: {},
      refreshInterval: 600,
    },
    {
      id: `widget_security`,
      type: "security_risk_gauge",
      title: "Security Risk",
      size: "small",
      position: { x: 4, y: 8, width: 4, height: 3 },
      config: {},
      refreshInterval: 600,
    },
    {
      id: `widget_growth`,
      type: "community_growth",
      title: "Community Growth",
      size: "small",
      position: { x: 8, y: 8, width: 4, height: 3 },
      config: {},
      refreshInterval: 600,
    },
  ];
}

export async function resolveAllWidgets(
  dashboard: DashboardConfig,
  userId: string
): Promise<WidgetData[]> {
  const results = await Promise.all(
    dashboard.widgets.map((w) => resolveWidgetData(w, userId))
  );
  return results;
}

// ─── Helpers ───

async function getUserRepos(userId: string, repoFilter?: string) {
  const where: Record<string, unknown> = { userId };
  if (repoFilter) where.fullName = repoFilter;
  return prisma.savedRepo.findMany({ where, take: 20 });
}

function groupByField<T>(items: T[], field: keyof T): Record<string, number> {
  const result: Record<string, number> = {};
  for (const item of items) {
    const key = String(item[field] || "unknown");
    result[key] = (result[key] || 0) + 1;
  }
  return result;
}

function computeTrend(values: number[]): "up" | "down" | "stable" {
  if (values.length < 3) return "stable";
  const recent = values.slice(-3);
  const older = values.slice(-6, -3);
  if (older.length === 0) return "stable";
  const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
  const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
  if (recentAvg > olderAvg * 1.1) return "up";
  if (recentAvg < olderAvg * 0.9) return "down";
  return "stable";
}

// ─── Widget Layout Engine ───

export interface LayoutGrid {
  columns: number;
  rowHeight: number;
  gap: number;
  widgets: (WidgetConfig & { layout: { x: number; y: number; w: number; h: number } })[];
}

export function computeWidgetLayout(
  widgets: WidgetConfig[],
  columns: number = 12,
  rowHeight: number = 100,
  gap: number = 16
): LayoutGrid {
  const sizeMap: Record<WidgetSize, { w: number; h: number }> = {
    small: { w: 4, h: 3 },
    medium: { w: 6, h: 4 },
    large: { w: 8, h: 5 },
    full: { w: 12, h: 6 },
  };

  // Simple grid packing algorithm
  const grid: boolean[][] = Array.from({ length: 50 }, () => Array(columns).fill(false));

  const layoutWidgets = widgets.map((widget) => {
    const size = sizeMap[widget.size];
    // Find first available position
    let placed = false;
    let px = 0;
    let py = 0;

    for (let y = 0; y < grid.length && !placed; y++) {
      for (let x = 0; x <= columns - size.w && !placed; x++) {
        if (canPlace(grid, x, y, size.w, size.h)) {
          place(grid, x, y, size.w, size.h);
          px = x;
          py = y;
          placed = true;
        }
      }
    }

    return {
      ...widget,
      layout: { x: px, y: py, w: size.w, h: size.h },
    };
  });

  return { columns, rowHeight, gap, widgets: layoutWidgets };
}

function canPlace(grid: boolean[][], x: number, y: number, w: number, h: number): boolean {
  for (let dy = 0; dy < h; dy++) {
    if (y + dy >= grid.length) return false;
    for (let dx = 0; dx < w; dx++) {
      if (grid[y + dy][x + dx]) return false;
    }
  }
  return true;
}

function place(grid: boolean[][], x: number, y: number, w: number, h: number): void {
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      grid[y + dy][x + dx] = true;
    }
  }
}
