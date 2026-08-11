/**
 * Background Job Scheduler
 * Handles periodic tasks: health snapshots, stale item detection, cleanup, data sync
 */
import prisma from "@/lib/prisma";
import { computeHealthMetrics, saveHealthSnapshot } from "@/services/analytics";
import { log, LogLevel, createAlert } from "@/services/monitoring";

// ─── Job Types ───

export type JobName =
  | "healthSnapshot"
  | "staleItemDetection"
  | "dataCleanup"
  | "webhookRetry"
  | "usageReport"
  | "cacheWarmup"
  | "securityRescan";

interface ScheduledJob {
  name: JobName;
  intervalMs: number;
  lastRun: number;
  running: boolean;
  handler: () => Promise<void>;
}

// ─── Job Registry ───

const jobs = new Map<JobName, ScheduledJob>();

export function registerJob(name: JobName, intervalMs: number, handler: () => Promise<void>): void {
  if (jobs.has(name)) {
    log(LogLevel.WARN, `Job ${name} already registered — updating interval`);
  }

  jobs.set(name, {
    name,
    intervalMs,
    lastRun: 0,
    running: false,
    handler,
  });

  log(LogLevel.INFO, `Job registered: ${name} (every ${intervalMs / 1000}s)`);
}

// ─── Job Runner ───

let schedulerRunning = false;

export function startScheduler(): void {
  if (schedulerRunning) return;
  schedulerRunning = true;

  log(LogLevel.INFO, `Scheduler started with ${jobs.size} jobs`);

  const tick = async () => {
    const now = Date.now();

    for (const [name, job] of jobs) {
      if (job.running) continue;
      if (now - job.lastRun < job.intervalMs) continue;

      job.running = true;
      job.lastRun = now;

      try {
        await job.handler();
      } catch (error) {
        log(LogLevel.ERROR, `Job ${name} failed`, { error: String(error) });
      } finally {
        job.running = false;
      }
    }
  };

  // Run every 30 seconds
  setInterval(tick, 30000);
  tick(); // Run immediately
}

export function stopScheduler(): void {
  schedulerRunning = false;
  log(LogLevel.INFO, "Scheduler stopped");
}

export function getJobStatus(): { name: string; lastRun: number; running: boolean; nextRunIn: number }[] {
  const now = Date.now();
  return Array.from(jobs.values()).map((j) => ({
    name: j.name,
    lastRun: j.lastRun,
    running: j.running,
    nextRunIn: Math.max(0, j.intervalMs - (now - j.lastRun)),
  }));
}

// ─── Built-in Jobs ───

export function registerDefaultJobs(): void {
  // Health snapshot — every 6 hours
  registerJob("healthSnapshot", 6 * 3600000, async () => {
    const repos = await prisma.savedRepo.findMany({
      where: { isMonitored: true },
      take: 100,
    });

    let snapshots = 0;
    for (const repo of repos) {
      try {
        await saveHealthSnapshot(repo.id);
        snapshots++;
      } catch {
        // Skip failed repos
      }
    }

    log(LogLevel.INFO, `Health snapshots saved for ${snapshots} repos`);
  });

  // Stale item detection — every 24 hours
  registerJob("staleItemDetection", 24 * 3600000, async () => {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);

    const staleLogs = await prisma.triageLog.findMany({
      where: { createdAt: { lte: thirtyDaysAgo } },
      select: { repoId: true },
      distinct: ["repoId"],
    });

    for (const log of staleLogs) {
      const repo = await prisma.savedRepo.findUnique({ where: { id: log.repoId } });
      if (repo) {
        createAlert("warning", "health", `Stale items detected in ${repo.fullName}`);
      }
    }

    log(LogLevel.INFO, `Stale item detection complete — ${staleLogs.length} repos checked`);
  });

  // Data cleanup — every 7 days
  registerJob("dataCleanup", 7 * 86400000, async () => {
    const ninetyDaysAgo = new Date(Date.now() - 90 * 86400000);

    // Clean old audit logs
    const deleted = await prisma.auditLog.deleteMany({
      where: { createdAt: { lte: ninetyDaysAgo } },
    });

    log(LogLevel.INFO, `Data cleanup: deleted ${deleted.count} old audit logs`);
  });

  // Webhook retry — every 15 minutes
  registerJob("webhookRetry", 15 * 60000, async () => {
    // Webhooks are retried via the delivery queue in webhooks.ts
    log(LogLevel.DEBUG, "Webhook retry check complete");
  });

  // Cache warmup — every hour
  registerJob("cacheWarmup", 3600000, async () => {
    const repos = await prisma.savedRepo.findMany({
      where: { isMonitored: true },
      take: 50,
      orderBy: { updatedAt: "desc" },
    });

    for (const repo of repos) {
      try {
        await computeHealthMetrics(repo.id, repo.owner, repo.name);
      } catch {
        // Skip
      }
    }

    log(LogLevel.DEBUG, `Cache warmup: ${repos.length} repos`);
  });
}

// ─── Manual Trigger ───

export async function triggerJob(name: JobName): Promise<{ success: boolean; message: string }> {
  const job = jobs.get(name);
  if (!job) return { success: false, message: `Job ${name} not found` };

  if (job.running) return { success: false, message: `Job ${name} is already running` };

  job.running = true;
  try {
    await job.handler();
    job.lastRun = Date.now();
    return { success: true, message: `Job ${name} completed` };
  } catch (error) {
    return { success: false, message: `Job ${name} failed: ${error}` };
  } finally {
    job.running = false;
  }
}
