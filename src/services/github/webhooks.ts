/**
 * GitHub Webhook Handler — Process incoming GitHub events
 * Handles: issues, pull_requests, push, check_suite, check_run, status, release, star, fork
 */
import crypto from "crypto";
import prisma from "@/lib/prisma";
import type { Issue, PullRequest } from "@/types";

export type GitHubEvent =
  | "issues.opened"
  | "issues.closed"
  | "issues.reopened"
  | "issues.labeled"
  | "issues.assigned"
  | "pull_request.opened"
  | "pull_request.closed"
  | "pull_request.reopened"
  | "pull_request.ready_for_review"
  | "pull_request.review_requested"
  | "push"
  | "check_suite.completed"
  | "check_run.completed"
  | "status"
  | "release.published"
  | "star.created"
  | "fork.created";

interface WebhookPayload {
  action: string;
  repository: { owner: { login: string }; name: string; full_name: string };
  sender: { login: string; id: number };
  issue?: Record<string, unknown>;
  pull_request?: Record<string, unknown>;
  check_suite?: Record<string, unknown>;
  check_run?: Record<string, unknown>;
  release?: Record<string, unknown>;
  ref?: string;
  commits?: Array<Record<string, unknown>>;
}

export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  if (!signature || !secret) return false;
  const expected = `sha256=${crypto.createHmac("sha256", secret).update(payload).digest("hex")}`;
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

export function parseGitHubEvent(event: string, action: string): GitHubEvent | null {
  const fullEvent = `${event}.${action}`;
  const validEvents: GitHubEvent[] = [
    "issues.opened", "issues.closed", "issues.reopened", "issues.labeled", "issues.assigned",
    "pull_request.opened", "pull_request.closed", "pull_request.reopened",
    "pull_request.ready_for_review", "pull_request.review_requested",
    "push", "check_suite.completed", "check_run.completed", "status",
    "release.published", "star.created", "fork.created",
  ];
  return validEvents.includes(fullEvent as GitHubEvent) ? (fullEvent as GitHubEvent) : null;
}

export async function processWebhookEvent(
  event: GitHubEvent,
  payload: WebhookPayload
): Promise<{ processed: boolean; action: string; details: string }> {
  const repoFullName = payload.repository?.full_name;
  const sender = payload.sender?.login || "unknown";

  switch (event) {
    case "issues.opened": {
      // Auto-triage new issues
      const issue = payload.issue as Record<string, unknown> | undefined;
      if (issue) {
        await prisma.auditLog.create({
          data: {
            action: "issue.opened",
            resource: "issue",
            resourceId: String(issue.number || ""),
            metadata: { repo: repoFullName, title: issue.title, author: sender },
          },
        });

        // Create notification for repo owner
        const savedRepo = await findRepoByFullName(repoFullName);
        if (savedRepo) {
          await prisma.notification.create({
            data: {
              userId: savedRepo.userId,
              type: "triage_complete",
              title: `New issue: ${(issue.title as string)?.slice(0, 80)}`,
              body: `Issue #${issue.number} opened by ${sender} in ${repoFullName}`,
              actionUrl: (issue.html_url as string) || undefined,
            },
          });
        }
      }
      return { processed: true, action: "auto-triage", details: "New issue logged for triage" };
    }

    case "pull_request.opened": {
      const pr = payload.pull_request as Record<string, unknown> | undefined;
      if (pr) {
        await prisma.auditLog.create({
          data: {
            action: "pr.opened",
            resource: "pull_request",
            resourceId: String(pr.number || ""),
            metadata: { repo: repoFullName, title: pr.title, author: sender, draft: pr.draft },
          },
        });

        const savedRepo = await findRepoByFullName(repoFullName);
        if (savedRepo) {
          await prisma.notification.create({
            data: {
              userId: savedRepo.userId,
              type: "review_ready",
              title: `New PR: ${(pr.title as string)?.slice(0, 80)}`,
              body: `PR #${pr.number} opened by ${sender} — ${(pr.draft as boolean) ? "Draft" : "Ready for review"}`,
              actionUrl: (pr.html_url as string) || undefined,
            },
          });
        }
      }
      return { processed: true, action: "pr-logged", details: "New PR logged for review" };
    }

    case "release.published": {
      const release = payload.release as Record<string, unknown> | undefined;
      if (release) {
        await prisma.auditLog.create({
          data: {
            action: "release.published",
            resource: "release",
            resourceId: (release.tag_name as string) || "",
            metadata: { repo: repoFullName, name: release.name, prerelease: release.prerelease },
          },
        });
      }
      return { processed: true, action: "release-logged", details: "Release recorded" };
    }

    case "star.created": {
      const savedRepo = await findRepoByFullName(repoFullName);
      if (savedRepo) {
        await prisma.savedRepo.update({
          where: { id: savedRepo.id },
          data: { stars: { increment: 1 } },
        });
      }
      return { processed: true, action: "star-counted", details: "Star count updated" };
    }

    case "push": {
      if (payload.commits && Array.isArray(payload.commits) && payload.commits.length > 0) {
        await prisma.auditLog.create({
          data: {
            action: "push",
            resource: "commit",
            resourceId: (payload.ref as string) || "",
            metadata: { repo: repoFullName, commits: payload.commits.length, branch: payload.ref },
          },
        });
      }
      return { processed: true, action: "push-logged", details: `Push with ${payload.commits?.length || 0} commits` };
    }

    default:
      return { processed: true, action: "acknowledged", details: `Event ${event} acknowledged` };
  }
}

async function findRepoByFullName(fullName: string) {
  return prisma.savedRepo.findFirst({
    where: { fullName },
  });
}

// ─── Webhook Delivery Queue ───

interface QueuedDelivery {
  id: string;
  webhookId: string;
  event: string;
  payload: Record<string, unknown>;
  url: string;
  secret: string;
  attempts: number;
  maxAttempts: number;
  nextRetryAt: number;
}

const deliveryQueue: QueuedDelivery[] = [];
let processingQueue = false;

export function enqueueWebhookDelivery(delivery: Omit<QueuedDelivery, "attempts" | "nextRetryAt">): void {
  deliveryQueue.push({
    ...delivery,
    attempts: 0,
    maxAttempts: 5,
    nextRetryAt: Date.now(),
  });
  if (!processingQueue) processDeliveryQueue();
}

async function processDeliveryQueue(): Promise<void> {
  processingQueue = true;
  while (deliveryQueue.length > 0) {
    const delivery = deliveryQueue[0];
    if (Date.now() < delivery.nextRetryAt) {
      await new Promise((r) => setTimeout(r, 1000));
      continue;
    }

    try {
      const body = JSON.stringify(delivery.payload);
      const signature = crypto
        .createHmac("sha256", delivery.secret)
        .update(body)
        .digest("hex");

      const response = await fetch(delivery.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-GritGauge-Signature": `sha256=${signature}`,
          "X-GritGauge-Event": delivery.event,
          "User-Agent": "GritGauge-Webhook/2.0",
        },
        body,
      });

      if (response.ok) {
        deliveryQueue.shift(); // Success — remove from queue
        await prisma.webhook.update({
          where: { id: delivery.webhookId },
          data: { lastSentAt: new Date(), failCount: 0 },
        });
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch {
      delivery.attempts++;
      if (delivery.attempts >= delivery.maxAttempts) {
        deliveryQueue.shift(); // Give up
        await prisma.webhook.update({
          where: { id: delivery.webhookId },
          data: { failCount: { increment: 1 } },
        });
      } else {
        // Exponential backoff: 1min, 5min, 15min, 30min, 60min
        const delays = [60000, 300000, 900000, 1800000, 3600000];
        delivery.nextRetryAt = Date.now() + delays[delivery.attempts - 1];
      }
    }
  }
  processingQueue = false;
}

// ─── Webhook Event Fan-out ───

export async function fanoutWebhookEvent(
  userId: string,
  event: GitHubEvent,
  payload: Record<string, unknown>
): Promise<{ totalWebhooks: number; delivered: number; queued: number }> {
  const webhooks = await prisma.webhook.findMany({
    where: {
      userId,
      isActive: true,
      events: { has: mapGitHubEventToWebhookEvent(event) },
    },
  });

  let delivered = 0;
  let queued = 0;

  for (const webhook of webhooks) {
    enqueueWebhookDelivery({
      id: `del_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      webhookId: webhook.id,
      event: mapGitHubEventToWebhookEvent(event),
      payload,
      url: webhook.url,
      secret: webhook.secret,
    });
    queued++;
  }

  return { totalWebhooks: webhooks.length, delivered, queued };
}

function mapGitHubEventToWebhookEvent(event: GitHubEvent): string {
  if (event.startsWith("issues.")) return "triage.completed";
  if (event.startsWith("pull_request.")) return "review.completed";
  if (event === "release.published") return "health.alert";
  if (event === "check_run.completed") return "security.alert";
  return "health.alert";
}

// ─── GitHub Checks API Integration ───

export async function createCheckRun(
  owner: string,
  repo: string,
  name: string,
  headSha: string,
  status: "queued" | "in_progress" | "completed",
  conclusion?: "success" | "failure" | "neutral" | "cancelled" | "skipped" | "timed_out" | "action_required",
  output?: { title: string; summary: string; text?: string }
): Promise<{ id: number; url: string }> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error("GITHUB_TOKEN not configured");

  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/check-runs`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name,
      head_sha: headSha,
      status,
      conclusion: status === "completed" ? conclusion : undefined,
      output: output || { title: name, summary: "Check in progress..." },
    }),
  });

  if (!response.ok) {
    throw new Error(`GitHub Checks API error: ${response.status} ${await response.text()}`);
  }

  const data = await response.json() as { id: number; html_url: string };
  return { id: data.id, url: data.html_url };
}

export async function updateCheckRun(
  owner: string,
  repo: string,
  checkRunId: number,
  updates: {
    status?: "queued" | "in_progress" | "completed";
    conclusion?: "success" | "failure" | "neutral" | "cancelled" | "skipped" | "timed_out" | "action_required";
    output?: { title: string; summary: string; text?: string };
  }
): Promise<void> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error("GITHUB_TOKEN not configured");

  await fetch(`https://api.github.com/repos/${owner}/${repo}/check-runs/${checkRunId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(updates),
  });
}

// ─── GitHub App Installation Handler ───

export async function handleAppInstallation(
  installationId: number,
  action: "created" | "deleted" | "suspend" | "unsuspend",
  repositories: { full_name: string }[],
  sender: string
): Promise<void> {
  if (action === "created") {
    for (const repo of repositories) {
      const [owner, name] = repo.full_name.split("/");

      // Find or create repo entry
      const existing = await prisma.savedRepo.findFirst({
        where: { fullName: repo.full_name },
      });

      if (!existing) {
        // Create a system-linked repo entry
        await prisma.savedRepo.create({
          data: {
            userId: "system", // Will be linked to actual user
            owner,
            name,
            fullName: repo.full_name,
            isMonitored: true,
          },
        });
      }
    }

    await prisma.auditLog.create({
      data: {
        action: "app.installed",
        resource: "installation",
        resourceId: String(installationId),
        metadata: { action, repos: repositories.length, sender },
      },
    });
  }
}

// ─── Rate Limit Aware Request Queue ───

interface QueuedRequest {
  id: string;
  fn: () => Promise<unknown>;
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
  priority: number;
}

const requestQueue: QueuedRequest[] = [];
let remainingRateLimit = 5000;
let rateLimitResetAt = Date.now() + 3600000;
let processingRequests = false;

export function enqueueGitHubRequest<T>(
  fn: () => Promise<T>,
  priority: number = 0
): Promise<T> {
  return new Promise((resolve, reject) => {
    requestQueue.push({
      id: `req_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      fn: fn as () => Promise<unknown>,
      resolve: resolve as (value: unknown) => void,
      reject,
      priority,
    });
    requestQueue.sort((a, b) => b.priority - a.priority);
    if (!processingRequests) processRequestQueue();
  });
}

async function processRequestQueue(): Promise<void> {
  processingRequests = true;
  while (requestQueue.length > 0) {
    if (Date.now() >= rateLimitResetAt) {
      remainingRateLimit = 5000;
      rateLimitResetAt = Date.now() + 3600000;
    }

    if (remainingRateLimit <= 50) {
      const waitMs = rateLimitResetAt - Date.now() + 1000;
      await new Promise((r) => setTimeout(r, Math.max(0, waitMs)));
      continue;
    }

    const request = requestQueue.shift()!;
    try {
      remainingRateLimit--;
      const result = await request.fn();
      request.resolve(result);
    } catch (error) {
      request.reject(error);
    }

    // Small delay between requests to be respectful
    await new Promise((r) => setTimeout(r, 100));
  }
  processingRequests = false;
}
