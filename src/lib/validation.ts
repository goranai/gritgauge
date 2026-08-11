import { z } from "zod";

// ─── Environment Validation ───

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  NEXTAUTH_URL: z.string().url().optional(),
  NEXTAUTH_SECRET: z.string().min(32).optional(),
  GITHUB_ID: z.string().optional(),
  GITHUB_SECRET: z.string().optional(),
  GITHUB_TOKEN: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  REDIS_URL: z.string().url().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
});

export function validateEnv() {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error("❌ Invalid environment variables:");
    console.error(result.error.flatten().fieldErrors);
    // Don't throw in dev — allow partial config
    if (process.env.NODE_ENV === "production") {
      throw new Error("Invalid environment configuration");
    }
  }
  return result.data;
}

// ─── Input Validation Schemas ───

export const repoSchema = z.object({
  owner: z.string().min(1).max(100).regex(/^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/),
  name: z.string().min(1).max(100).regex(/^[a-zA-Z0-9_.-]+$/),
});

export const triageRequestSchema = z.object({
  title: z.string().min(1).max(500),
  issueBody: z.string().max(50000).nullable().optional(),
  existingLabels: z.array(z.string().max(50)).max(20).optional(),
  model: z.enum(["gpt-4o-mini", "gpt-4o", "gpt-4-turbo"]).optional(),
});

export const reviewRequestSchema = z.object({
  title: z.string().min(1).max(500),
  prBody: z.string().max(50000).nullable().optional(),
  filesChanged: z.number().int().min(0).max(10000).optional(),
  additions: z.number().int().min(0).max(1000000).optional(),
  deletions: z.number().int().min(0).max(1000000).optional(),
  model: z.enum(["gpt-4o-mini", "gpt-4o", "gpt-4-turbo"]).optional(),
});

export const securityScanSchema = z.object({
  repo: z.string().min(1),
  scanType: z.enum(["pr", "dependency", "code", "full"]),
  targetRef: z.string().optional(),
});

export const webhookSchema = z.object({
  url: z.string().url(),
  events: z.array(
    z.enum(["triage.completed", "review.completed", "health.alert", "security.alert"])
  ).min(1).max(10),
  secret: z.string().min(16).optional(),
});

export const notificationSchema = z.object({
  type: z.enum(["triage_complete", "review_ready", "health_alert", "security_alert"]),
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(2000),
  actionUrl: z.string().url().optional(),
});

export const reportSchema = z.object({
  repoId: z.string().optional(),
  type: z.enum(["health", "activity", "security", "custom"]),
  format: z.enum(["pdf", "csv", "json", "markdown"]),
  title: z.string().min(1).max(200),
});

// ─── API Response Types ───

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    tokensUsed?: number;
    cached?: boolean;
    processingTimeMs?: number;
  };
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

// ─── Rate Limiting ───

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(
  key: string,
  maxRequests: number = 100,
  windowMs: number = 60000
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1, resetAt: now + windowMs };
  }

  entry.count++;
  if (entry.count > maxRequests) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  return { allowed: true, remaining: maxRequests - entry.count, resetAt: entry.resetAt };
}

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore) {
    if (now > entry.resetAt) rateLimitStore.delete(key);
  }
}, 300000);

// ─── Security Utilities ───

export function sanitizeHtml(input: string): string {
  return input
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");
}

export function validateGitHubToken(token: string): boolean {
  return /^(ghp_|github_pat_)[a-zA-Z0-9]{36,}$/.test(token);
}

export function validateOpenAIKey(key: string): boolean {
  return /^sk-(proj-)?[a-zA-Z0-9]{32,}$/.test(key);
}

export function generateId(length: number = 16): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  for (let i = 0; i < length; i++) {
    result += chars[array[i] % chars.length];
  }
  return result;
}

// ─── Retry Utility ───

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: { maxRetries?: number; baseDelay?: number; maxDelay?: number } = {}
): Promise<T> {
  const { maxRetries = 3, baseDelay = 1000, maxDelay = 10000 } = options;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) throw error;

      const delay = Math.min(baseDelay * Math.pow(2, attempt) + Math.random() * 1000, maxDelay);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw new Error("Unreachable");
}
