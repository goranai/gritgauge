/**
 * Monitoring & Observability Service
 * Tracks system health, performance metrics, error rates, and usage analytics
 */
import prisma from "@/lib/prisma";
import { cache } from "@/services/cache";

// ─── Metric Types ───

export type MetricName =
  | "api.request"
  | "api.latency"
  | "api.error"
  | "ai.triage.request"
  | "ai.triage.latency"
  | "ai.triage.token_usage"
  | "ai.review.request"
  | "ai.review.latency"
  | "ai.review.token_usage"
  | "ai.security.request"
  | "github.api.request"
  | "github.api.rate_limit"
  | "db.query.latency"
  | "cache.hit"
  | "cache.miss"
  | "webhook.delivery"
  | "webhook.failure"
  | "export.generated"
  | "user.signup"
  | "user.login"
  | "repo.added"
  | "repo.analyzed";

export interface MetricPoint {
  name: MetricName;
  value: number;
  tags?: Record<string, string>;
  timestamp: number;
}

export interface SystemHealth {
  status: "healthy" | "degraded" | "unhealthy";
  uptime: number;
  metrics: {
    totalRequests: number;
    errorRate: number;
    avgLatencyMs: number;
    activeUsers: number;
    aiCallsToday: number;
    cacheHitRate: number;
    dbConnectionPool: number;
  };
  services: {
    database: "up" | "down" | "slow";
    redis: "up" | "down" | "not_configured";
    openai: "up" | "down" | "not_configured";
    github: "up" | "down" | "rate_limited";
    email: "up" | "down" | "not_configured";
  };
  alerts: SystemAlert[];
}

export interface SystemAlert {
  id: string;
  severity: "critical" | "warning" | "info";
  service: string;
  message: string;
  timestamp: number;
  acknowledged: boolean;
}

// ─── In-Memory Metrics Buffer ───

const metricsBuffer: MetricPoint[] = [];
const MAX_BUFFER_SIZE = 10000;
let flushInterval: NodeJS.Timeout | null = null;

export function recordMetric(name: MetricName, value: number, tags?: Record<string, string>): void {
  metricsBuffer.push({
    name,
    value,
    tags,
    timestamp: Date.now(),
  });

  if (metricsBuffer.length >= MAX_BUFFER_SIZE) {
    flushMetrics();
  }

  if (!flushInterval) {
    flushInterval = setInterval(flushMetrics, 60000); // Flush every 60s
  }
}

async function flushMetrics(): Promise<void> {
  if (metricsBuffer.length === 0) return;

  const batch = metricsBuffer.splice(0, metricsBuffer.length);

  // Aggregate metrics
  const aggregated = new Map<string, { count: number; sum: number; min: number; max: number }>();

  for (const metric of batch) {
    const key = `${metric.name}:${JSON.stringify(metric.tags || {})}`;
    const existing = aggregated.get(key) || { count: 0, sum: 0, min: Infinity, max: -Infinity };
    existing.count++;
    existing.sum += metric.value;
    existing.min = Math.min(existing.min, metric.value);
    existing.max = Math.max(existing.max, metric.value);
    aggregated.set(key, existing);
  }

  // Store aggregated metrics in audit log (in production: time-series DB)
  for (const [key, stats] of aggregated) {
    const [name, tagsStr] = key.split(":");
    await prisma.auditLog.create({
      data: {
        action: `metrics.${name}`,
        resource: "metrics",
        resourceId: name,
        metadata: {
          count: stats.count,
          sum: stats.sum,
          avg: stats.sum / stats.count,
          min: stats.min,
          max: stats.max,
          tags: tagsStr ? JSON.parse(tagsStr) : {},
          timestamp: new Date().toISOString(),
        },
      },
    }).catch(() => {}); // Don't block on metrics storage
  }
}

// ─── System Health Check ───

export async function getSystemHealth(): Promise<SystemHealth> {
  const startTime = process.uptime();

  // Check database
  let dbStatus: SystemHealth["services"]["database"] = "up";
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    dbStatus = "down";
  }

  // Check OpenAI
  let openaiStatus: SystemHealth["services"]["openai"] = "not_configured";
  if (process.env.OPENAI_API_KEY) {
    openaiStatus = "up";
  }

  // Check GitHub
  let githubStatus: SystemHealth["services"]["github"] = "not_configured";
  if (process.env.GITHUB_TOKEN) {
    try {
      const response = await fetch("https://api.github.com/rate_limit", {
        headers: { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` },
      });
      if (response.ok) {
        const data = await response.json() as { rate: { remaining: number } };
        githubStatus = data.rate.remaining > 10 ? "up" : "rate_limited";
      } else {
        githubStatus = "down";
      }
    } catch {
      githubStatus = "down";
    }
  }

  // Cache stats
  const cacheStats = cache.stats();

  // Count today's AI calls
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const aiCallsToday = await prisma.auditLog.count({
    where: {
      action: { startsWith: "metrics.ai." },
      createdAt: { gte: todayStart },
    },
  });

  // Active users (last 15 min)
  const activeThreshold = new Date(Date.now() - 15 * 60000);
  const activeUsers = await prisma.auditLog.count({
    where: {
      action: "user.login",
      createdAt: { gte: activeThreshold },
    },
    distinct: ["userId"],
  });

  // Active alerts
  const alerts = await getActiveAlerts();

  return {
    status: dbStatus === "up" ? "healthy" : "degraded",
    uptime: startTime,
    metrics: {
      totalRequests: cacheStats.hits + cacheStats.misses,
      errorRate: 0.01, // Would calculate from error metrics
      avgLatencyMs: 45, // Would calculate from latency metrics
      activeUsers,
      aiCallsToday,
      cacheHitRate: cacheStats.hitRate,
      dbConnectionPool: 5, // Would query actual pool
    },
    services: {
      database: dbStatus,
      redis: "not_configured",
      openai: openaiStatus,
      github: githubStatus,
      email: process.env.RESEND_API_KEY ? "up" : "not_configured",
    },
    alerts,
  };
}

// ─── Alert Management ───

const systemAlerts: SystemAlert[] = [];

export function createAlert(
  severity: SystemAlert["severity"],
  service: string,
  message: string
): SystemAlert {
  const alert: SystemAlert = {
    id: `alert_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    severity,
    service,
    message,
    timestamp: Date.now(),
    acknowledged: false,
  };

  systemAlerts.push(alert);

  // Keep only last 100 alerts
  if (systemAlerts.length > 100) {
    systemAlerts.shift();
  }

  // Log to database
  prisma.auditLog.create({
    data: {
      action: "alert.created",
      resource: "alert",
      resourceId: alert.id,
      metadata: { severity, service, message },
    },
  }).catch(() => {});

  return alert;
}

export function acknowledgeAlert(alertId: string): boolean {
  const alert = systemAlerts.find((a) => a.id === alertId);
  if (alert) {
    alert.acknowledged = true;
    return true;
  }
  return false;
}

export async function getActiveAlerts(): Promise<SystemAlert[]> {
  return systemAlerts.filter((a) => !a.acknowledged);
}

// ─── Performance Profiling ───

const profilerSpans = new Map<string, { startTime: number; name: string }>();

export function startProfilerSpan(name: string): string {
  const id = `span_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  profilerSpans.set(id, { startTime: performance.now(), name });
  return id;
}

export function endProfilerSpan(spanId: string): { name: string; durationMs: number } | null {
  const span = profilerSpans.get(spanId);
  if (!span) return null;

  profilerSpans.delete(spanId);
  const durationMs = performance.now() - span.startTime;

  recordMetric("api.latency", durationMs, { endpoint: span.name });
  return { name: span.name, durationMs };
}

// ─── Usage Report ───

export interface UsageReport {
  period: { start: Date; end: Date };
  aiUsage: {
    totalTriageCalls: number;
    totalReviewCalls: number;
    totalSecurityScans: number;
    totalTokensUsed: number;
    estimatedCost: number;
  };
  githubApiUsage: {
    totalRequests: number;
    rateLimitHits: number;
  };
  userActivity: {
    newUsers: number;
    activeUsers: number;
    reposAnalyzed: number;
    reportsExported: number;
  };
  topRepos: { fullName: string; analysisCount: number }[];
  topUsers: { userId: string; activityCount: number }[];
}

export async function generateUsageReport(days: number = 30): Promise<UsageReport> {
  const end = new Date();
  const start = new Date(end.getTime() - days * 86400000);

  const logs = await prisma.auditLog.findMany({
    where: { createdAt: { gte: start, lte: end } },
  });

  const triageLogs = logs.filter((l) => l.action === "metrics.ai.triage.request");
  const reviewLogs = logs.filter((l) => l.action === "metrics.ai.review.request");
  const securityLogs = logs.filter((l) => l.action === "metrics.ai.security.request");

  // Aggregate token usage
  let totalTokens = 0;
  for (const log of [...triageLogs, ...reviewLogs, ...securityLogs]) {
    const meta = log.metadata as Record<string, number> | null;
    totalTokens += meta?.tokens || 0;
  }

  // Top repos
  const repoCounts = new Map<string, number>();
  for (const log of logs) {
    const meta = log.metadata as Record<string, string> | null;
    const repo = meta?.repo || meta?.repoFullName;
    if (repo) repoCounts.set(repo, (repoCounts.get(repo) || 0) + 1);
  }

  const topRepos = Array.from(repoCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([fullName, count]) => ({ fullName, analysisCount: count }));

  return {
    period: { start, end },
    aiUsage: {
      totalTriageCalls: triageLogs.length,
      totalReviewCalls: reviewLogs.length,
      totalSecurityScans: securityLogs.length,
      totalTokensUsed: totalTokens,
      estimatedCost: totalTokens * 0.00000015, // GPT-4o-mini pricing approx
    },
    githubApiUsage: {
      totalRequests: logs.filter((l) => l.action === "metrics.github.api.request").length,
      rateLimitHits: logs.filter((l) => l.action === "metrics.github.api.rate_limit").length,
    },
    userActivity: {
      newUsers: logs.filter((l) => l.action === "user.signup").length,
      activeUsers: new Set(logs.filter((l) => l.userId).map((l) => l.userId)).size,
      reposAnalyzed: logs.filter((l) => l.action === "repo.analyzed").length,
      reportsExported: logs.filter((l) => l.action === "metrics.export.generated").length,
    },
    topRepos,
    topUsers: [],
  };
}

// ─── Logging ───

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4,
}

const LOG_LEVEL_LABELS: Record<LogLevel, string> = {
  [LogLevel.DEBUG]: "DEBUG",
  [LogLevel.INFO]: "INFO",
  [LogLevel.WARN]: "WARN",
  [LogLevel.ERROR]: "ERROR",
  [LogLevel.FATAL]: "FATAL",
};

const currentLogLevel = (process.env.LOG_LEVEL as string) === "debug" ? LogLevel.DEBUG : LogLevel.INFO;

export function log(level: LogLevel, message: string, context?: Record<string, unknown>): void {
  if (level < currentLogLevel) return;

  const timestamp = new Date().toISOString();
  const label = LOG_LEVEL_LABELS[level];
  const contextStr = context ? ` ${JSON.stringify(context)}` : "";

  const logLine = `[${timestamp}] [${label}] ${message}${contextStr}`;

  switch (level) {
    case LogLevel.ERROR:
    case LogLevel.FATAL:
      console.error(logLine);
      break;
    case LogLevel.WARN:
      console.warn(logLine);
      break;
    default:
      console.log(logLine);
  }

  // Log errors to database
  if (level >= LogLevel.ERROR) {
    prisma.auditLog.create({
      data: {
        action: "log.error",
        resource: "system",
        resourceId: "log",
        metadata: { level: label, message, ...context },
      },
    }).catch(() => {});
  }
}
